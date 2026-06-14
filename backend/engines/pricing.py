import pandas as pd
import numpy as np
import statsmodels.formula.api as smf

SKU_COSTS = {
    "SKU_001": 10.00,
    "SKU_002": 8.00,
    "SKU_003": 5.00,
    "SKU_004": 25.00,
    "SKU_005": 9.00
}

def filter_by_period(df: pd.DataFrame, period: str) -> pd.DataFrame:
    df = df.copy()
    df["Timestamp_dt"] = pd.to_datetime(df["Timestamp"])
    max_date = df["Timestamp_dt"].max()

    if period == "Last 7 Days":
        cutoff = max_date - pd.Timedelta(days=7)
        df = df[df["Timestamp_dt"] >= cutoff]
    elif period == "Last 30 Days":
        cutoff = max_date - pd.Timedelta(days=30)
        df = df[df["Timestamp_dt"] >= cutoff]

    df = df.drop(columns=["Timestamp_dt"])
    return df

def optimize_pricing(parquet_path: str, sku_id: str, inventory: int = 250, holding_cost_rate: float = 0.2, period: str = "Last Quarter"):
    """
    Run Log-Log OLS Regression for a given SKU:
      ln(Demand + 1) = Beta_0 + Beta_1*ln(Price) + Beta_2*ln(Competitor_Price) + ...

    Sweep price variants (50% to 150% of current price at $0.10 steps) to solve for Maximum Profit:
      Profit = (Price - Cost) * min(Inventory, Predicted_Demand) - Holding_Cost * max(0, Inventory - Predicted_Demand)
    """
    df = pd.read_parquet(parquet_path)

    df_sku = df[df["SKU_ID"] == sku_id].copy()

    df_sku = filter_by_period(df_sku, period)

    if len(df_sku) < 5:
        raise ValueError(f"Insufficient transaction data in selected period {period} (found {len(df_sku)} records) for SKU: {sku_id}")

    cost = SKU_COSTS.get(sku_id, 6.00)

    model = smf.ols(
        "np.log1p(Quantity_Sold) ~ np.log(Price) + np.log(Competitor_Price) + Promotion_Active + Temperature + Rain + Weekend + Festival + Holiday + C(Time_of_Day)",
        data=df_sku
    )
    results = model.fit()

    beta_0 = float(results.params["Intercept"])
    beta_1 = float(results.params["np.log(Price)"])
    beta_2 = float(results.params["np.log(Competitor_Price)"])
    beta_3 = float(results.params["Promotion_Active"])
    beta_temp = float(results.params.get("Temperature", 0.0))
    beta_rain = float(results.params.get("Rain", 0.0))
    beta_weekend = float(results.params.get("Weekend", 0.0))
    beta_festival = float(results.params.get("Festival", 0.0))
    beta_holiday = float(results.params.get("Holiday", 0.0))
    beta_tod_afternoon = float(results.params.get("C(Time_of_Day)[T.Afternoon]", 0.0))
    beta_tod_evening = float(results.params.get("C(Time_of_Day)[T.Evening]", 0.0))
    beta_tod_night = float(results.params.get("C(Time_of_Day)[T.Night]", 0.0))

    r_squared = float(results.rsquared)
    p_values = results.pvalues.to_dict()
    t_stats = results.tvalues.to_dict()
    std_errors = results.bse.to_dict()

    clean_p_values = {}
    clean_t_stats = {}
    clean_std_errors = {}
    for k in p_values.keys():
        clean_key = k
        if "np.log(Price)" in k:
            clean_key = "Price"
        elif "np.log(Competitor_Price)" in k:
            clean_key = "Competitor_Price"
        clean_p_values[clean_key] = np.round(p_values[k], 4)
        clean_t_stats[clean_key] = np.round(t_stats[k], 4)
        clean_std_errors[clean_key] = np.round(std_errors[k], 4)

    df_sku_sorted = df_sku.sort_values(by="Timestamp")
    latest_record = df_sku_sorted.iloc[-1]
    current_price = float(latest_record["Price"])

    mean_comp_price = float(df_sku["Competitor_Price"].mean())
    mean_promo = float(df_sku["Promotion_Active"].mean())
    mean_temp = float(df_sku["Temperature"].mean())
    mean_rain = float(df_sku["Rain"].mean())
    mean_weekend = float(df_sku["Weekend"].mean())
    mean_festival = float(df_sku["Festival"].mean())
    mean_holiday = float(df_sku["Holiday"].mean())

    prop_afternoon = float((df_sku["Time_of_Day"] == "Afternoon").mean())
    prop_evening = float((df_sku["Time_of_Day"] == "Evening").mean())
    prop_night = float((df_sku["Time_of_Day"] == "Night").mean())

    baseline_demand_log = (
        beta_0 +
        (beta_2 * np.log(mean_comp_price)) +
        (beta_3 * mean_promo) +
        (beta_temp * mean_temp) +
        (beta_rain * mean_rain) +
        (beta_weekend * mean_weekend) +
        (beta_festival * mean_festival) +
        (beta_holiday * mean_holiday) +
        (beta_tod_afternoon * prop_afternoon) +
        (beta_tod_evening * prop_evening) +
        (beta_tod_night * prop_night)
    )

    start_price = np.round(current_price * 0.5, 1)
    end_price = np.round(current_price * 1.5, 1)

    num_steps = int(np.round((end_price - start_price) / 0.1)) + 1
    prices_sweep = [np.round(start_price + i * 0.1, 2) for i in range(num_steps)]

    optimal_price = current_price
    max_profit = -999999.0
    optimal_demand = 0.0
    optimal_revenue = 0.0

    curve_points = []

    for p in prices_sweep:
        pred_demand = np.exp(baseline_demand_log + beta_1 * np.log(p)) - 1.0
        pred_demand = max(0.0, float(pred_demand))

        actual_sales = min(float(inventory), pred_demand)
        unsold_stock = max(0.0, float(inventory) - pred_demand)
        holding_penalty = unsold_stock * (cost * holding_cost_rate)

        revenue = p * actual_sales
        profit = ((p - cost) * actual_sales) - holding_penalty

        curve_points.append({
            "price": p,
            "predicted_demand": np.round(pred_demand, 2),
            "predicted_revenue": np.round(revenue, 2),
            "predicted_profit": np.round(profit, 2)
        })

        if profit > max_profit:
            max_profit = profit
            optimal_price = p
            optimal_demand = pred_demand
            optimal_revenue = revenue

    pred_current_demand = np.exp(baseline_demand_log + beta_1 * np.log(current_price)) - 1.0
    pred_current_demand = max(0.0, float(pred_current_demand))

    current_actual_sales = min(float(inventory), pred_current_demand)
    current_unsold_stock = max(0.0, float(inventory) - pred_current_demand)
    current_holding_penalty = current_unsold_stock * (cost * holding_cost_rate)

    current_predicted_revenue = current_price * current_actual_sales
    current_predicted_profit = ((current_price - cost) * current_actual_sales) - current_holding_penalty

    profit_uplift = max_profit - current_predicted_profit
    profit_uplift_pct = (profit_uplift / current_predicted_profit * 100.0) if current_predicted_profit > 0 else 0.0

    return {
        "sku_id": sku_id,
        "elasticity": np.round(beta_1, 4),
        "r_squared": np.round(r_squared, 4),
        "unit_cost": np.round(cost, 2),
        "coefs": {
            "beta_0": np.round(beta_0, 4),
            "beta_1": np.round(beta_1, 4),
            "beta_2": np.round(beta_2, 4),
            "beta_3": np.round(beta_3, 4),
            "beta_temp": np.round(beta_temp, 4),
            "beta_rain": np.round(beta_rain, 4),
            "beta_weekend": np.round(beta_weekend, 4),
            "beta_festival": np.round(beta_festival, 4),
            "beta_holiday": np.round(beta_holiday, 4),
            "beta_tod_afternoon": np.round(beta_tod_afternoon, 4),
            "beta_tod_evening": np.round(beta_tod_evening, 4),
            "beta_tod_night": np.round(beta_tod_night, 4)
        },
        "stats": {
            "p_values": clean_p_values,
            "t_stats": clean_t_stats,
            "std_errors": clean_std_errors
        },
        "baselines": {
            "mean_comp_price": np.round(mean_comp_price, 2),
            "mean_promo": np.round(mean_promo, 2),
            "mean_temp": np.round(mean_temp, 2),
            "mean_rain": np.round(mean_rain, 2),
            "mean_weekend": np.round(mean_weekend, 2),
            "mean_festival": np.round(mean_festival, 2),
            "mean_holiday": np.round(mean_holiday, 2),
            "prop_afternoon": np.round(prop_afternoon, 2),
            "prop_evening": np.round(prop_evening, 2),
            "prop_night": np.round(prop_night, 2)
        },
        "metrics": {
            "current_price": np.round(current_price, 2),
            "optimal_price": np.round(optimal_price, 2),
            "current_predicted_demand": np.round(pred_current_demand, 2),
            "optimal_predicted_demand": np.round(optimal_demand, 2),
            "current_predicted_revenue": np.round(current_predicted_revenue, 2),
            "optimal_predicted_revenue": np.round(optimal_revenue, 2),
            "current_predicted_profit": np.round(current_predicted_profit, 2),
            "optimal_predicted_profit": np.round(max_profit, 2),
            "profit_uplift": np.round(profit_uplift, 2),
            "profit_uplift_pct": np.round(profit_uplift_pct, 2)
        },
        "curve": curve_points
    }