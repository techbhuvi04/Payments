"""Hand-rolled agent loop. No framework. Uses Groq's OpenAI-compatible API."""
import json
import os
import time
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI
from tools import TOOL_SCHEMAS, to_openai_tools, execute_tool, GuardrailBlocked
from audit_log import log_event

load_dotenv(override=True)

GROQ_MODEL = "openai/gpt-oss-120b"
MAX_STEPS = 12

OPENAI_TOOLS = to_openai_tools(TOOL_SCHEMAS)

SYSTEM_PROMPT = """You are an autonomous customer service agent for Paytm, resolving failed \
transaction and refund disputes end to end.

You will receive a customer's free-text complaint plus their customer_id and ticket_id. You must:
1. Parse the complaint to identify amount, merchant, approximate date, and issue type.
2. Look up the customer's recent transactions and identify the specific transaction in question.
3. Check its settlement status with the bank.
4. Decide the resolution path:
   - Bank declined but money was debited -> initiate a refund.
   - Stuck in PENDING for more than 48 hours -> force-settle the transaction, then notify the \
customer it is resolved.
   - Successfully settled at the merchant's end -> send the customer proof of payment (do not refund).
   - Amount is above Rs.25,000, OR there are fraud signals (e.g. repeat complaints about the same \
merchant within 24 hours), OR the situation is ambiguous -> escalate to a human immediately. Do not \
attempt a refund in this case.
5. Execute exactly one resolution path using the tools available.
6. Send the customer a message in simple Hinglish (Roman script, mix of Hindi and English, the way a \
customer support agent would text) explaining the outcome in plain terms - unless the case was \
escalated with no resolution yet, in which case tell the customer it has been escalated and they will \
be updated.
7. Update the CRM ticket with a clear status and notes summarizing what was found and done.
8. Once the ticket is updated (RESOLVED or ESCALATED) and the customer has been messaged (if \
applicable), stop - do not call more tools than necessary. Your final reply (the plain-text message \
you write once you stop calling tools) is shown directly to the customer in their chat, exactly like \
the SMS - so it must ALSO be written in the same simple Hinglish (Roman script, mix of Hindi and \
English), not English. Never switch to English for this final message, even though your internal \
reasoning and notes can be in English.

Guardrails (enforced in code - if a tool call is blocked, escalate instead of retrying):
- Refunds above Rs.25,000 will be blocked. Escalate those instead.
- Refunding a transaction that already has a refund will be blocked.

Be decisive. Use the tools to gather evidence before deciding. Do not ask the user clarifying \
questions - resolve autonomously using the tools."""


def _get_client() -> OpenAI:
    return OpenAI(
        api_key=os.environ["GROQ_API_KEY"],
        base_url="https://api.groq.com/openai/v1",
        timeout=30.0,
        max_retries=2,
    )


def run_agent(customer_id: str, ticket_id: str, complaint_text: str, verbose: bool = True) -> dict:
    """Run the agent to completion. For CLI use; discards intermediate step events."""
    final = None
    for event in run_agent_stream(customer_id, ticket_id, complaint_text, verbose=verbose):
        if event["type"] == "final":
            final = event["result"]
    return final


