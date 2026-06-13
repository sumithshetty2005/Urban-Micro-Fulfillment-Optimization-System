import os

# Centralized Paths configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Data directory resolves to urban-mfc/data/raw
DATA_RAW_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "data", "raw"))

TRANSACTIONS_PATH = os.path.join(DATA_RAW_DIR, "transactions.parquet")
DELIVERIES_PATH = os.path.join(DATA_RAW_DIR, "pending_deliveries.parquet")

# External APIs
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
