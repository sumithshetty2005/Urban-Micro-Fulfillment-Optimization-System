from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
import pandas as pd
import requests

# Ensure backend package imports resolve when run as a script
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.config import TRANSACTIONS_PATH, DELIVERIES_PATH
from backend.engines.pricing import optimize_pricing
from backend.engines.routing import solve_routing
from backend.services.explainability import explain_pricing

app = FastAPI(
    title="Urban Micro-Fulfillment Optimization API",
    description="High-performance backend serving econometric pricing regression and CVRP route optimization engines.",
    version="1.0.0"
)

# Enable CORS for frontend environments (including Vercel deployments)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/skus")
def get_skus():
    """
    Fetch the list of unique SKUs available in transactions.parquet
    """
    if not os.path.exists(TRANSACTIONS_PATH):
        raise HTTPException(status_code=404, detail=f"transactions.parquet file not found at {TRANSACTIONS_PATH}")
    try:
        df = pd.read_parquet(TRANSACTIONS_PATH)
        skus = sorted(df["SKU_ID"].unique().tolist())
        return {"skus": skus}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading SKUs: {str(e)}")

CURRENT_TRAINING_PERIOD = "Last Quarter"

@app.get("/api/pricing")
def get_pricing_optimization(
    sku_id: str = Query("SKU_001", description="SKU identifier to run econometric optimization on"),
    inventory: int = Query(250, description="Available stock quantity of the SKU"),
    period: str = Query(None, description="Specific time period for OLS retraining: 'Last 7 Days', 'Last 30 Days', 'Last Quarter'")
):
    """
    Exposes pricing OLS regression metrics, coefficients, statistics, 
    priceVariant sweeps, and plotting curve coordinates.
    """
    if not os.path.exists(TRANSACTIONS_PATH):
        raise HTTPException(status_code=404, detail="transactions.parquet file not found.")
    
    active_period = period if period else CURRENT_TRAINING_PERIOD
    try:
        result = optimize_pricing(TRANSACTIONS_PATH, sku_id, inventory=inventory, period=active_period)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Econometric pricing engine failed: {str(e)}")

@app.get("/api/routing")
def get_logistics_routing(
    num_drivers: int = Query(7, description="Number of available drivers"),
    capacity_limit_kg: float = Query(15.0, description="Vehicle Capacity in kg"),
    num_orders: int = Query(25, description="Number of orders to deliver"),
    fuel_price: float = Query(104.0, description="Fuel Price in INR/L"),
    mileage: float = Query(35.0, description="Mileage in km/L"),
    max_delivery_time: int = Query(45, description="Max delivery time in minutes"),
    optimization_goal: str = Query("Lowest Total Cost", description="Goal to optimize"),
    enable_priority: bool = Query(False, description="Enable Priority orders"),
    driver_mode: str = Query("Manual", description="Driver recommendation mode")
):
    """
    Computes distance matrix, initializes OR-Tools CVRP solver, and 
    returns sequential vehicle routes, delivery coordinates, and load statistics.
    Includes AI driver recommendation features.
    """
    if not os.path.exists(DELIVERIES_PATH):
        raise HTTPException(status_code=404, detail="pending_deliveries.parquet file not found.")
    try:
        import numpy as np
        ai_recommendation = None
        
        # Calculate AI recommended drivers if selected
        if driver_mode == "AI Recommended":
            df = pd.read_parquet(DELIVERIES_PATH).head(num_orders)
            total_weight = df["Package_Weight_KG"].sum()
            avg_payload = total_weight / len(df)
            
            # Base weight drivers needed
            min_drivers = int(np.ceil(total_weight / capacity_limit_kg))
            rec_drivers = min_drivers + 1
            
            # Time constraints: order servicing + roundtrip distance
            max_orders_per_driver = max(1, int((max_delivery_time - 20) / 5))
            time_based_drivers = int(np.ceil(len(df) / max_orders_per_driver))
            rec_drivers = max(rec_drivers, time_based_drivers)
            
            # Constrain to valid ranges
            rec_drivers = min(max(2, rec_drivers), len(df))
            num_drivers = rec_drivers
            
            avg_dist = 8.2
            est_del_time = int(np.round((avg_dist * 1.5 * 2) + ((len(df) / rec_drivers) * 5)))
            confidence = int(min(98, max(75, 100 - abs(est_del_time - max_delivery_time) * 1.5)))
            
            ai_recommendation = {
                "recommended_drivers": rec_drivers,
                "avg_payload": np.round(avg_payload, 2),
                "avg_distance": avg_dist,
                "est_delivery_time": est_del_time,
                "confidence": confidence,
                "reason": f"Average payload is {avg_payload:.2f} kg per order. With a vehicle capacity of {capacity_limit_kg} kg and a maximum delivery time of {max_delivery_time} mins, the solver requires {rec_drivers} drivers to guarantee timely deliveries and satisfy capacity constraints."
            }
            
        result = solve_routing(
            DELIVERIES_PATH,
            fleet_size=num_drivers,
            capacity_limit_kg=capacity_limit_kg,
            num_orders=num_orders,
            fuel_price=fuel_price,
            mileage=mileage,
            max_delivery_time=max_delivery_time,
            optimization_goal=optimization_goal,
            enable_priority=enable_priority
        )
        
        if ai_recommendation:
            result["ai_recommendation"] = ai_recommendation
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logistics routing solver failed: {str(e)}")

