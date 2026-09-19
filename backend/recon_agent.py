"""Hand-rolled reconciliation sweep agent. Same architecture as agent.py/sales_agent.py,
but runs proactively over a batch of transactions instead of reacting to a single complaint."""
import json
import os
import time
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI, BadRequestError
import mock_txn_db as txn_db
from recon_tools import RECON_TOOL_SCHEMAS, to_openai_tools, execute_recon_tool
from tools import GuardrailBlocked
from audit_log import log_event

load_dotenv(override=True)

GROQ_MODEL = "openai/gpt-oss-120b"
MAX_STEPS_PER_TXN = 6

OPENAI_TOOLS = to_openai_tools(RECON_TOOL_SCHEMAS)

SYSTEM_PROMPT = """You are an autonomous payments reconciliation teammate for Paytm. You proactively \
audit transactions - nobody has complained about these, you are catching problems before customers do.

You will receive one transaction's internal record (txn_id, customer_id, amount, internal status, \
settlement_status) and its ticket_id. You must:
1. Check the transaction's real settlement status with the bank using check_bank_settlement.
2. Compare it to the internal record and classify:
   - Internal says SUCCESS but bank says DECLINED (money should not have been kept as successful) \
-> this is a refund-worthy mismatch. Auto-refund it if the amount is small enough (the tool will \
block you and tell you if it's too large - if blocked, escalate instead).
   - Internal is stale (e.g. still PENDING) but bank already shows SETTLED -> correct the internal \
status, no refund needed.
   - Internal and bank agree -> mark_reconciled, no action needed.
   - Anything ambiguous, or a blocked auto-refund -> escalate_mismatch with full context.
3. Take exactly one corrective action (or none, if already matched).
4. Stop once you've called mark_reconciled, auto_refund_mismatch, correct_internal_status, or \
escalate_mismatch for this transaction - do not call more tools than necessary.

Guardrails (enforced in code - if a tool call is blocked, escalate instead of retrying):
- Auto-refunds above Rs.10,000 will be blocked. Escalate those instead.
- Duplicate refunds will be blocked.

Be decisive and terse. This is a batch audit, not a conversation."""


def _get_client() -> OpenAI:
    return OpenAI(
        api_key=os.environ["GROQ_API_KEY"],
        base_url="https://api.groq.com/openai/v1",
        timeout=30.0,
        max_retries=2,
    )


def _run_tool(name: str, tool_input: dict, verbose: bool) -> tuple[str, bool, int]:
    start = time.time()
    try:
        result = execute_recon_tool(name, tool_input)
        latency_ms = int((time.time() - start) * 1000)
        return json.dumps(result, default=str), False, latency_ms
    except GuardrailBlocked as e:
        latency_ms = int((time.time() - start) * 1000)
        return str(e), True, latency_ms
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return f"Error: {e}", True, latency_ms


def _run_one_transaction(client: OpenAI, txn: dict, ticket_id: str):
    """Yields tool_call events for a single transaction's reconciliation check."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"txn_id: {txn['txn_id']}\ncustomer_id: {txn['customer_id']}\n"
                f"ticket_id: {ticket_id}\namount: {txn['amount']}\n"
                f"internal_status: {txn['status']}\ninternal_settlement_status: {txn['settlement_status']}\n"
                f"bank_ref: {txn['bank_ref']}"
            ),
        },
    ]

    steps = 0
    while steps < MAX_STEPS_PER_TXN:
        steps += 1
        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL, max_tokens=300, tools=OPENAI_TOOLS, messages=messages,
            )
        except BadRequestError:
            if steps == 1:
                messages.append({"role": "user", "content": "Please retry with a valid tool call."})
                steps -= 1
                continue
            raise
        choice = response.choices[0].message
        messages.append(choice.model_dump(exclude_none=True))

        tool_calls = choice.tool_calls or []
        if not tool_calls:
            # Occasionally the model stops with no tool calls on its very first turn,
            # which would silently skip auditing this transaction - nudge it to continue.
            if not (choice.content or "").strip() and steps == 1:
                messages.append({
                    "role": "user",
                    "content": "Continue - check the bank settlement status before deciding.",
                })
                continue
            return

        for call in tool_calls:
            name = call.function.name
            try:
                tool_input = json.loads(call.function.arguments or "{}")
            except json.JSONDecodeError:
                tool_input = {}
            result_content, is_error, latency_ms = _run_tool(name, tool_input, verbose=False)
            messages.append({"role": "tool", "tool_call_id": call.id, "content": result_content})
            yield {
                "type": "tool_call", "name": name, "input": tool_input,
                "result": result_content, "is_error": is_error, "latency_ms": latency_ms,
            }


def run_reconciliation_sweep(txn_ids: list[str]):
    """Run the reconciliation agent over each given txn_id, yielding fixed-schema events.

    Event shapes match the other agents:
      {seq, type, tool, args, result, latency_ms, blocked, timestamp}
    type in: thinking | tool_call | guardrail_block | escalation | txn_done | done
    """
    client = _get_client()
    seq = 0

    def _emit(event_type, tool=None, args=None, result=None, latency_ms=None, blocked=False):
        nonlocal seq
        seq += 1
        return {
            "seq": seq, "type": event_type, "tool": tool, "args": args, "result": result,
            "latency_ms": latency_ms, "blocked": blocked,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        }

    log_event("system", "reconciliation_sweep_started", {"txn_ids": txn_ids})
    yield _emit("thinking", result=f"Starting reconciliation sweep over {len(txn_ids)} transactions...")

    summary = {"matched": 0, "auto_fixed": 0, "escalated": 0}

    for txn_id in txn_ids:
        txn = txn_db.get_transaction(txn_id)
        if txn is None:
            continue
        from mock_crm import CUSTOMER_TO_TICKET
        ticket_id = CUSTOMER_TO_TICKET.get(txn["customer_id"])

        yield _emit("thinking", result=f"Checking {txn_id} ({txn['customer_id']}, Rs.{txn['amount']:,.0f})...")

        outcome = "matched"
        for event in _run_one_transaction(client, txn, ticket_id):
            name = event["name"]
            if event["is_error"]:
                yield _emit("guardrail_block", tool=name, args=event["input"], result=event["result"], latency_ms=event["latency_ms"], blocked=True)
            elif name == "escalate_mismatch":
                outcome = "escalated"
                yield _emit("escalation", tool=name, args=event["input"], result=event["result"], latency_ms=event["latency_ms"])
            elif name in ("auto_refund_mismatch", "correct_internal_status"):
                outcome = "auto_fixed"
                yield _emit("tool_call", tool=name, args=event["input"], result=event["result"], latency_ms=event["latency_ms"])
            else:
                yield _emit("tool_call", tool=name, args=event["input"], result=event["result"], latency_ms=event["latency_ms"])

        summary[outcome if outcome != "matched" else "matched"] += 1
        yield _emit("txn_done", result={"txn_id": txn_id, "outcome": outcome})

    log_event("system", "reconciliation_sweep_finished", summary)
    yield _emit("done", result={"status": "done", **summary, "total": len(txn_ids)})
