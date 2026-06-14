import numpy as np
import pandas as pd
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the great-circle distance between two points on the Earth's surface
    using the Haversine formula (returned in kilometers).
    """
    R = 6371.0

    lat1_rad = np.radians(lat1)
    lng1_rad = np.radians(lng1)
    lat2_rad = np.radians(lat2)
    lng2_rad = np.radians(lng2)

    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad

    a = np.sin(dlat / 2)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlng / 2)**2
    c = 2 * np.arcsin(np.sqrt(a))

    return R * c

def solve_routing(
    parquet_path: str,
    fleet_size: int = 4,
    capacity_limit_kg: float = 15.0,
    num_orders: int = 25,
    fuel_price: float = 104.0,
    mileage: float = 35.0,
    max_delivery_time: int = 45,
    optimization_goal: str = "Lowest Total Cost",
    enable_priority: bool = False
):
    """
    Solves the Capacitated Vehicle Routing Problem (CVRP) dynamically.
    - Depot coordinates: Navi Mumbai location (Lat: 19.0330, Lng: 73.0297)
    - Capacity limit: customizable per driver (using Package_Weight_KG)
    """
    df_del = pd.read_parquet(parquet_path)

    num_orders = min(max(5, num_orders), len(df_del))
    df_del = df_del.head(num_orders)

    total_weight = df_del["Package_Weight_KG"].sum()
    min_fleet_needed = int(np.ceil(total_weight / capacity_limit_kg))

    if fleet_size < min_fleet_needed + 1:
        fleet_size = min_fleet_needed + 1

    depot_lat, depot_lng = 19.0330, 73.0297
    num_nodes = num_orders + 1

    locations = [(depot_lat, depot_lng)]
    for _, row in df_del.iterrows():
        locations.append((row["Customer_Lat"], row["Customer_Lng"]))

    distance_matrix = np.zeros((num_nodes, num_nodes), dtype=int)
    for i in range(num_nodes):
        for j in range(num_nodes):
            if i == j:
                distance_matrix[i][j] = 0
            else:
                dist_km = haversine_distance(
                    locations[i][0], locations[i][1],
                    locations[j][0], locations[j][1]
                )
                distance_matrix[i][j] = int(np.round(dist_km * 1000.0))

    demands = [0]
    for _, row in df_del.iterrows():
        demands.append(int(np.round(row["Package_Weight_KG"] * 100)))

    scaled_capacity = int(np.round(capacity_limit_kg * 100))
    vehicle_capacities = [scaled_capacity] * fleet_size

    manager = pywrapcp.RoutingIndexManager(num_nodes, fleet_size, 0)
    routing = pywrapcp.RoutingModel(manager)

    fuel_cost_per_km = fuel_price / mileage
    dist_penalty_per_km = 8.33

    if optimization_goal == "Lowest Fuel Cost":
        cost_per_meter_paise = (fuel_cost_per_km * 100) / 1000.0
        fixed_salary_paise = 0
    elif optimization_goal == "Fastest Delivery" or optimization_goal == "Balanced Workload":
        cost_per_meter_paise = ((fuel_cost_per_km + dist_penalty_per_km) * 100) / 1000.0
        fixed_salary_paise = 3000
    else:
        cost_per_meter_paise = ((fuel_cost_per_km + dist_penalty_per_km) * 100) / 1000.0
        fixed_salary_paise = 3000

    def cost_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        dist_meters = distance_matrix[from_node][to_node]
        return int(np.round(dist_meters * cost_per_meter_paise))

    cost_callback_index = routing.RegisterTransitCallback(cost_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(cost_callback_index)

    if fixed_salary_paise > 0:
        routing.SetFixedCostOfAllVehicles(fixed_salary_paise)

    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        dist_meters = distance_matrix[from_node][to_node]
        travel_time_mins = (dist_meters / 1000.0) * 1.5
        service_time_mins = 5.0 if from_node != 0 else 0.0
        return int(np.round((travel_time_mins + service_time_mins) * 10))

    time_callback_index = routing.RegisterTransitCallback(time_callback)

    routing.AddDimension(
        time_callback_index,
        0,
        100000,
        True,
        'Time'
    )
    time_dimension = routing.GetDimensionOrDie('Time')

    if optimization_goal == "Fastest Delivery":
        time_dimension.SetGlobalSpanCostCoefficient(100)

    max_time_limit_scaled = int(max_delivery_time * 10)
    for i in range(fleet_size):
        end_index = routing.End(i)
        time_dimension.SetCumulVarSoftUpperBound(end_index, max_time_limit_scaled, 500)

    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return demands[from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)

    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,
        vehicle_capacities,
        True,
        'Capacity'
    )

    if optimization_goal == "Balanced Workload":
        capacity_dimension = routing.GetDimensionOrDie('Capacity')
        capacity_dimension.SetGlobalSpanCostCoefficient(100)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = 3

    solution = routing.SolveWithParameters(search_parameters)

    if not solution:
        raise RuntimeError("OR-Tools was unable to find a viable routing solution.")

    routes = {}
    total_distance_meters = 0
    total_weight_scaled = 0
    total_driver_salary = 0.0
    total_fuel_cost = 0.0
    total_distance_penalty = 0.0
    total_late_penalty = 0.0

    for vehicle_id in range(fleet_size):
        index = routing.Start(vehicle_id)
        route_sequence = []
        route_load = 0
        route_distance = 0

        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            route_sequence.append(node)
            route_load += demands[node]

            previous_index = index
            previous_node = manager.IndexToNode(previous_index)
            index = solution.Value(routing.NextVar(index))
            curr_node = manager.IndexToNode(index)
            route_distance += distance_matrix[previous_node][curr_node]

        route_sequence.append(manager.IndexToNode(index))

        dist_km = route_distance / 1000.0
        is_active = len(route_sequence) > 2
        driver_salary = 30.00 if is_active else 0.00
        fuel_cost = dist_km * fuel_cost_per_km
        distance_penalty = dist_km * dist_penalty_per_km

        travel_time_mins = dist_km * 1.5
        num_stops = max(0, len(route_sequence) - 2)
        total_time_mins = travel_time_mins + (num_stops * 5.0)
        late_delivery_penalty = 0.0
        if total_time_mins > max_delivery_time:
            overtime_mins = total_time_mins - max_delivery_time
            late_delivery_penalty = overtime_mins * 5.0

        stops = []
        for stop_idx, node_idx in enumerate(route_sequence):
            if node_idx == 0:
                stops.append({
                    "stop_number": stop_idx,
                    "node_index": 0,
                    "order_id": "DEPOT",
                    "lat": depot_lat,
                    "lng": depot_lng,
                    "weight_kg": 0.0,
                    "is_priority": False
                })
            else:
                row = df_del.iloc[node_idx - 1]
                is_prio = bool(enable_priority and (node_idx % 5 == 0))
                stops.append({
                    "stop_number": stop_idx,
                    "node_index": node_idx,
                    "order_id": row["Order_ID"],
                    "lat": float(row["Customer_Lat"]),
                    "lng": float(row["Customer_Lng"]),
                    "weight_kg": float(row["Package_Weight_KG"]),
                    "is_priority": is_prio
                })

        if late_delivery_penalty > 0 and any(s["is_priority"] for s in stops):
            late_delivery_penalty *= 2.0

        route_cost = driver_salary + fuel_cost + distance_penalty + late_delivery_penalty

        routes[f"driver_{vehicle_id + 1}"] = {
            "stops": stops,
            "total_distance_km": np.round(dist_km, 2),
            "total_weight_kg": np.round(route_load / 100.0, 2),
            "max_capacity_kg": capacity_limit_kg,
            "financials": {
                "driver_salary": np.round(driver_salary, 2),
                "fuel_cost": np.round(fuel_cost, 2),
                "distance_penalty": np.round(distance_penalty, 2),
                "late_delivery_penalty": np.round(late_delivery_penalty, 2),
                "route_cost": np.round(route_cost, 2)
            }
        }
        total_distance_meters += route_distance
        total_weight_scaled += route_load
        total_driver_salary += driver_salary
        total_fuel_cost += fuel_cost
        total_distance_penalty += distance_penalty
        total_late_penalty += late_delivery_penalty

    metrics = {
        "total_distance_km": np.round(total_distance_meters / 1000.0, 2),
        "total_weight_kg": np.round(total_weight_scaled / 100.0, 2),
        "num_drivers": fleet_size,
        "num_orders": num_orders,
        "financials": {
            "total_driver_cost": np.round(total_driver_salary, 2),
            "total_fuel_cost": np.round(total_fuel_cost, 2),
            "total_distance_penalty": np.round(total_distance_penalty, 2),
            "total_late_penalty": np.round(total_late_penalty, 2),
            "total_operational_cost": np.round(total_driver_salary + total_fuel_cost + total_distance_penalty + total_late_penalty, 2)
        },
        "depot": {
            "lat": depot_lat,
            "lng": depot_lng,
            "name": "Navi Mumbai MFC"
        }
    }

    return {
        "routes": routes,
        "metrics": metrics
    }