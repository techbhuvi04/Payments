<div align="center">

# Paytm Autonomous Resolution Agent

**Autonomous refund resolution, not another chatbot.**

A hand-rolled AI agent that reads a customer complaint, investigates the transaction,
and takes action — refund, settlement, or escalation — in seconds.

![Landing Page](docs/images/landing_page.png)

</div>

---

## What It Does

| | Traditional Chatbot | This Agent |
|:---:|---|---|
| | Reads the complaint, matches a script | Parses amount, merchant, date, issue type |
| | Asks the customer for details it already has | Looks up transactions and bank settlement itself |
| | Cannot touch bank or refund systems | Executes refund, settlement, or escalation directly |
| | Hands off to a human, 24–48h later | Resolves or escalates with full context in seconds |

---

## Architecture

```mermaid
flowchart TB
    subgraph Frontend ["Frontend (web/)"]
        direction LR
        HTML["index.html"]
        CSS["styles.css"]
        JS["app.js"]
    end

    subgraph API ["FastAPI Server (api.py)"]
        R1["POST /api/run"]
        R2["GET /api/runs/:id/events"]
        R3["POST /api/reset"]
    end

    subgraph Agent ["Agent Loop (agent.py)"]
        SYS["System Prompt + Decision Tree"]
        LOOP["Tool-Calling Loop (max 12 steps)"]
        STREAM["Event Streaming"]
    end

    subgraph Tools ["Tools & Guardrails (tools.py)"]
        T1["get_customer_transactions"]
        T2["check_bank_settlement"]
        T3["initiate_refund"]
        T4["force_settlement"]
        T5["update_ticket"]
        T6["send_customer_message"]
        T7["escalate_to_human"]
        G1["Refund > 25K -> BLOCKED"]
        G2["Duplicate Refund -> BLOCKED"]
    end

    subgraph Backends ["Mock Backends"]
        DB["mock_txn_db.py\n(Transaction DB)"]
        BANK["mock_bank_api.py\n(Bank Settlement)"]
        REFUND["mock_refund_api.py\n(Refund Service)"]
        CRM["mock_crm.py\n(CRM Tickets)"]
        SMS["mock_notifier.py\n(SMS Outbox)"]
        AUDIT["audit_log.py\n(Audit Trail)"]
    end

    Frontend -- "HTTP Polling" --> API
    API --> Agent
    Agent -- "Function Calls" --> Tools
    Tools --> Backends
```

### Three-Panel Dashboard

The web UI provides a real-time, three-panel view of the agent's work:

| Panel | What It Shows |
|:---:|---|
| **Customer Chat** | Complaint input, scenario tabs (A/B/C/D), and agent's Hinglish response |
| **Live Agent Activity** | Every tool call with args, results, and latency in real-time |
| **System State** | Ticket status, transactions, refunds, and SMS outbox — updated live |

---

## Demo Scenarios

The agent ships with **4 seeded scenarios** that showcase different resolution paths:

### Scenario A — Auto-Refund

> *"I paid 2400 to Sharma Electronics yesterday, money is gone but shopkeeper says he didn't get it."*

The agent looks up the transaction → checks bank settlement (DECLINED) → initiates refund → updates CRM ticket → sends Hinglish SMS to customer. **Fully resolved autonomously.**

<div align="center">

![Scenario A — Agent resolves a bank-declined payment with automatic refund](docs/images/scenario_a_refund.png)

</div>

### Scenario B — Force Settlement

> *"I paid 5600 to Verma Mobile Store 3 days ago and the payment is still stuck."*

Transaction stuck in PENDING > 48h → agent force-settles → notifies customer it's resolved.

### Scenario C — Proof of Payment

> *"I paid 850 to Gupta Kirana Store today, app shows it went through but I want confirmation."*

Already settled → agent sends proof-of-payment confirmation to the customer, no refund needed.

### Scenario D — Escalation (Guardrail Block)

> *"I paid 47000 to Singh Jewellers, money got deducted but transaction failed. This is the second time."*

Amount > Rs.25,000 + repeat complaint → guardrail blocks auto-refund → agent escalates to human with full context.

<div align="center">

![Scenario D — High-value repeat complaint triggers guardrail and escalation](docs/images/scenario_d_escalation.png)

</div>

---

## How the Agent Works