def run_agent_stream(customer_id: str, ticket_id: str, complaint_text: str, verbose: bool = False):
    """Run the agent, yielding one event per tool call / final message, for live UI streaming.

    Event shapes:
      {"type": "tool_call", "name": ..., "input": ..., "result": ..., "is_error": ..., "latency_ms": ...}
      {"type": "final", "result": {"status": ..., "steps": ..., "final_text": ...}}
    """
    client = _get_client()
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"customer_id: {customer_id}\n"
                f"ticket_id: {ticket_id}\n"
                f"Customer complaint: \"{complaint_text}\""
            ),
        },
    ]

    log_event("system", "ticket_opened", {"customer_id": customer_id, "ticket_id": ticket_id, "complaint": complaint_text})

    steps = 0
    while steps < MAX_STEPS:
        steps += 1
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            max_tokens=400,
            tools=OPENAI_TOOLS,
            messages=messages,
        )

        choice = response.choices[0].message
        messages.append(choice.model_dump(exclude_none=True))

        tool_calls = choice.tool_calls or []
        if not tool_calls:
            final_text = choice.content or ""
            if verbose:
                print(f"[agent] final message: {final_text}")
            yield {"type": "final", "result": {"status": "done", "steps": steps, "final_text": final_text}}
            return

        for call in tool_calls:
            name = call.function.name
            try:
                tool_input = json.loads(call.function.arguments or "{}")
            except json.JSONDecodeError:
                tool_input = {}
            result_content, is_error, latency_ms = _run_tool(name, tool_input, verbose)
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": result_content,
            })
            yield {
                "type": "tool_call",
                "name": name,
                "input": tool_input,
                "result": result_content,
                "is_error": is_error,
                "latency_ms": latency_ms,
            }

    log_event("system", "max_steps_exceeded", {"ticket_id": ticket_id})
    _force_escalate(ticket_id, "Agent exceeded max steps without resolving.")
    yield {"type": "final", "result": {"status": "force_escalated", "steps": steps}}


def run_agent_events(customer_id: str, ticket_id: str, complaint_text: str):
    """Run the agent, yielding events in the fixed API schema:
    {seq, type, tool, args, result, latency_ms, blocked, timestamp}

    type in: thinking | tool_call | guardrail_block | message_sent | escalation | done
    Decision logic is untouched - this only reshapes run_agent_stream's events for the API.
    """
    seq = 0

    def _emit(event_type: str, tool=None, args=None, result=None, latency_ms=None, blocked=False):
        nonlocal seq
        seq += 1
        return {
            "seq": seq,
            "type": event_type,
            "tool": tool,
            "args": args,
            "result": result,
            "latency_ms": latency_ms,
            "blocked": blocked,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        }

    yield _emit("thinking", result="Reading complaint and looking up account history...")

    for event in run_agent_stream(customer_id, ticket_id, complaint_text, verbose=False):
        if event["type"] == "tool_call":
            name = event["name"]
            if event["is_error"]:
                yield _emit(
                    "guardrail_block", tool=name, args=event["input"],
                    result=event["result"], latency_ms=event["latency_ms"], blocked=True,
                )
            elif name == "send_customer_message":
                yield _emit(
                    "message_sent", tool=name, args=event["input"],
                    result=event["result"], latency_ms=event["latency_ms"],
                )
            elif name == "escalate_to_human":
                yield _emit(
                    "escalation", tool=name, args=event["input"],
                    result=event["result"], latency_ms=event["latency_ms"],
                )
            else:
                yield _emit(
                    "tool_call", tool=name, args=event["input"],
                    result=event["result"], latency_ms=event["latency_ms"],
                )
        elif event["type"] == "final":
            yield _emit("done", result=event["result"])


def _run_tool(name: str, tool_input: dict, verbose: bool) -> tuple[str, bool, int]:
    start = time.time()
    try:
        result = execute_tool(name, tool_input)
        latency_ms = int((time.time() - start) * 1000)
        if verbose:
            print(f"[tool] {name}({tool_input}) -> {result}  ({latency_ms}ms)")
        return json.dumps(result, default=str), False, latency_ms
    except GuardrailBlocked as e:
        latency_ms = int((time.time() - start) * 1000)
        if verbose:
            print(f"[tool BLOCKED] {name}({tool_input}) -> {e}  ({latency_ms}ms)")
        return str(e), True, latency_ms
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        if verbose:
            print(f"[tool ERROR] {name}({tool_input}) -> {e}  ({latency_ms}ms)")
        return f"Error: {e}", True, latency_ms


def _force_escalate(ticket_id: str, reason: str) -> None:
    execute_tool("escalate_to_human", {
        "ticket_id": ticket_id,
        "reason": reason,
        "context_summary": "Agent loop hit max steps.",
        "suggested_action": "Manual review required.",
    })
