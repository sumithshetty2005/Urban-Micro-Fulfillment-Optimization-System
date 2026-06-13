# Urban Micro-Fulfillment Optimization System

This system optimizes pricing and logistics for urban micro-fulfillment centers. It combines historical sales econometric regression (OLS) to maximize revenue with spatial route routing (CVRP) to dispatch local vehicle fleets under capacity limits.

---

## Amazon-Style Operational Metrics Breakdown

```
================================================================================
MICRO-FULFILLMENT ENGINE REPORT - NAVI MUMBAI HUB
================================================================================
PRICING TUNING (OLS ECONOMETRICS)
--------------------------------------------------------------------------------
SKU Catalog Active               : 5 SKUs
Regression Formulation           : Demand ~ Price + Competitor_Price + Promotion
Elasticity Coefficient (Beta_1)  : -4.7289 (SKU_001, highly price elastic)
Average R-Squared (Goodness)     : 89.2%
Optimal Price (SKU_001 Target)   : $21.30 (vs $16.18 current)
Predicted Revenue Uplift         : +$366.52 (+39.12% increase)

LOGISTICS FLEET DISPATCH (CVRP SOLUTIONS)
--------------------------------------------------------------------------------
Orders Serviced (Stops)          : 25 deliveries
Active Delivery Fleet            : 7 drivers (Auto-scaled from 4 to guarantee feasibility)
Total Route transit Distance     : 66.33 km
Total Distributed Payload        : 89.59 KG (Average: 12.80 KG per driver)
Max Driver Capacity Limit        : 15.0 KG (Strict)
Route Capacity Utilization       : 85.3% average utilization
Total System Service Level       : 100.0% (0 missed nodes, 0 capacity violations)
================================================================================
```

---

## System Architecture

```
├── engines/
│   ├── __init__.py         # Exports engines module interface
│   ├── pricing.py          # Statsmodels OLS + Revenue Variant Sweep loop
│   └── routing.py          # OR-Tools CVRP solver + Haversine Matrix Calculator
├── main.py                 # FastAPI backend router with CORS support
├── verify_backend.py       # Automated unit test suite for Python engines & endpoints
├── capture_screenshots.py  # Playwright browser automation screenshot script
├── frontend/               # Clean, modular React application 
│   ├── src/
│   │   ├── components/     # PricingEngine, RoutingModule components
│   │   ├── App.jsx         # Sidebar nav + Global metrics dashboard
│   │   ├── index.css       # Tailwind directives + Glassmorphic theme classes
│   │   └── main.jsx        # Bootstrap ReactDOM entry
│   ├── package.json        # Frontend configuration and npm dependencies
│   ├── tailwind.config.js  # Tailwind CSS definitions
│   └── vite.config.js      # Vite dev server + proxy rules
└── README.md               # Operations manual & metrics (this file)
```

---

## Getting Started

### 1. Prerequisites
Ensure you have Python 3.10+ and Node.js v18+ installed on your system.

### 2. Backend Setup
Install the python requirements:
```bash
pip install pandas pyarrow statsmodels "ortools<9.11" fastapi uvicorn playwright
python -m playwright install chromium
```

Start the backend FastAPI server:
```bash
python main.py
```
*The backend API will run on `http://127.0.0.1:8000`.*

### 3. Frontend Setup
Navigate to the `frontend/` directory and install NPM packages:
```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```
*The React SaaS UI will be available at `http://localhost:5173`.*

---

## Verification & Local Tests

Run the backend engine regression/routing test suite:
```bash
python verify_backend.py
```

Run the Playwright browser validation script (captures dashboard rendering confirmations):
```bash
python capture_screenshots.py
```
Screenshots will be saved to your local artifacts folder as `pricing_tab.png` and `routing_tab.png`.
