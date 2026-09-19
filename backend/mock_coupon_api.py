"""Mock coupon issuance API. Guardrailed in tools.py, not here."""
import time
import uuid

# lead_id -> issued coupon record
COUPONS: dict[str, dict] = {}


def issue_coupon(lead_id: str, discount_pct: float, reason: str) -> dict:
    """Issue a discount coupon for a lead. Idempotent per lead_id."""
    if lead_id in COUPONS:
        return COUPONS[lead_id]

    time.sleep(0.3)
    coupon = {
        "coupon_code": f"WINBACK{uuid.uuid4().hex[:6].upper()}",
        "lead_id": lead_id,
        "discount_pct": discount_pct,
        "reason": reason,
        "valid_hours": 48,
        "status": "ISSUED",
    }
    COUPONS[lead_id] = coupon
    return coupon


def get_coupon(lead_id: str) -> dict | None:
    return COUPONS.get(lead_id)
