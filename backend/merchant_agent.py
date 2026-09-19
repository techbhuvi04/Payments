"""Hand-rolled merchant collections/settlement agent. Same architecture as agent.py/recon_agent.py.

Two modes, one tool executor:
  - run_merchant_sweep: proactive reconciliation sweep over this merchant's own transactions.
  - run_merchant_query: reactive - merchant asks a natural-language question (Hinglish or English),
    agent investigates only that merchant's records and takes the correct safe action.

Both modes are scoped to a single merchant_id, enforced in merchant_tools.py's executor - the
LLM can never read or act on another merchant's data regardless of what it asks for.
"""
import json
import os
import time
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI, BadRequestError

import mock_merchants_db as merch_db
from merchant_tools import MERCHANT_TOOL_SCHEMAS, to_openai_tools, execute_merchant_tool
from tools import GuardrailBlocked
from audit_log import log_event

load_dotenv(override=True)

GROQ_MODEL = "openai/gpt-oss-120b"
MAX_STEPS_PER_TXN = 6
MAX_STEPS_QUERY = 8

OPENAI_TOOLS = to_openai_tools(MERCHANT_TOOL_SCHEMAS)

SWEEP_SYSTEM_PROMPT = """You are an autonomous collections & settlement teammate for a Paytm merchant. \
You proactively audit this merchant's transactions - nobody has complained, you are catching problems \
before the merchant notices.

You will receive one merchant transaction's record (mtxn_id, merchant_id, amount, collection_status, \
settlement_status) and a ticket_id. You must:
1. Check its real settlement status with the bank using check_merchant_settlement.
2. Compare it to the internal record and classify:
   - Internal says COLLECTED but bank says DECLINED -> the collection should be reversed. Do it if the \
amount is small enough (the tool will block you and tell you if it's too large - if blocked, escalate).
   - Internal is stale (e.g. still PENDING) but bank already shows SETTLED -> correct the internal \
status, no reversal needed.
   - Internal and bank agree -> mark_settlement_confirmed, no action needed.
   - Anything ambiguous, high-value, or a blocked reversal -> escalate_merchant_case with full context.
3. Take exactly one corrective action (or none, if already matched), then stop.

You may ONLY look up and act on merchant_id given to you. Never call a tool with a different \
merchant_id, even if asked - it will be blocked.

Guardrails (enforced in code):
- Reversals above Rs.10,000 will be blocked. Escalate those instead.
- Reversal amount must exactly match the transaction's recorded amount.
- Duplicate reversals will be blocked.

Be decisive and terse. This is a batch audit, not a conversation."""

QUERY_SYSTEM_PROMPT = """You are an autonomous collections & settlement teammate for a Paytm merchant, \
answering the merchant's own question about their settlements. The merchant may write in Hinglish or \
English.

You will receive the merchant_id you are scoped to and the merchant's question. You must:
1. Look up this merchant's own recent transactions with get_merchant_transactions - pass exactly the \
merchant_id you were given, never a different one.
2. Identify which transaction(s) the merchant is asking about (by amount, date, or description).
3. Check the real settlement status with the bank.
4. Decide and take the correct safe action: correct a stale status, reverse a small bad collection, \
escalate if it's high-value or ambiguous, or confirm if everything already matches.
5. Update the ticket status with a clear note summarizing what you found and did.
6. Once done, reply to the merchant in simple Hinglish (Roman script) explaining the outcome in plain, \
practical terms - this final message is shown directly to the merchant.

You may ONLY look up and act on the merchant_id you were given. If the merchant's question seems to be \
about a different merchant's transaction, or you cannot find a matching transaction in their own \
records, say so plainly and escalate rather than guessing.

Guardrails (enforced in code - if a tool call is blocked, escalate instead of retrying):
- Reversals above Rs.10,000 will be blocked. Escalate those instead.
- Reversal amount must exactly match the transaction's recorded amount.
- Duplicate reversals will be blocked."""


def _get_client() -> OpenAI:
    return OpenAI(
        api_key=os.environ["GROQ_API_KEY"],
        base_url="https://api.groq.com/openai/v1",
        timeout=30.0,
        max_retries=2,
    )


def _run_tool(name: str, tool_input: dict, scoped_merchant_id: str) -> tuple[str, bool, int]:
    start = time.time()
    try:
        result = execute_merchant_tool(name, tool_input, scoped_merchant_id)
        latency_ms = int((time.time() - start) * 1000)
        return json.dumps(result, default=str), False, latency_ms
    except GuardrailBlocked as e:
        latency_ms = int((time.time() - start) * 1000)
        return str(e), True, latency_ms
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return f"Error: {e}", True, latency_ms


