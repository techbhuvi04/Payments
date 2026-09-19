from audit_log import get_audit_log
from mock_leads_db import get_lead

def get_impact_metrics():
    logs = get_audit_log()
    money_recovered = 0.0
    tickets_prevented = 0
    settlement_actions = 0
    fraud_prevented = 0
    
    for log in logs:
        action = log.get("action")
        details = log.get("details", {})
        
        if action in ("initiate_refund", "auto_refund_mismatch", "reverse_merchant_collection"):
            money_recovered += float(details.get("amount", 0))
            if action in ("auto_refund_mismatch", "reverse_merchant_collection"):
                tickets_prevented += 1
                
        if action == "issue_discount_coupon":
            lead_id = details.get("lead_id")
            if lead_id:
                lead = get_lead(lead_id)
                if lead:
                    money_recovered += float(lead.get("cart_value", 0))
                    
        if action in ("correct_internal_status", "correct_merchant_status"):
            tickets_prevented += 1
            settlement_actions += 1
            
        if action == "force_settlement":
            settlement_actions += 1
            
        if action in ("scam_shield_block_payee", "scam_shield_report"):
            fraud_prevented += 1

    return {
        "money_recovered": f"₹{int(money_recovered):,}",
        "tickets_prevented": tickets_prevented,
        "settlement_hours_saved": f"{settlement_actions * 48} hrs",
        "fraud_prevented": fraud_prevented
    }
