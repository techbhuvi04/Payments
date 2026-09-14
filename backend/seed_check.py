"""Print the 4 demo scenarios as a table to verify seed data before building the agent."""
from mock_txn_db import TRANSACTIONS, get_customer_transactions
from mock_bank_api import check_settlement
from mock_crm import TICKETS

SCENARIOS = [
    ("A", "Clean auto-refund", "CUST_A", "TXN1001", "Bank declined, money debited -> auto-refund"),
    ("B", "Stuck pending", "CUST_B", "TXN1002", "Pending 3 days (>48h) -> force-settle + notify merchant"),
    ("C", "Already settled", "CUST_C", "TXN1003", "Settled at merchant end -> send proof of payment"),
    ("D", "Escalation", "CUST_D", "TXN1004", "Amount > 25k + repeat complaint in 24h -> escalate to human"),
]

def main():
    rows = []
    for code, name, cust, txn_id, expected in SCENARIOS:
        txn = TRANSACTIONS[txn_id]
        settlement = check_settlement(txn["bank_ref"])
        ticket = next((t for t in TICKETS.values() if t["customer_id"] == cust), None)
        rows.append({
            "Scenario": code,
            "Name": name,
            "Customer": cust,
            "TxnID": txn_id,
            "Amount": f"Rs.{txn['amount']:,.0f}",
            "TxnStatus": txn["status"],
            "BankSettlement": settlement["settlement_state"],
            "ReasonCode": settlement["reason_code"],
            "TicketNotes": len(ticket["notes"]) if ticket else 0,
            "ExpectedResolution": expected,
        })

    headers = list(rows[0].keys())
    widths = {h: max(len(h), max(len(str(r[h])) for r in rows)) for h in headers}

    def fmt_row(r):
        return " | ".join(str(r[h]).ljust(widths[h]) for h in headers)

    print(fmt_row({h: h for h in headers}))
    print("-+-".join("-" * widths[h] for h in headers))
    for r in rows:
        print(fmt_row(r))

    print()
    print("Customer D full recent history (shows repeat-complaint signal):")
    for t in get_customer_transactions("CUST_D", days_back=7):
        print(f"  {t['txn_id']}  {t['merchant_name']:<20} Rs.{t['amount']:,.0f}  {t['status']}  {t['timestamp']}")

if __name__ == "__main__":
    main()
