"""Mock refund initiation API. Idempotent per txn_id."""
import time
import uuid

# txn_id -> refund record
REFUNDS: dict[str, dict] = {}


def initiate_refund(txn_id: str, amount: float, reason: str) -> dict:
    """Initiate a refund for a transaction. Idempotent: repeated calls for the
    same txn_id return the original refund record instead of creating a new one."""
    if txn_id in REFUNDS:
        return REFUNDS[txn_id]

    time.sleep(0.3)
    refund = {
        "refund_id": f"RFND_{uuid.uuid4().hex[:8].upper()}",
        "txn_id": txn_id,
        "amount": amount,
        "reason": reason,
        "eta_hours": 24,
        "status": "INITIATED",
    }
    REFUNDS[txn_id] = refund
    return refund


def force_settlement(txn_id: str) -> dict:
    """Force-settle a stuck pending transaction with the bank."""
    time.sleep(0.3)
    return {
        "txn_id": txn_id,
        "status": "SETTLED",
        "settled_at": "just now",
    }


def get_refund(txn_id: str) -> dict | None:
    return REFUNDS.get(txn_id)
