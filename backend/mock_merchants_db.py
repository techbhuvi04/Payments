"""In-memory merchant directory + merchant-scoped transactions for the Merchant workspace.

Separate from mock_txn_db.py (which models a Paytm *user's* payment history). These are
transactions from the *merchant's* side of the same rails: what a merchant should have
collected today, and whether it actually settled.
"""
from datetime import datetime, timedelta

NOW = datetime(2026, 9, 14, 12, 0, 0)

MERCHANTS = {
    "MERCH_1": {
        "merchant_id": "MERCH_1",
        "name": "Sharma Electronics",
        "owner_name": "Rohit Sharma",
        "category": "Electronics",
    },
    "MERCH_2": {
        "merchant_id": "MERCH_2",
        "name": "Verma Mobile Store",
        "owner_name": "Anita Verma",
        "category": "Mobile & Accessories",
    },
    "MERCH_3": {
        "merchant_id": "MERCH_3",
        "name": "Kapoor Appliances",
        "owner_name": "Deepak Kapoor",
        "category": "Home Appliances",
    },
}

# Merchant-side collection records: what the merchant's POS/checkout logged as collected,
# vs what the bank actually settled to the merchant's account.
MERCHANT_TRANSACTIONS = {
    # --- MERCH_1: clean settlement confirmation scenario ---
    "MTXN_101": {
        "mtxn_id": "MTXN_101",
        "merchant_id": "MERCH_1",
        "payer_name": "Customer ending 4821",
        "amount": 2400.0,
        "timestamp": NOW - timedelta(hours=5),
        "collection_status": "COLLECTED",
        "bank_ref": "MBANKREF_101",
        "settlement_status": "SETTLED",
        "refund_id": None,
    },
    "MTXN_102": {
        "mtxn_id": "MTXN_102",
        "merchant_id": "MERCH_1",
        "payer_name": "Customer ending 7790",
        "amount": 1150.0,
        "timestamp": NOW - timedelta(hours=2),
        "collection_status": "COLLECTED",
        "bank_ref": "MBANKREF_102",
        "settlement_status": "SETTLED",
        "refund_id": None,
    },

    # --- MERCH_2: safe stale-status correction - internal still PENDING, bank already settled ---
    "MTXN_201": {
        "mtxn_id": "MTXN_201",
        "merchant_id": "MERCH_2",
        "payer_name": "Customer ending 3305",
        "amount": 5600.0,
        "timestamp": NOW - timedelta(days=1),
        "collection_status": "COLLECTED",
        "bank_ref": "MBANKREF_201",
        "settlement_status": "PENDING",
        "refund_id": None,
    },
    # --- MERCH_2: safe low-value mismatch - collected but bank declined, small amount ---
    "MTXN_202": {
        "mtxn_id": "MTXN_202",
        "merchant_id": "MERCH_2",
        "payer_name": "Customer ending 9012",
        "amount": 480.0,
        "timestamp": NOW - timedelta(hours=8),
        "collection_status": "COLLECTED",
        "bank_ref": "MBANKREF_202",
        "settlement_status": None,
        "refund_id": None,
    },

    # --- MERCH_3: high-value / suspicious mismatch -> escalate ---
    "MTXN_301": {
        "mtxn_id": "MTXN_301",
        "merchant_id": "MERCH_3",
        "payer_name": "Customer ending 5567",
        "amount": 22000.0,
        "timestamp": NOW - timedelta(hours=3),
        "collection_status": "COLLECTED",
        "bank_ref": "MBANKREF_301",
        "settlement_status": None,
        "refund_id": None,
    },
    "MTXN_302": {
        "mtxn_id": "MTXN_302",
        "merchant_id": "MERCH_3",
        "payer_name": "Customer ending 5567",
        "amount": 22000.0,
        "timestamp": NOW - timedelta(hours=20),
        "collection_status": "COLLECTED",
        "bank_ref": "MBANKREF_302",
        "settlement_status": "SETTLED",
        "refund_id": None,
    },
}

# bank_ref -> (settlement_state, reason_code), mirrors mock_bank_api.py's shape for merchant-side refs.
MERCHANT_BANK_SETTLEMENT_RECORDS = {
    "MBANKREF_101": ("SETTLED", "SETTLED_OK"),
    "MBANKREF_102": ("SETTLED", "SETTLED_OK"),
    "MBANKREF_201": ("SETTLED", "SETTLED_OK"),  # mismatch: internal still PENDING
    "MBANKREF_202": ("DECLINED", "CARD_ISSUER_DECLINE"),  # mismatch: collected but bank declined
    "MBANKREF_301": ("DECLINED", "SUSPECTED_FRAUD_HOLD"),  # mismatch: high value, escalate
    "MBANKREF_302": ("SETTLED", "SETTLED_OK"),
}


def get_merchant(merchant_id: str) -> dict | None:
    return MERCHANTS.get(merchant_id)


def get_merchant_transactions(merchant_id: str, days_back: int = 7) -> list[dict]:
    """Transactions belonging to this merchant only, newest first."""
    cutoff = NOW - timedelta(days=days_back)
    txns = [
        t for t in MERCHANT_TRANSACTIONS.values()
        if t["merchant_id"] == merchant_id and t["timestamp"] >= cutoff
    ]
    return sorted(txns, key=lambda t: t["timestamp"], reverse=True)


def get_merchant_transaction(mtxn_id: str) -> dict | None:
    return MERCHANT_TRANSACTIONS.get(mtxn_id)


def check_merchant_settlement(bank_ref: str) -> dict:
    state, reason = MERCHANT_BANK_SETTLEMENT_RECORDS.get(bank_ref, ("UNKNOWN", "NO_RECORD_FOUND"))
    return {"bank_ref": bank_ref, "settlement_state": state, "reason_code": reason}


def set_merchant_settlement_status(mtxn_id: str, status: str) -> None:
    if mtxn_id in MERCHANT_TRANSACTIONS:
        MERCHANT_TRANSACTIONS[mtxn_id]["settlement_status"] = status


def set_merchant_refund_id(mtxn_id: str, refund_id: str) -> None:
    if mtxn_id in MERCHANT_TRANSACTIONS:
        MERCHANT_TRANSACTIONS[mtxn_id]["refund_id"] = refund_id