```mermaid
flowchart TD
    A["Customer Complaint"] --> B["Parse complaint\n(amount, merchant, date, issue)"]
    B --> C["get_customer_transactions()"]
    C --> D["check_bank_settlement()"]
    D --> E{Decision}
    E -- "DECLINED +\nmoney debited" --> F["initiate_refund()"]
    E -- "PENDING > 48h" --> G["force_settlement()"]
    E -- "SETTLED at\nmerchant" --> H["Send proof\n(no refund)"]
    E -- "Amount > 25K /\nfraud / ambiguous" --> I["escalate_to_human()"]
    F --> J["send_customer_message()\nHinglish SMS"]
    G --> J
    H --> J
    I --> J
    J --> K["update_ticket()\nCRM status + notes"]
    K --> L["Done\n(RESOLVED or ESCALATED)"]
```

### Guardrails (Code-Enforced, Not Prompt-Based)

| Rule | Enforcement |
|---|---|
| Refund amount > Rs.25,000 | `GuardrailBlocked` exception → forced escalation |
| Duplicate refund for same txn | `GuardrailBlocked` exception → forced escalation |
| Agent exceeds 12 tool calls | Auto-escalation with full context |

---

## Project Structure

```
Paytm/
├── backend/                    # Python backend
│   ├── agent.py                # Core agent loop (tool-calling, streaming)
│   ├── api.py                  # FastAPI server (REST API + static hosting)
│   ├── tools.py                # Tool schemas, executor, guardrails
│   ├── main.py                 # CLI entrypoint (--scenario A|B|C|D)
│   ├── mock_txn_db.py          # Mock transaction database
│   ├── mock_bank_api.py        # Mock bank settlement API
│   ├── mock_refund_api.py      # Mock refund service
│   ├── mock_crm.py             # Mock CRM ticket system
│   ├── mock_notifier.py        # Mock SMS notifier
│   ├── audit_log.py            # Immutable audit trail
│   ├── reset_state.py          # State reset utility
│   └── seed_check.py           # Scenario validation
│
├── web/                        # Frontend (vanilla HTML/CSS/JS)
│   ├── index.html              # Landing page + agent dashboard
│   ├── styles.css              # Styling
│   └── app.js                  # Agent UI logic (polling, rendering)
│
├── docs/images/                # Screenshots
├── .env.example                # Environment variable template
├── requirements.txt            # Python dependencies
└── README.md
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- A [Groq API key](https://console.groq.com/keys)

### 1. Clone & Install

```bash
git clone https://github.com/techbhuvi04/Payments.git
cd Payments
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your Groq API key:
# GROQ_API_KEY=gsk_...
```

### 3. Run the Web UI

```bash
cd backend
uvicorn api:app --reload --port 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

### 4. Run via CLI (Optional)

```bash
cd backend
python main.py --scenario A   # Auto-refund
python main.py --scenario B   # Force settlement
python main.py --scenario C   # Proof of payment
python main.py --scenario D   # Escalation
```

---

## Tech Stack

| Component | Technology |
|---|---|
| **LLM** | Groq API (OpenAI-compatible, `gpt-oss-120b`) |
| **Backend** | Python, FastAPI, Uvicorn |
| **Frontend** | Vanilla HTML, CSS, JavaScript |
| **Agent Pattern** | Hand-rolled tool-calling loop (no LangChain/framework) |
| **Communication** | Hinglish (Hindi + English, Roman script) |

---

## Key Features

- **7 System Tools** — Transactions, bank settlement, refunds, force-settlement, CRM, SMS, and escalation — all callable by the agent
- **Code-Level Guardrails** — Refund limits and duplicate-refund checks enforced in code, not left to the model's judgment
- **Calibrated Escalation** — High amounts, repeat complaints, or ambiguous cases are hedged to a human with full context
- **Full Audit Trail** — Every tool call, guardrail block, and decision is logged in order, before the response is even generated
- **Hinglish Responses** — Agent replies in natural Hinglish (Roman script), matching how real support agents communicate
- **Real-Time UI** — Three-panel dashboard shows customer chat, live agent activity, and system state updating in real-time

---

## License

This project is for demonstration and educational purposes.

---

<div align="center">
  <b>Built by <a href="https://github.com/techbhuvi04">techbhuvi04</a></b>
</div>