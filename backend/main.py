"""CLI entrypoint. Replay any demo scenario deterministically with --scenario A|B|C|D."""
import argparse
import json
from agent import run_agent
from audit_log import get_audit_log
from mock_notifier import OUTBOX
from mock_crm import TICKETS

SCENARIOS = {
    "A": {
        "customer_id": "CUST_A",
        "ticket_id": "TICKET_A",
        "complaint": "I paid 2400 to Sharma Electronics yesterday, money is gone but shopkeeper says he didn't get it.",
    },
    "B": {
        "customer_id": "CUST_B",
        "ticket_id": "TICKET_B",
        "complaint": "I paid 5600 to Verma Mobile Store 3 days ago and the payment is still stuck, please help.",
    },
    "C": {
        "customer_id": "CUST_C",
        "ticket_id": "TICKET_C",
        "complaint": "I paid 850 to Gupta Kirana Store today, app shows it went through but I want confirmation the shop received it.",
    },
    "D": {
        "customer_id": "CUST_D",
        "ticket_id": "TICKET_D",
        "complaint": "I paid 47000 to Singh Jewellers, money got deducted but transaction failed. This is the second time this is happening.",
    },
    "E": {
        "customer_id": "CUST_E",
        "ticket_id": "TICKET_E",
        "complaint": "I paid 640 to Reddy Medical Store 4 hours ago, payment failed but amount was deducted from my account.",
    },
    "F": {
        "customer_id": "CUST_F",
        "ticket_id": "TICKET_F",
        "complaint": "I paid 3200 to Iyer Textiles 10 hours ago, status still shows pending, please check.",
    },
    "G": {
        "customer_id": "CUST_G",
        "ticket_id": "TICKET_G",
        "complaint": "I paid 31000 to Malhotra Furnishings, transaction failed but money was debited from my account.",
    },
}


def main():
    parser = argparse.ArgumentParser(description="Run the autonomous refund-dispute agent.")
    parser.add_argument("--scenario", choices=list(SCENARIOS.keys()), help="Replay a seeded demo scenario.")
    parser.add_argument("--customer_id", help="Custom customer_id (overrides --scenario).")
    parser.add_argument("--ticket_id", help="Custom ticket_id (overrides --scenario).")
    parser.add_argument("--complaint", help="Custom complaint text (overrides --scenario).")
    args = parser.parse_args()

    if args.scenario:
        case = SCENARIOS[args.scenario]
        customer_id, ticket_id, complaint = case["customer_id"], case["ticket_id"], case["complaint"]
    elif args.customer_id and args.ticket_id and args.complaint:
        customer_id, ticket_id, complaint = args.customer_id, args.ticket_id, args.complaint
    else:
        parser.error("Provide --scenario A|B|C|D, or all of --customer_id/--ticket_id/--complaint.")

    print(f"=== Running agent for {customer_id} / {ticket_id} ===")
    print(f"Complaint: {complaint}\n")

    result = run_agent(customer_id, ticket_id, complaint)

    print("\n=== RESULT ===")
    print(json.dumps(result, indent=2, default=str))

    print("\n=== TICKET STATE ===")
    print(json.dumps(TICKETS[ticket_id], indent=2, default=str))

    print("\n=== SMS OUTBOX (this customer) ===")
    for msg in OUTBOX:
        print(json.dumps(msg, indent=2, default=str))

    print("\n=== AUDIT LOG ===")
    for entry in get_audit_log():
        print(json.dumps(entry, indent=2, default=str))


if __name__ == "__main__":
    main()
