import requests
from backend.config import GROQ_API_KEY

def explain_pricing(
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
) -> str:
    """
    Calls Groq Llama 3 to explain current What-If simulation parameters,
    inventory levels, economic conditions, and predictions.
    """
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    prompt = (
        f"You are a Senior Pricing Strategy Consultant advising a retail operations manager. "
        f"Analyze these simulation details for SKU: {sku_id}:\n"
        f"- Unit Price: ₹{price:.2f}\n"
        f"- Competitor Price: ₹{comp_price:.2f}\n"
        f"- Unit Margin Cost: ₹{unit_cost:.2f}\n"
        f"- Available Stock Inventory: {inventory} units\n"
        f"- Promotion: {'Active' if promo == 1 else 'Inactive'}\n"
        f"- Local Temp: {temp:.1f}°C, Weather: {'Raining' if rain == 1 else 'Clear'}\n"
        f"- Context: {'Weekend' if weekend == 1 else 'Weekday'}, "
        f"{'Festival Day' if festival == 1 else 'No Festival'}, "
        f"{'Holiday' if holiday == 1 else 'No Holiday'}, Time of Day: {tod}\n\n"
        f"Econometric forecast outputs:\n"
        f"- Predicted Demand: {predicted_demand:.1f} units\n"
        f"- Gross Revenue: ₹{predicted_revenue:.2f}\n"
        f"- Expected Net Profit (reflecting stock caps & 20% unit holding penalties for unsold stock): ₹{predicted_profit:.2f}\n"
        f"- SKU Price Elasticity: {elasticity:.4f}\n\n"
        f"Provide a concise, professional analysis (under 130 words) structured in 2 short bullet points:\n"
        f"1. **Causal Drivers**: Explain why this demand/profit outcome occurred, explicitly commenting on how the inventory level relative to predicted demand affected the profit (e.g. stockout lost revenue, or overstock holding penalty).\n"
        f"2. **Operational recommendation**: Actionable advice on price adjustments (raise price for stockouts, lower for overstocks) or promotional triggers."
    )

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are a professional retail and pricing analytics advisor. Keep answers concise, formal, and analytical."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 250
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10.0)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Failed to retrieve AI insights from Groq: {str(e)}"