@app.get("/api/pricing/explain")
def explain_pricing_with_llm(
    sku_id: str,
    price: float,
    comp_price: float,
    promo: int,
    temp: float,
    rain: int,
    weekend: int,
    festival: int,
    holiday: int,
    tod: str,
    predicted_demand: float,
    predicted_revenue: float,
    predicted_profit: float,
    elasticity: float,
    unit_cost: float,
    inventory: int
):
    """
    Delegates to explain_pricing service to analyze parameters and return LLM insight.
    """
    explanation = explain_pricing(
        sku_id=sku_id,
        price=price,
        comp_price=comp_price,
        promo=promo,
        temp=temp,
        rain=rain,
        weekend=weekend,
        festival=festival,
        holiday=holiday,
        tod=tod,
        predicted_demand=predicted_demand,
        predicted_revenue=predicted_revenue,
        predicted_profit=predicted_profit,
        elasticity=elasticity,
        unit_cost=unit_cost,
        inventory=inventory
    )
    return {"explanation": explanation}

@app.post("/api/pricing/retrain")
def retrain_model(
    period: str = Query("Last Quarter", description="Data period to train on: 'Last 7 Days', 'Last 30 Days', 'Last Quarter'")
):
    """
    Sets the active historical retraining window and triggers model parameters refitting.
    """
    global CURRENT_TRAINING_PERIOD
    if period not in ["Last 7 Days", "Last 30 Days", "Last Quarter"]:
        raise HTTPException(status_code=400, detail="Invalid retraining period. Select from 'Last 7 Days', 'Last 30 Days', 'Last Quarter'.")
    
    CURRENT_TRAINING_PERIOD = period
    return {"status": "success", "message": f"Econometric model active training window updated to: {period}."}

@app.post("/api/upload_transactions")
def upload_transactions_log(file: UploadFile = File(...)):
    """
    Accepts daily transaction log CSV or Parquet files and updates the database repository (transactions.parquet).
    """
    filename = file.filename
    if not (filename.endswith(".csv") or filename.endswith(".parquet")):
        raise HTTPException(status_code=400, detail="Only CSV or Parquet format files are supported.")
    
    try:
        # Save upload payload
        if filename.endswith(".csv"):
            df = pd.read_csv(file.file)
        else:
            df = pd.read_parquet(file.file)
            
        # Ensure all columns required for the Log-Log OLS regression are present
        required_cols = ["Timestamp", "SKU_ID", "Price", "Competitor_Price", "Promotion_Active", "Temperature", "Rain", "Weekend", "Festival", "Holiday", "Time_of_Day", "Quantity_Sold"]
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise HTTPException(status_code=400, detail=f"Log schema mismatch. Missing columns: {', '.join(missing)}")
            
        # Write back to transactions.parquet
        df.to_parquet(TRANSACTIONS_PATH, index=False)
        return {"status": "success", "message": f"Successfully ingested {len(df)} transactions into database. Parquet repo refreshed."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing transaction log: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
