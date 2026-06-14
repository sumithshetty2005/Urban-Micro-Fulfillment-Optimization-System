import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.engines.pricing import optimize_pricing
from backend.engines.routing import solve_routing
from backend.main import app

class TestBackendEngines(unittest.TestCase):
    def setUp(self):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.transactions_path = os.path.abspath(os.path.join(self.base_dir, "..", "data", "raw", "transactions.parquet"))
        self.deliveries_path = os.path.abspath(os.path.join(self.base_dir, "..", "data", "raw", "pending_deliveries.parquet"))

    def test_pricing_engine(self):
        """Test pricing OLS regression and optimization loop."""
        print("\n--- Testing Pricing Engine ---")
        sku = "SKU_001"
        res = optimize_pricing(self.transactions_path, sku)

        self.assertEqual(res["sku_id"], sku)
        self.assertIn("elasticity", res)
        self.assertIn("r_squared", res)
        self.assertIn("coefs", res)
        self.assertIn("metrics", res)
        self.assertIn("curve", res)

        elasticity = res["elasticity"]
        print(f"SKU_001 Elasticity Coefficient (Beta_1): {elasticity}")
        self.assertTrue(elasticity < 0, f"Elasticity should be negative, got {elasticity}")

        metrics = res["metrics"]
        curr_p = metrics["current_price"]
        opt_p = metrics["optimal_price"]
        print(f"Current Price: {curr_p}, Optimal Price: {opt_p}")
        self.assertTrue(curr_p * 0.5 - 0.2 <= opt_p <= curr_p * 1.5 + 0.2)

        curve = res["curve"]
        self.assertTrue(len(curve) > 0)
        self.assertEqual(curve[0]["price"], np_round(curr_p * 0.5, 1))
        print(f"Pricing Engine verified successfully!")

    def test_routing_engine(self):
        """Test OR-Tools CVRP solver and Haversine matrix calculations."""
        print("\n--- Testing Routing Engine ---")
        res = solve_routing(self.deliveries_path)

        self.assertIn("routes", res)
        self.assertIn("metrics", res)

        metrics = res["metrics"]
        print(f"Total distance: {metrics['total_distance_km']} km")
        print(f"Total package weight: {metrics['total_weight_kg']} KG")
        self.assertTrue(metrics["num_drivers"] >= 4)

        routes = res["routes"]
        all_serviced_nodes = set()

        for driver, data in routes.items():
            stops = data["stops"]
            total_wt = data["total_weight_kg"]
            dist = data["total_distance_km"]
            print(f"Driver '{driver}' => Weight: {total_wt} KG / 15.0 KG max, Stops count: {len(stops)}, Distance: {dist} km")

            self.assertTrue(total_wt <= 15.0, f"{driver} weight {total_wt} exceeded 15.0 KG!")

            self.assertEqual(stops[0]["node_index"], 0)
            self.assertEqual(stops[-1]["node_index"], 0)

            for stop in stops[1:-1]:
                all_serviced_nodes.add(stop["node_index"])

        print(f"Total unique orders serviced in CVRP: {len(all_serviced_nodes)}/25")
        self.assertEqual(len(all_serviced_nodes), 25)
        print("Routing Engine verified successfully!")

class TestFastAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_api_skus(self):
        """Test GET /api/skus."""
        print("\n--- Testing GET /api/skus ---")
        response = self.client.get("/api/skus")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("skus", data)
        self.assertTrue(len(data["skus"]) > 0)
        print(f"SKUs endpoint returned: {data['skus']}")

    def test_api_pricing(self):
        """Test GET /api/pricing."""
        print("\n--- Testing GET /api/pricing ---")
        response = self.client.get("/api/pricing?sku_id=SKU_001")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["sku_id"], "SKU_001")
        self.assertIn("elasticity", data)
        self.assertIn("metrics", data)
        self.assertIn("curve", data)
        print("GET /api/pricing verified successfully!")

    def test_api_routing(self):
        """Test GET /api/routing."""
        print("\n--- Testing GET /api/routing ---")
        response = self.client.get("/api/routing")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("routes", data)
        self.assertIn("metrics", data)
        print("GET /api/routing verified successfully!")

def np_round(val, decimals):
    import numpy as np
    return float(np.round(val, decimals))

if __name__ == "__main__":
    unittest.main()