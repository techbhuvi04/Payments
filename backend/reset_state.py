"""Reset all mock system in-memory state back to the original seed data.

Used by the UI so each demo scenario run starts clean, without restarting the process.
"""
import copy
import importlib

import mock_txn_db
import mock_refund_api
import mock_crm
import mock_notifier
import mock_leads_db
import mock_sales_crm
import mock_coupon_api
import mock_merchants_db
import merchant_tools
import audit_log

_ORIGINAL_TRANSACTIONS = copy.deepcopy(mock_txn_db.TRANSACTIONS)
_ORIGINAL_TICKETS = copy.deepcopy(mock_crm.TICKETS)
_ORIGINAL_LEADS = copy.deepcopy(mock_leads_db.LEADS)
_ORIGINAL_LEAD_RECORDS = copy.deepcopy(mock_sales_crm.LEAD_RECORDS)
_ORIGINAL_MERCHANT_TRANSACTIONS = copy.deepcopy(mock_merchants_db.MERCHANT_TRANSACTIONS)


def reset_all_state() -> None:
    mock_txn_db.TRANSACTIONS.clear()
    mock_txn_db.TRANSACTIONS.update(copy.deepcopy(_ORIGINAL_TRANSACTIONS))

    mock_crm.TICKETS.clear()
    mock_crm.TICKETS.update(copy.deepcopy(_ORIGINAL_TICKETS))
    mock_crm.CUSTOMER_TO_TICKET.clear()
    mock_crm.CUSTOMER_TO_TICKET.update({t["customer_id"]: tid for tid, t in mock_crm.TICKETS.items()})

    mock_refund_api.REFUNDS.clear()
    mock_notifier.OUTBOX.clear()

    mock_leads_db.LEADS.clear()
    mock_leads_db.LEADS.update(copy.deepcopy(_ORIGINAL_LEADS))

    mock_sales_crm.LEAD_RECORDS.clear()
    mock_sales_crm.LEAD_RECORDS.update(copy.deepcopy(_ORIGINAL_LEAD_RECORDS))

    mock_coupon_api.COUPONS.clear()

    mock_merchants_db.MERCHANT_TRANSACTIONS.clear()
    mock_merchants_db.MERCHANT_TRANSACTIONS.update(copy.deepcopy(_ORIGINAL_MERCHANT_TRANSACTIONS))
    merchant_tools.MERCHANT_REFUNDS.clear()

    audit_log.reset_audit_log()
