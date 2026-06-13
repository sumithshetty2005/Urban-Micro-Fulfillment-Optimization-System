import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Set random seed for reproducibility
np.random.seed(42)

# ---------------------------------------------------------
# 1. TRANSACTIONS.PARQUET (Advanced Historical SKU Elasticity Data)
# ---------------------------------------------------------
skus = [f"SKU_{str(i).zfill(3)}" for i in range(1, 6)]
start_date = datetime(2026, 1, 1)
total_days = 90
periods = ["Morning", "Afternoon", "Evening", "Night"]

# Base dynamics and coefficients per SKU:
# [Base_Demand (b0), Price_Impact (b1), Comp_Price_Impact (b2), Promo_Impact (b3),
#  Temp_Impact, Rain_Impact, Weekend_Impact, Festival_Impact, Holiday_Impact]
sku_dynamics = {
    "SKU_001": [80,  -4.5, 3.0, 12,  2.5, -8,  15, 30, 10],  # Cold Beverage (temp-sensitive, dislikes rain)
    "SKU_002": [100, -6.0, 4.0, 18, -1.5,  15,  8,  10,  5],  # Hot Coffee (likes rain, dislikes heat)
    "SKU_003": [10,  -1.2, 0.8, 5,   0.0,  50,  2,   5,   2],  # Rain Poncho (highly rain-sensitive)
    "SKU_004": [120, -10.0,7.0, 30,  4.0, -15, 25, 50, 15],  # Premium Ice Cream (highly temp and weekend-sensitive)
    "SKU_005": [60,  -2.5, 1.5, 8,  -0.5,  20, 10,  5,   8]   # Instant Noodles (comfort food in rain/evening)
}

# Time of day baseline demand shifts per SKU: Morning, Afternoon, Evening, Night
time_of_day_shifts = {
    "SKU_001": [5,  15, 25, -15],
    "SKU_002": [30,  5, 20, -20],
    "SKU_003": [5,  10, 10,  -5],
    "SKU_004": [-10, 20, 40,  10],
    "SKU_005": [5,  10, 20,  15]
}

# Generate festival and holiday calendars for the 90-day range
festival_days = set(np.random.choice(range(total_days), size=5, replace=False))
holiday_days = set(np.random.choice(range(total_days), size=4, replace=False))

records = []

for day in range(total_days):
    current_date = start_date + timedelta(days=day)
    is_weekend = 1 if current_date.weekday() in (5, 6) else 0
    is_festival = 1 if day in festival_days else 0
    is_holiday = 1 if day in holiday_days else 0
    
    # Base daily temperature (Navi Mumbai seasonal trend: rises toward summer March/April)
    # January is cooler (~26°C), March is hotter (~34°C)
    base_daily_temp = 26.0 + (day / total_days) * 8.0 + np.random.normal(0, 1.5)
    
    # Rain probability (higher in March than January, but mock monsoonal chance)
    is_rainy_day = 1 if np.random.rand() < (0.1 if current_date.month < 3 else 0.25) else 0
    
    for period_idx, period in enumerate(periods):
        # Time-of-day temperature deviations
        if period == "Morning":
            temp = base_daily_temp - 2.0
            rain = 1 if (is_rainy_day and np.random.rand() > 0.4) else 0
            time_str = "08:00:00"
        elif period == "Afternoon":
            temp = base_daily_temp + 4.0
            rain = 1 if (is_rainy_day and np.random.rand() > 0.3) else 0
            time_str = "13:00:00"
        elif period == "Evening":
            temp = base_daily_temp
            rain = 1 if (is_rainy_day and np.random.rand() > 0.2) else 0
            time_str = "18:00:00"
        else: # Night
            temp = base_daily_temp - 4.0
            rain = 1 if (is_rainy_day and np.random.rand() > 0.5) else 0
            time_str = "23:00:00"
            
        temp = np.round(temp, 1)
        timestamp = f"{current_date.strftime('%Y-%m-%d')} {time_str}"
        
        for sku in skus:
            # Pricing setup: base prices around $15, SKU_004 is premium ($45)
            base_price = 15.0 if sku != "SKU_004" else 45.0
            price = np.round(np.random.normal(base_price, base_price * 0.15), 2)
            price = max(2.0, price)  # No negative pricing
            
            comp_price = np.round(np.random.normal(price, price * 0.08), 2)
            promo = 1 if np.random.rand() > 0.8 else 0
            
            # Fetch underlying parameters
            b0, b1, b2, b3, t_coef, r_coef, w_coef, f_coef, h_coef = sku_dynamics[sku]
            tod_shift = time_of_day_shifts[sku][period_idx]
            
            # Compute expected demand using regression variables
            expected_qty = (
                b0 + tod_shift + 
                (b1 * price) + 
                (b2 * comp_price) + 
                (b3 * promo) + 
                (t_coef * (temp - 25.0)) + 
                (r_coef * rain) + 
                (w_coef * is_weekend) + 
                (f_coef * is_festival) + 
                (h_coef * is_holiday)
            )
            
            quantity = int(max(0, np.round(expected_qty + np.random.normal(0, 4))))
            
            records.append({
                "Timestamp": timestamp,
                "SKU_ID": sku,
                "Price": price,
                "Competitor_Price": comp_price,
                "Promotion_Active": promo,
                "Temperature": temp,
                "Rain": rain,
                "Weekend": is_weekend,
                "Festival": is_festival,
                "Holiday": is_holiday,
                "Time_of_Day": period,
                "Quantity_Sold": quantity
            })

import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_TRANSACTIONS = os.path.abspath(os.path.join(BASE_DIR, "..", "data", "raw", "transactions.parquet"))
OUTPUT_DELIVERIES = os.path.abspath(os.path.join(BASE_DIR, "..", "data", "raw", "pending_deliveries.parquet"))

df_transactions = pd.DataFrame(records)
df_transactions.to_parquet(OUTPUT_TRANSACTIONS, index=False)
print(f"* Successfully created '{OUTPUT_TRANSACTIONS}' with {len(df_transactions)} records.")

# ---------------------------------------------------------
# 2. PENDING_DELIVERIES.PARQUET (Active Order Coordinates - Unchanged)
# ---------------------------------------------------------
depot_lat, depot_lng = 19.0330, 73.0297 
num_orders = 100
order_records = []

for i in range(1, num_orders + 1):
    lat_offset = np.random.uniform(-0.04, 0.04)
    lng_offset = np.random.uniform(-0.04, 0.04)
    
    order_records.append({
        "Order_ID": f"ORD_{str(i).zfill(4)}",
        "Customer_Lat": depot_lat + lat_offset,
        "Customer_Lng": depot_lng + lng_offset,
        "Package_Weight_KG": np.round(np.random.uniform(0.5, 6.0), 2)
    })

df_deliveries = pd.DataFrame(order_records)
df_deliveries.to_parquet(OUTPUT_DELIVERIES, index=False)
print(f"* Successfully created '{OUTPUT_DELIVERIES}' with {len(df_deliveries)} pending orders.")