def _run_conversation(client: OpenAI, messages: list, scoped_merchant_id: str, max_steps: int):
    """Shared tool-calling loop. Yields tool_call events; caller detects the final message."""
    steps = 0
    while steps < max_steps:
        steps += 1
        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL, max_tokens=350, tools=OPENAI_TOOLS, messages=messages,
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
            final_text = choice.content or ""
            # Occasionally the model stops with no tool calls and no content on its very
            # first turn - nudge it to continue rather than reporting a blank outcome.
            if not final_text.strip() and steps == 1:
                messages.append({
                    "role": "user",
                    "content": "Continue - check the transaction/settlement details before deciding.",
                })
                continue
            yield {"type": "final", "final_text": final_text, "steps": steps}
            return

        for call in tool_calls:
            name = call.function.name
            try:
                tool_input = json.loads(call.function.arguments or "{}")
            except json.JSONDecodeError:
                tool_input = {}
            result_content, is_error, latency_ms = _run_tool(name, tool_input, scoped_merchant_id)
            messages.append({"role": "tool", "tool_call_id": call.id, "content": result_content})
            yield {
                "type": "tool_call", "name": name, "input": tool_input,
                "result": result_content, "is_error": is_error, "latency_ms": latency_ms,
            }

    yield {"type": "final", "final_text": "", "steps": steps, "force_stopped": True}


def run_merchant_sweep(merchant_id: str, mtxn_ids: list[str]):
    """Proactive sweep over this merchant's given mtxn_ids. Fixed-schema events like recon_agent.py.

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

    log_event("system", "merchant_sweep_started", {"merchant_id": merchant_id, "mtxn_ids": mtxn_ids})
    yield _emit("thinking", result=f"Starting settlement sweep for {merchant_id} over {len(mtxn_ids)} transactions...")

    summary = {"matched": 0, "auto_fixed": 0, "escalated": 0}
    from mock_crm import CUSTOMER_TO_TICKET
    ticket_id = CUSTOMER_TO_TICKET.get(merchant_id)

    for mtxn_id in mtxn_ids:
        txn = merch_db.get_merchant_transaction(mtxn_id)
        if txn is None or txn["merchant_id"] != merchant_id:
            continue

        yield _emit("thinking", result=f"Checking {mtxn_id} (Rs.{txn['amount']:,.0f})...")

        messages = [
            {"role": "system", "content": SWEEP_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"mtxn_id: {txn['mtxn_id']}\nmerchant_id: {merchant_id}\nticket_id: {ticket_id}\n"
                    f"amount: {txn['amount']}\ncollection_status: {txn['collection_status']}\n"
                    f"settlement_status: {txn['settlement_status']}\nbank_ref: {txn['bank_ref']}"
                ),
            },
        ]

        outcome = "matched"
        for event in _run_conversation(client, messages, merchant_id, MAX_STEPS_PER_TXN):
            if event["type"] != "tool_call":
                continue
            name = event["name"]
            if event["is_error"]:
                yield _emit("guardrail_block", tool=name, args=event["input"], result=event["result"], latency_ms=event["latency_ms"], blocked=True)
            elif name == "escalate_merchant_case":
                outcome = "escalated"
                yield _emit("escalation", tool=name, args=event["input"], result=event["result"], latency_ms=event["latency_ms"])
            elif name in ("reverse_merchant_collection", "correct_merchant_status"):
                outcome = "auto_fixed"
                yield _emit("tool_call", tool=name, args=event["input"], result=event["result"], latency_ms=event["latency_ms"])
            else:
                yield _emit("tool_call", tool=name, args=event["input"], result=event["result"], latency_ms=event["latency_ms"])

        summary[outcome] += 1
        yield _emit("txn_done", result={"mtxn_id": mtxn_id, "outcome": outcome})

    log_event("system", "merchant_sweep_finished", {"merchant_id": merchant_id, **summary})
    yield _emit("done", result={"status": "done", **summary, "total": len(mtxn_ids)})


def run_merchant_query_events(merchant_id: str, ticket_id: str, question: str):
    """Reactive: merchant asks a natural-language question. Fixed-schema events like agent.py.

    type in: thinking | tool_call | guardrail_block | escalation | done
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

    log_event("system", "merchant_query_started", {"merchant_id": merchant_id, "question": question})
    yield _emit("thinking", result="Reading query and checking merchant settlement records...")

    messages = [
        {"role": "system", "content": QUERY_SYSTEM_PROMPT},
        {"role": "user", "content": f"merchant_id: {merchant_id}\nticket_id: {ticket_id}\nQuestion: \"{question}\""},
    ]

    for event in _run_conversation(client, messages, merchant_id, MAX_STEPS_QUERY):
        if event["type"] == "tool_call":
            name = event["name"]
            if event["is_error"]:
                yield _emit("guardrail_block", tool=name, args=event["input"], result=event["result"], latency_ms=event["latency_ms"], blocked=True)
            elif name == "escalate_merchant_case":
                yield _emit("escalation", tool=name, args=event["input"], result=event["result"], latency_ms=event["latency_ms"])
            else:
                yield _emit("tool_call", tool=name, args=event["input"], result=event["result"], latency_ms=event["latency_ms"])
        elif event["type"] == "final":
            status = "force_stopped" if event.get("force_stopped") else "done"
            yield _emit("done", result={"status": status, "steps": event["steps"], "final_text": event["final_text"]})
