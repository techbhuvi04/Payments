"""Streamlit UI: customer chat | live agent activity feed | system state."""
import streamlit as st

from agent import run_agent_stream
from reset_state import reset_all_state
import mock_txn_db as txn_db
import mock_crm as crm
import mock_notifier as notifier
import mock_refund_api as refund_api
from audit_log import get_audit_log

st.set_page_config(page_title="Paytm Autonomous Resolution Agent", layout="wide")

SCENARIOS = {
    "A - Clean auto-refund": {
        "customer_id": "CUST_A",
        "ticket_id": "TICKET_A",
        "complaint": "I paid 2400 to Sharma Electronics yesterday, money is gone but shopkeeper says he didn't get it.",
    },
    "B - Stuck pending": {
        "customer_id": "CUST_B",
        "ticket_id": "TICKET_B",
        "complaint": "I paid 5600 to Verma Mobile Store 3 days ago and the payment is still stuck, please help.",
    },
    "C - Already settled": {
        "customer_id": "CUST_C",
        "ticket_id": "TICKET_C",
        "complaint": "I paid 850 to Gupta Kirana Store today, app shows it went through but I want confirmation the shop received it.",
    },
    "D - Escalation": {
        "customer_id": "CUST_D",
        "ticket_id": "TICKET_D",
        "complaint": "I paid 47000 to Singh Jewellers, money got deducted but transaction failed. This is the second time this is happening.",
    },
}

if "chat_history" not in st.session_state:
    st.session_state.chat_history = []
if "activity_feed" not in st.session_state:
    st.session_state.activity_feed = []
if "running" not in st.session_state:
    st.session_state.running = False


def reset_demo():
    reset_all_state()
    st.session_state.chat_history = []
    st.session_state.activity_feed = []


st.title("🤖 Paytm Autonomous Resolution Agent")
st.caption("Hand-rolled agent loop · resolves failed-transaction / refund disputes end to end")

with st.sidebar:
    st.header("Demo Controls")
    scenario_label = st.selectbox("Pick a scenario", list(SCENARIOS.keys()))
    run_clicked = st.button("▶️ Run scenario", type="primary", disabled=st.session_state.running)
    reset_clicked = st.button("🔄 Reset all state")
    if reset_clicked:
        reset_demo()
        st.rerun()

    st.divider()
    st.subheader("Or send a custom complaint")
    custom_customer = st.selectbox("customer_id", ["CUST_A", "CUST_B", "CUST_C", "CUST_D"])
    custom_complaint = st.text_area("Complaint text", height=80)
    custom_clicked = st.button("Send custom complaint", disabled=st.session_state.running)

left, center, right = st.columns([1, 1.4, 1])

with left:
    st.subheader("💬 Customer Chat")
    chat_container = st.container(height=520)
    with chat_container:
        for msg in st.session_state.chat_history:
            with st.chat_message(msg["role"]):
                st.write(msg["content"])

with center:
    st.subheader("⚙️ Live Agent Activity")
    activity_container = st.container(height=520)

with right:
    st.subheader("📋 System State")
    state_container = st.container(height=520)


def render_state(container, customer_id: str, ticket_id: str):
    with container:
        ticket = crm.TICKETS.get(ticket_id)
        if ticket:
            st.markdown("**Ticket**")
            status_color = {"OPEN": "🟡", "RESOLVED": "🟢", "ESCALATED": "🔴", "IN_PROGRESS": "🟠"}
            st.write(f"{status_color.get(ticket['status'], '⚪')} `{ticket['ticket_id']}` — **{ticket['status']}**")
            for note in ticket["notes"]:
                st.caption(f"• {note}")

        st.markdown("**Transactions**")
        for t in txn_db.get_customer_transactions(customer_id, days_back=7):
            with st.expander(f"{t['txn_id']} · Rs.{t['amount']:,.0f} · {t['merchant_name']}", expanded=True):
                st.write(f"Status: `{t['status']}`  |  Settlement: `{t['settlement_status']}`")
                st.write(f"Bank ref: `{t['bank_ref']}`")
                refund = refund_api.get_refund(t["txn_id"])
                if refund:
                    st.success(f"Refund {refund['refund_id']} · {refund['status']} · ETA {refund['eta_hours']}h")

        st.markdown("**SMS Outbox**")
        customer_msgs = [
            m for m in notifier.OUTBOX
            if m["phone"] == notifier.CUSTOMER_PHONES.get(customer_id)
        ]
        for m in customer_msgs[-3:]:
            st.chat_message("assistant").write(f"📱 {m['message']}")


def render_activity_event(container, event: dict):
    with container:
        if event["type"] == "tool_call":
            icon = "🚫" if event["is_error"] else "✅"
            with st.container(border=True):
                st.markdown(f"{icon} **`{event['name']}`**  \n`{event['latency_ms']}ms`")
                st.code(event["input"], language="json")
                st.caption(f"→ {event['result'][:300]}")
        elif event["type"] == "final":
            st.info(f"Agent finished · {event['result']}")


def run_scenario(customer_id: str, ticket_id: str, complaint: str):
    st.session_state.running = True
    st.session_state.chat_history.append({"role": "user", "content": complaint})

    with chat_container:
        with st.chat_message("user"):
            st.write(complaint)

    for event in run_agent_stream(customer_id, ticket_id, complaint, verbose=False):
        st.session_state.activity_feed.append(event)
        render_activity_event(activity_container, event)
        render_state(state_container, customer_id, ticket_id)

        if event["type"] == "final":
            final_text = event["result"].get("final_text") or "Ticket escalated to a human agent."
            st.session_state.chat_history.append({"role": "assistant", "content": final_text})
            with chat_container:
                with st.chat_message("assistant"):
                    st.write(final_text)

    st.session_state.running = False


if run_clicked:
    case = SCENARIOS[scenario_label]
    run_scenario(case["customer_id"], case["ticket_id"], case["complaint"])
elif custom_clicked and custom_complaint.strip():
    ticket = crm.get_ticket_for_customer(custom_customer)
    if ticket:
        run_scenario(custom_customer, ticket["ticket_id"], custom_complaint.strip())
else:
    # Render current state even without a run, so switching customers in the sidebar
    # or reloading the page still shows something meaningful.
    default_customer = SCENARIOS[scenario_label]["customer_id"]
    default_ticket = SCENARIOS[scenario_label]["ticket_id"]
    render_state(state_container, default_customer, default_ticket)
    for event in st.session_state.activity_feed:
        render_activity_event(activity_container, event)

st.divider()
with st.expander("🧾 Full Audit Log"):
    for entry in get_audit_log():
        st.json(entry)
