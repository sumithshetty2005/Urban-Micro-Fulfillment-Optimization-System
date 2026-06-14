import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_RAW_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "data", "raw"))

TRANSACTIONS_PATH = os.path.join(DATA_RAW_DIR, "transactions.parquet")
DELIVERIES_PATH = os.path.join(DATA_RAW_DIR, "pending_deliveries.parquet")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")