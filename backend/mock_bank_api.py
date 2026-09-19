"""Mock bank settlement API. Simulates network latency."""
import time

# bank_ref -> (settlement_state, reason_code)
SETTLEMENT_RECORDS = {
    "BANKREF_A1": ("DECLINED", "INSUFFICIENT_MERCHANT_ACCOUNT_VALIDATION"),
    "BANKREF_B1": ("PENDING", "AWAITING_CLEARING_HOUSE_BATCH"),
    "BANKREF_C1": ("SETTLED", "SETTLED_OK"),
    "BANKREF_D1": ("DECLINED", "SUSPECTED_FRAUD_HOLD"),
    "BANKREF_D2": ("DECLINED", "SUSPECTED_FRAUD_HOLD"),
    "BANKREF_A2": ("SETTLED", "SETTLED_OK"),
    "BANKREF_E1": ("DECLINED", "MERCHANT_TIMEOUT"),
    "BANKREF_F1": ("PENDING", "AWAITING_CLEARING_HOUSE_BATCH"),
    "BANKREF_G1": ("DECLINED", "INSUFFICIENT_MERCHANT_ACCOUNT_VALIDATION"),
    "BANKREF_R1": ("DECLINED", "CARD_ISSUER_DECLINE"),
    "BANKREF_R2": ("SETTLED", "SETTLED_OK"),
    "BANKREF_R3": ("DECLINED", "SUSPECTED_FRAUD_HOLD"),
    "BANKREF_R4": ("SETTLED", "SETTLED_OK"),
}


def check_settlement(bank_ref: str) -> dict:
    """Check settlement status with the bank. Returns state + reason code."""
    time.sleep(0.3)  # artificial latency for demo realism
    state, reason = SETTLEMENT_RECORDS.get(bank_ref, ("UNKNOWN", "NO_RECORD_FOUND"))
    return {"bank_ref": bank_ref, "settlement_state": state, "reason_code": reason}
