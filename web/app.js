const SCENARIOS = {
  A: { customer_id: "CUST_A", complaint: "I paid 2400 to Sharma Electronics yesterday, money is gone but shopkeeper says he didn't get it." },
  B: { customer_id: "CUST_B", complaint: "I paid 5600 to Verma Mobile Store 3 days ago and the payment is still stuck, please help." },
  C: { customer_id: "CUST_C", complaint: "I paid 850 to Gupta Kirana Store today, app shows it went through but I want confirmation the shop received it." },
  D: { customer_id: "CUST_D", complaint: "I paid 47000 to Singh Jewellers, money got deducted but transaction failed. This is the second time this is happening." },
  E: { customer_id: "CUST_E", complaint: "I paid 640 to Reddy Medical Store 4 hours ago, payment failed but amount was deducted from my account." },
  F: { customer_id: "CUST_F", complaint: "I paid 3200 to Iyer Textiles 10 hours ago, status still shows pending, please check." },
  G: { customer_id: "CUST_G", complaint: "I paid 31000 to Malhotra Furnishings, transaction failed but money was debited from my account." },
};

const chatBody = document.getElementById("chatBody");
const activityBody = document.getElementById("activityBody");
const complaintInput = document.getElementById("complaintInput");
const sendBtn = document.getElementById("sendBtn");
const resetBtn = document.getElementById("resetBtn");
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");
const landing = document.getElementById("landing");
const consoleView = document.getElementById("console");
const backBtn = document.getElementById("backBtn");
const inboxView = document.getElementById("inbox");
const inboxBody = document.getElementById("inboxBody");
const humanInboxBtn = document.getElementById("humanInboxBtn");
const inboxBackBtn = document.getElementById("inboxBackBtn");
const inboxBadge = document.getElementById("inboxBadge");
const salesView = document.getElementById("sales");
const leadPresets = document.getElementById("leadPresets");
const leadBody = document.getElementById("leadBody");
const salesActivityBody = document.getElementById("salesActivityBody");
const salesStatusIndicator = document.getElementById("salesStatusIndicator");
const salesStatusText = document.getElementById("salesStatusText");
const salesResetBtn = document.getElementById("salesResetBtn");
const salesBackBtn = document.getElementById("salesBackBtn");
const reconView = document.getElementById("recon");
const reconActivityBody = document.getElementById("reconActivityBody");
const reconStatusIndicator = document.getElementById("reconStatusIndicator");
const reconStatusText = document.getElementById("reconStatusText");
const reconResetBtn = document.getElementById("reconResetBtn");
const reconBackBtn = document.getElementById("reconBackBtn");
const runSweepBtn = document.getElementById("runSweepBtn");

// Role selector
const roleUserCard = document.getElementById("roleUserCard");
const roleMerchantCard = document.getElementById("roleMerchantCard");
const roleBusinessCard = document.getElementById("roleBusinessCard");

// Login screen
const loginView = document.getElementById("login");
const loginForm = document.getElementById("loginForm");
const loginBackBtn = document.getElementById("loginBackBtn");
const loginRoleIcon = document.getElementById("loginRoleIcon");
const loginRoleTitle = document.getElementById("loginRoleTitle");

// Merchant workspace
const merchantView = document.getElementById("merchant");
const merchantBackBtn = document.getElementById("merchantBackBtn");
const merchantResetBtn = document.getElementById("merchantResetBtn");
const merchantStatusIndicator = document.getElementById("merchantStatusIndicator");
const merchantStatusText = document.getElementById("merchantStatusText");
const merchantPicker = document.getElementById("merchantPicker");
const merchantBriefWrap = document.getElementById("merchantBriefWrap");
const merchantChatBody = document.getElementById("merchantChatBody");
const merchantQueryInput = document.getElementById("merchantQueryInput");
const merchantQuerySendBtn = document.getElementById("merchantQuerySendBtn");
const merchantActivityBody = document.getElementById("merchantActivityBody");
const merchantSweepBtn = document.getElementById("merchantSweepBtn");
const goPlatformReconBtn = document.getElementById("goPlatformReconBtn");
const humanInboxBtnMerch = document.getElementById("humanInboxBtnMerch");
const inboxBadgeMerch = document.getElementById("inboxBadgeMerch");
const humanInboxBtnBiz = document.getElementById("humanInboxBtnBiz");

// ---------- Home dashboard / assistant-overlay elements ----------
// User workspace
const userTxnList = document.getElementById("userTxnList");
const userAskAiFab = document.getElementById("userAskAiFab");
const userAssistOverlay = document.getElementById("userAssistOverlay");
const userAssistClose = document.getElementById("userAssistClose");
const userExplainToggle = document.getElementById("userExplainToggle");
const userExplainWrap = document.getElementById("userExplainWrap");
const qaGetHelp = document.getElementById("qaGetHelp");
const qaRefundHelp = document.getElementById("qaRefundHelp");
const userScenarioToggle = document.getElementById("userScenarioToggle");
const userScenarioPresets = document.getElementById("userScenarioPresets");

// Merchant workspace
const merchantTxnList = document.getElementById("merchantTxnList");
const merchantExceptionsBadge = document.getElementById("merchantExceptionsBadge");
const merchantAskAiFab = document.getElementById("merchantAskAiFab");
const merchantAssistOverlay = document.getElementById("merchantAssistOverlay");
const merchantAssistClose = document.getElementById("merchantAssistClose");
const merchantExplainToggle = document.getElementById("merchantExplainToggle");
const merchantExplainWrap = document.getElementById("merchantExplainWrap");
const qaRunSweep = document.getElementById("qaRunSweep");
const qaMerchantAskAi = document.getElementById("qaMerchantAskAi");
const qaGoRecon = document.getElementById("qaGoRecon");

// Business Owner workspace
const leadListCards = document.getElementById("leadListCards");
const salesAskAiFab = document.getElementById("salesAskAiFab");
const salesAssistOverlay = document.getElementById("salesAssistOverlay");
const salesAssistClose = document.getElementById("salesAssistClose");
const salesExplainToggle = document.getElementById("salesExplainToggle");
const salesExplainWrap = document.getElementById("salesExplainWrap");
const qaBizAskAi = document.getElementById("qaBizAskAi");

// Generic overlay open/close helper, reused by all three workspaces.
function openAssistOverlay(overlayEl) {
  overlayEl.classList.remove("hidden");
  document.addEventListener("keydown", escCloseHandler);
}
function closeAssistOverlay(overlayEl) {
  overlayEl.classList.add("hidden");
  document.removeEventListener("keydown", escCloseHandler);
}
function escCloseHandler(e) {
  if (e.key !== "Escape") return;
  [userAssistOverlay, merchantAssistOverlay, salesAssistOverlay].forEach(o => {
    if (o && !o.classList.contains("hidden")) closeAssistOverlay(o);
  });
}
function toggleExplain(toggleBtn, wrapEl, label = "How did AI decide this?") {
  const isHidden = wrapEl.classList.contains("hidden");
  wrapEl.classList.toggle("hidden");
  toggleBtn.textContent = isHidden ? `${label} ↑` : `${label} ↓`;
  // The toggle now also governs whether raw technical tool-call detail (args/JSON)
  // stays expanded inside already-rendered readable-step cards.
  wrapEl.querySelectorAll(".card-technical").forEach(el => el.classList.toggle("show", !isHidden));
}

let currentCustomerId = "CUST_A";
let renderedCount = 0;
let pollTimer = null;
let prevStateSnapshot = {};
let inboxBadgeTimer = null;
let currentLeadId = null;
let salesRenderedCount = 0;
let salesPollTimer = null;
let reconRenderedCount = 0;
let reconPollTimer = null;
let currentMerchantId = null;
let merchantRenderedCount = 0;
let merchantPollTimer = null;
let merchantSweepRenderedCount = 0;
let merchantSweepPollTimer = null;
let merchantList = [];

function setStatus(kind, label) {
  statusIndicator.className = `status-indicator ${kind}`;
  statusText.textContent = label;
}

const typingCardRefs = {};

function showTyping(container = activityBody, cardRef = "typingCardEl") {
  if (typingCardRefs[cardRef]) return;
  const el = document.createElement("div");
  el.className = "typing-card";
  el.innerHTML = `<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>`;
  container.appendChild(el);
  typingCardRefs[cardRef] = el;
  maybeAutoscroll(container);
}

function hideTyping(cardRef = "typingCardEl") {
  const el = typingCardRefs[cardRef];
  if (el) {
    el.remove();
    typingCardRefs[cardRef] = null;
  }
}

function isNearBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
}

function maybeAutoscroll(container = activityBody) {
  if (isNearBottom(container)) {
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }
}

function addBubble(role, text) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  chatBody.appendChild(div);
  if (isNearBottom(chatBody)) {
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  }
}

function toolLabel(event) {
  if (event.type === "thinking") return "thinking";
  return event.tool || event.type;
}

// ---------- READABLE STEP TRANSLATION ----------
// UI framing layer only: translates raw tool names into a human-readable action
// description for the DEFAULT view. The raw tool name/args/result stay available
// underneath via the "technical details" toggle (see addActivityCard). This does
// not change what the agent does - it's purely presentational.
const READABLE_STEP_MAP = {
  check_bank_settlement: "Checking bank settlement",
  initiate_refund: "Verifying refund eligibility and processing refund",
  send_customer_message: "Sending customer update",
  send_winback_message: "Sending customer update",
  escalate_to_human: "Escalating to a human specialist",
  escalate_mismatch: "Escalating to a human specialist",
  escalate_merchant_case: "Escalating to a human specialist",
  get_customer_transactions: "Reviewing transaction history",
  get_merchant_transactions: "Reviewing transaction history",
  get_lead: "Reviewing transaction history",
  force_settlement: "Force-settling stuck transaction",
  update_ticket: "Updating case record",
  update_lead_status: "Updating case record",
  issue_discount_coupon: "Checking discount eligibility and issuing offer",
  correct_merchant_status: "Correcting settlement record",
  correct_internal_status: "Correcting settlement record",
  reverse_merchant_collection: "Reversing incorrect collection",
  auto_refund_mismatch: "Reversing incorrect collection",
  mark_reconciled: "Confirming settlement match",
  mark_settlement_confirmed: "Confirming settlement match",
};

function readableStep(event) {
  if (event.type === "thinking") return "Reading context and deciding next step";
  if (event.type === "guardrail_block") return `Guardrail blocked an unsafe action (${event.tool || "action"})`;
  if (event.type === "done") return "Finishing up";
  const tool = event.tool || event.type;
  return READABLE_STEP_MAP[tool] || `Running ${tool}`;
}

// ---------- AUTONOMY METER ----------
// A simple, clearly-commented UI heuristic layered over the EXISTING guardrail
// system - it does NOT enforce anything itself (real enforcement is server-side
// in tools.py/merchant_tools.py/sales_tools.py/recon_tools.py, unchanged).
// Rule: escalation/guardrail_block events -> "High risk, human escalation required".
// Tool names that move money or change status -> "Medium risk, confirmation
// required" (heuristic: any tool whose name implies refund/reversal/settlement
// correction/coupon issuance). Everything else (lookups, messages, ticket notes)
// -> "Low risk, auto action allowed".
const MEDIUM_RISK_TOOLS = new Set([
  "initiate_refund", "force_settlement", "issue_discount_coupon",
  "correct_merchant_status", "correct_internal_status",
  "reverse_merchant_collection", "auto_refund_mismatch",
  "mark_reconciled", "mark_settlement_confirmed",
]);

function autonomyTier(event) {
  if (event.type === "escalation" || event.type === "guardrail_block") {
    return { tier: "high", label: "Human escalation required" };
  }
  const tool = event.tool || "";
  if (MEDIUM_RISK_TOOLS.has(tool)) {
    return { tier: "medium", label: "User confirmation required" };
  }
  if (event.type === "tool_call" || event.type === "message_sent") {
    return { tier: "low", label: "Auto action allowed" };
  }
  return null;
}

function parseMaybeJson(obj) {
  if (typeof obj === "string") {
    try { return JSON.parse(obj); } catch { return obj; }
  }
  return obj;
}

function renderJson(obj, pretty) {
  const parsed = parseMaybeJson(obj);
  if (parsed === null || parsed === undefined) return "";
  if (typeof parsed === "string") return parsed;
  return JSON.stringify(parsed, null, pretty ? 2 : 0);
}

function addJsonBlock(parent, label, value) {
  const group = document.createElement("div");
  group.className = "card-json-group";

  const labelEl = document.createElement("div");
  labelEl.className = "card-json-label";
  labelEl.textContent = label;
  group.appendChild(labelEl);

  const block = document.createElement("div");
  block.className = "card-json";
  block.textContent = renderJson(value, false);
  block.title = "Click to expand";
  block.addEventListener("click", () => {
    block.classList.toggle("expanded");
    block.textContent = renderJson(value, block.classList.contains("expanded"));
  });
  group.appendChild(block);

  parent.appendChild(group);
}

function addActivityCard(event, container = activityBody, cardRef = "typingCardEl") {
  const isError = event.type === "done" && event.result && event.result.status === "error";
  const card = document.createElement("div");
  card.className = `card ${isError ? "guardrail_block" : event.type}`;

  const head = document.createElement("div");
  head.className = "card-head";

  const tool = document.createElement("span");
  tool.className = "card-tool";
  tool.textContent = toolLabel(event);
  head.appendChild(tool);

  const autonomy = autonomyTier(event);
  if (autonomy) {
    const chip = document.createElement("span");
    chip.className = `autonomy-chip ${autonomy.tier}`;
    chip.textContent = autonomy.label;
    head.appendChild(chip);
  }

  if (event.latency_ms !== null && event.latency_ms !== undefined) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = `${event.latency_ms}ms`;
    head.appendChild(badge);
  }
  card.appendChild(head);

  // Readable step is the DEFAULT view.
  if (event.type !== "thinking" && event.type !== "done") {
    const readable = document.createElement("div");
    readable.className = "card-readable";
    readable.textContent = readableStep(event);
    card.appendChild(readable);
  }

  // Raw technical detail (tool name already shown via .card-tool, plus args/result)
  // lives in a collapsible block that the explainability toggle expands/collapses.
  const tech = document.createElement("div");
  tech.className = "card-technical";
  if (event.type === "thinking") {
    const p = document.createElement("div");
    p.textContent = event.result;
    card.appendChild(p);
  } else if (event.type === "done") {
    addJsonBlock(card, "result", event.result);
  } else {
    if (event.args) addJsonBlock(tech, "args", event.args);
    addJsonBlock(tech, "result", event.result);
    card.appendChild(tech);
  }

  const typingEl = typingCardRefs[cardRef];
  if (typingEl) {
    container.insertBefore(card, typingEl);
  } else {
    container.appendChild(card);
  }
  maybeAutoscroll(container);
}

function flash(box) {
  box.querySelectorAll(".kv").forEach(row => {
    row.classList.add("flash");
    setTimeout(() => row.classList.remove("flash"), 600);
  });
}

function renderTicket(ticket) {
  const box = document.getElementById("ticketBox");
  const before = box.innerHTML;
  if (!ticket) {
    box.innerHTML = `<h3>Ticket</h3><div class="kv">No ticket yet</div>`;
  } else {
    const notes = (ticket.notes || []).map(n => `<div class="kv">&bull; ${escapeHtml(n)}</div>`).join("");
    box.innerHTML = `<h3>Ticket</h3>
      <div class="kv"><span class="k">${ticket.ticket_id}</span>
      <span class="status-pill ${ticket.status}">${ticket.status}</span></div>
      ${notes}`;
  }
  if (box.innerHTML !== before) flash(box);
}

function renderTransactions(transactions) {
  const box = document.getElementById("txnBox");
  const before = box.innerHTML;
  if (!transactions || transactions.length === 0) {
    box.innerHTML = `<h3>Transactions</h3><div class="kv">No data</div>`;
  } else {
    const rows = transactions.map(t => `
      <div class="kv">
        <span class="k">${t.txn_id}</span> Rs.${Number(t.amount).toLocaleString()} &middot; ${escapeHtml(t.merchant_name)}<br>
        <span class="k">status:</span> ${t.status} &middot; <span class="k">settlement:</span> ${t.settlement_status || "-"}
      </div>`).join("<hr style='border-color:var(--border);margin:6px 0'>");
    box.innerHTML = `<h3>Transactions</h3>${rows}`;
  }
  if (box.innerHTML !== before) flash(box);
}

function renderRefunds(refunds) {
  const box = document.getElementById("refundBox");
  const before = box.innerHTML;
  const entries = Object.values(refunds || {});
  if (entries.length === 0) {
    box.innerHTML = `<h3>Refunds</h3><div class="kv">None</div>`;
  } else {
    const rows = entries.map(r => `
      <div class="kv"><span class="k">${r.refund_id}</span> Rs.${Number(r.amount).toLocaleString()} &middot; ${r.status} &middot; ETA ${r.eta_hours}h</div>
    `).join("");
    box.innerHTML = `<h3>Refunds</h3>${rows}`;
  }
  if (box.innerHTML !== before) flash(box);
}

function renderSms(smsOutbox) {
  const box = document.getElementById("smsBox");
  const before = box.innerHTML;
  if (!smsOutbox || smsOutbox.length === 0) {
    box.innerHTML = `<h3>SMS Outbox</h3><div class="kv">Empty</div>`;
  } else {
    const rows = smsOutbox.map(m => `<div class="sms-item">${escapeHtml(m.message)}</div>`).join("");
    box.innerHTML = `<h3>SMS Outbox</h3>${rows}`;
  }
  if (box.innerHTML !== before) flash(box);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function humanFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderState(state) {
  renderTicket(state.ticket);
  renderTransactions(state.transactions);
  renderRefunds(state.refunds);
  renderSms(state.sms_outbox);
}

// ---------- TOASTS ----------
const toastStack = document.getElementById("toastStack");
function showToast(message) {
  if (!toastStack) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<svg><use href="#ic-check"/></svg><span></span>`;
  el.querySelector("span").textContent = message;
  toastStack.appendChild(el);
  setTimeout(() => {
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

// ---------- CONFIRMATION MODAL ----------
// Real modal component: cancel aborts (never calls the backend), confirm proceeds
// with the existing flow unchanged. Used before quick actions that trigger a real
// simulated money-moving sales run.
const confirmModal = document.getElementById("confirmModal");
const confirmModalTitle = document.getElementById("confirmModalTitle");
const confirmModalBody = document.getElementById("confirmModalBody");
const confirmModalCancel = document.getElementById("confirmModalCancel");
const confirmModalConfirm = document.getElementById("confirmModalConfirm");
let confirmModalResolver = null;

function askConfirm(title, body) {
  return new Promise(resolve => {
    confirmModalTitle.textContent = title;
    confirmModalBody.textContent = body;
    confirmModal.classList.remove("hidden");
    confirmModalResolver = resolve;
  });
}
function closeConfirmModal(result) {
  confirmModal.classList.add("hidden");
  if (confirmModalResolver) { confirmModalResolver(result); confirmModalResolver = null; }
}
confirmModalCancel.addEventListener("click", () => closeConfirmModal(false));
confirmModalConfirm.addEventListener("click", () => closeConfirmModal(true));
confirmModal.addEventListener("click", (e) => { if (e.target === confirmModal) closeConfirmModal(false); });

// ---------- SIDEBAR (collapse toggle + nav-active state) ----------
function wireSidebarToggle(toggleBtn, appEl) {
  if (!toggleBtn) return;
  toggleBtn.addEventListener("click", () => appEl.classList.toggle("sidebar-collapsed"));
}
wireSidebarToggle(document.getElementById("userSidebarToggle"), consoleView);
wireSidebarToggle(document.getElementById("salesSidebarToggle"), salesView);
wireSidebarToggle(document.getElementById("merchantSidebarToggle"), merchantView);

function setActiveSidebarItem(navItems, activeId) {
  navItems.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("active", id === activeId);
  });
}

// ---------- ATTACHMENTS (paperclip, drag-drop, sample attach) ----------
// Client-side only: TXT/CSV/JSON get a real text preview (FileReader.readAsText,
// truncated to 2000 chars) sent to the backend as attachment context. PDF/image
// only send metadata - no OCR or content extraction is implemented or claimed.
const ACCEPTED_TYPES = {
  "image/png": "image", "image/jpeg": "image", "image/webp": "image",
  "application/pdf": "pdf",
  "text/plain": "text", "text/csv": "text", "application/json": "text",
};
const ACCEPTED_EXT = { png: "image", jpg: "image", jpeg: "image", webp: "image", pdf: "pdf", txt: "text", csv: "text", json: "text" };
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const TEXT_PREVIEW_LIMIT = 2000;

function classifyFile(file) {
  if (ACCEPTED_TYPES[file.type]) return ACCEPTED_TYPES[file.type];
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return ACCEPTED_EXT[ext] || null;
}

// Per-workspace attachment state: { files: [{file, kind, preview, id}], errorEl, listEl }
function makeAttachmentStore(listElId, errorElId) {
  return { items: [], listEl: document.getElementById(listElId), errorEl: document.getElementById(errorElId) };
}
const userAttachStore = makeAttachmentStore("userAttachments", "userAttachError");
const merchantAttachStore = makeAttachmentStore("merchantAttachments", "merchantAttachError");
const salesAttachStore = makeAttachmentStore("salesAttachments", "salesAttachError");

function attachError(store, msg) {
  store.errorEl.textContent = msg;
  store.errorEl.classList.remove("hidden");
  setTimeout(() => store.errorEl.classList.add("hidden"), 4000);
}

function iconForKind(kind) {
  if (kind === "image") return "#ic-image";
  if (kind === "pdf") return "#ic-pdf";
  return "#ic-doc";
}

async function addFilesToStore(store, fileList) {
  const files = Array.from(fileList);
  for (const file of files) {
    if (store.items.length >= MAX_FILES) {
      attachError(store, `You can attach at most ${MAX_FILES} files.`);
      break;
    }
    const kind = classifyFile(file);
    if (!kind) {
      attachError(store, `"${file.name}" isn't a supported type. Use PNG/JPG/WEBP, PDF, TXT, CSV, or JSON.`);
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      attachError(store, `"${file.name}" is over the 10 MB limit.`);
      continue;
    }
    const item = { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, file, kind, preview: null, thumbUrl: null };
    if (kind === "image") {
      try { item.thumbUrl = URL.createObjectURL(file); } catch (e) { /* best effort */ }
    } else if (kind === "text") {
      try {
        item.preview = await readTextPreview(file);
      } catch (e) { /* preview is best-effort; metadata still attaches */ }
    }
    store.items.push(item);
  }
  renderAttachStore(store);
}

function readTextPreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").slice(0, TEXT_PREVIEW_LIMIT));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function renderAttachStore(store) {
  store.listEl.innerHTML = "";
  store.items.forEach(item => {
    const chip = document.createElement("div");
    chip.className = "attach-chip";
    const thumb = item.kind === "image" && item.thumbUrl
      ? `<img class="attach-chip-thumb" src="${item.thumbUrl}" alt="">`
      : `<span class="attach-chip-icon"><svg><use href="${iconForKind(item.kind)}"/></svg></span>`;
    chip.innerHTML = `
      ${thumb}
      <span class="attach-chip-meta">
        <span class="attach-chip-name">${escapeHtml(item.file.name)}</span>
        <span class="attach-chip-size">${humanFileSize(item.file.size)} &middot; ${item.kind === "text" && item.preview ? "DhanAI reviewed attached context" : "DhanAI has the file details"}</span>
      </span>
      <button class="attach-chip-remove" aria-label="Remove ${escapeHtml(item.file.name)}"><svg width="12" height="12"><use href="#ic-close"/></svg></button>
    `;
    chip.querySelector(".attach-chip-remove").addEventListener("click", () => {
      store.items = store.items.filter(i => i.id !== item.id);
      renderAttachStore(store);
    });
    store.listEl.appendChild(chip);
  });
}

function attachmentsPayload(store) {
  if (!store.items.length) return undefined;
  return store.items.map(item => ({
    filename: item.file.name,
    type: item.file.type || `file/${item.kind}`,
    size: item.file.size,
    text_preview: item.preview || null,
  }));
}

function clearAttachStore(store) {
  store.items = [];
  renderAttachStore(store);
}

function wireAttachUI(fileInputId, attachBtnId, panelEl, store, sampleBtnId, sampleFile) {
  const fileInput = document.getElementById(fileInputId);
  const attachBtn = document.getElementById(attachBtnId);
  if (attachBtn && fileInput) {
    attachBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      addFilesToStore(store, fileInput.files);
      fileInput.value = "";
    });
  }
  if (panelEl) {
    panelEl.addEventListener("dragover", (e) => { e.preventDefault(); panelEl.classList.add("drag-over"); });
    panelEl.addEventListener("dragleave", (e) => { if (e.target === panelEl) panelEl.classList.remove("drag-over"); });
    panelEl.addEventListener("drop", (e) => {
      e.preventDefault();
      panelEl.classList.remove("drag-over");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        addFilesToStore(store, e.dataTransfer.files);
      }
    });
  }
  const sampleBtn = document.getElementById(sampleBtnId);
  if (sampleBtn) {
    sampleBtn.addEventListener("click", () => {
      const blob = new Blob([sampleFile.content], { type: sampleFile.type });
      const file = new File([blob], sampleFile.name, { type: sampleFile.type });
      addFilesToStore(store, [file]);
    });
  }
}

const DEMO_USER_CSV = "txn_id,merchant,amount,status\nTXN2201,Sharma Electronics,2400,FAILED\nTXN2202,Gupta Kirana Store,850,SUCCESS\nTXN2203,Iyer Textiles,3200,PENDING\n";
const DEMO_MERCHANT_CSV = "mtxn_id,payer,amount,collection_status,settlement_status\nMTXN_101,Ramesh K,1200,COLLECTED,PENDING\nMTXN_102,Sunita P,3400,COLLECTED,SETTLED\n";
const DEMO_BIZ_CSV = "lead_id,merchant,cart_value,status\nLEAD_S1,Fashion Hub,4200,CART_ABANDONED\nLEAD_S2,Home Decor Co,1800,PAYMENT_FAILED\n";

wireAttachUI("userFileInput", "userAttachBtn", document.getElementById("userAssistPanel"), userAttachStore, "userSampleAttachBtn",
  { name: "demo-transactions.csv", type: "text/csv", content: DEMO_USER_CSV });
wireAttachUI("merchantFileInput", "merchantAttachBtn", document.getElementById("merchantAssistPanel"), merchantAttachStore, "merchantSampleAttachBtn",
  { name: "demo-settlement-report.csv", type: "text/csv", content: DEMO_MERCHANT_CSV });
wireAttachUI(null, null, document.getElementById("salesAssistPanel"), salesAttachStore, "salesSampleAttachBtn",
  { name: "demo-campaign-report.csv", type: "text/csv", content: DEMO_BIZ_CSV });

// ---------- VOICE INPUT (Web Speech API) ----------
// Real browser speech recognition wiring - feature-detected at first mic-button
// click (and again lazily per workspace), never simulated. If unavailable, shows
// a non-blocking message and never pretends to listen.
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

function makeVoiceController({ micBtnId, statusRowId, timerElId, stopBtnId, unsupportedElId, langSelectId, targetInputEl }) {
  const micBtn = document.getElementById(micBtnId);
  const statusRow = document.getElementById(statusRowId);
  const timerEl = document.getElementById(timerElId);
  const stopBtn = document.getElementById(stopBtnId);
  const unsupportedEl = document.getElementById(unsupportedElId);
  const langSelect = document.getElementById(langSelectId);
  if (!micBtn) return;

  let recognition = null;
  let listening = false;
  let startedAt = null;
  let timerInterval = null;
  let interimBase = "";

  function fmtElapsed(ms) {
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function stopListening() {
    listening = false;
    if (recognition) { try { recognition.stop(); } catch (e) { /* already stopped */ } }
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    statusRow.classList.remove("active");
    micBtn.classList.remove("mic-active");
  }

  micBtn.addEventListener("click", () => {
    if (!SpeechRecognitionCtor) {
      unsupportedEl.classList.add("show");
      setTimeout(() => unsupportedEl.classList.remove("show"), 5000);
      return;
    }
    if (listening) { stopListening(); return; }

    recognition = new SpeechRecognitionCtor();
    recognition.lang = langSelect ? langSelect.value : "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    interimBase = targetInputEl.value ? targetInputEl.value + " " : "";
    listening = true;
    startedAt = Date.now();
    statusRow.classList.add("active");
    micBtn.classList.add("mic-active");
    timerEl.textContent = "00:00";
    timerInterval = setInterval(() => { timerEl.textContent = fmtElapsed(Date.now() - startedAt); }, 500);

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText) interimBase += finalText;
      targetInputEl.value = (interimBase + interimText).trim();
    };
    recognition.onerror = () => { stopListening(); };
    recognition.onend = () => { stopListening(); };

    try { recognition.start(); } catch (e) { stopListening(); }
  });

  if (stopBtn) stopBtn.addEventListener("click", stopListening);
}

makeVoiceController({
  micBtnId: "userMicBtn", statusRowId: "userVoiceStatus", timerElId: "userVoiceTimer",
  stopBtnId: "userVoiceStopBtn", unsupportedElId: "userVoiceUnsupported", langSelectId: "userVoiceLang",
  targetInputEl: complaintInput,
});
makeVoiceController({
  micBtnId: "merchantMicBtn", statusRowId: "merchantVoiceStatus", timerElId: "merchantVoiceTimer",
  stopBtnId: "merchantVoiceStopBtn", unsupportedElId: "merchantVoiceUnsupported", langSelectId: "merchantVoiceLang",
  targetInputEl: merchantQueryInput,
});

// ---------- Agent status indicator inside the drawer ----------
function setAgentDrawerState(stateElId, working) {
  const el = document.getElementById(stateElId);
  if (!el) return;
  el.classList.toggle("working", working);
  el.querySelector(".state-label").textContent = working ? "DhanAI is working..." : "DhanAI is ready";
}

// ---------- PERSONAL AI BRIEF (Paytm User workspace) ----------
// Deterministic - fetched from GET /api/user/{customer_id}/brief, no LLM call involved.
const USER_DEMO_NAMES = { CUST_A: "Bhuvi", CUST_B: "Bhuvi", CUST_C: "Bhuvi", CUST_D: "Bhuvi", CUST_E: "Bhuvi", CUST_F: "Bhuvi", CUST_G: "Bhuvi" };

async function loadUserBrief(customerId) {
  const wrap = document.getElementById("userBriefWrap");
  const greet = document.getElementById("userGreetingTitle");
  if (greet) greet.textContent = `Good morning, ${USER_DEMO_NAMES[customerId] || "there"}`;
  wrap.innerHTML = `<div class="panel-loading"><div class="skeleton skeleton-line w-40"></div><div class="skeleton skeleton-line w-80"></div></div>`;
  try {
    const res = await fetch(`/api/user/${customerId}/brief`);
    const brief = await res.json();
    renderUserBrief(brief);
  } catch (e) {
    wrap.innerHTML = `<div class="panel-error">Couldn't load your brief right now.</div>`;
  }
}

let latestUserBrief = null;

function renderUserBrief(brief) {
  latestUserBrief = brief;
  const wrap = document.getElementById("userBriefWrap");
  const mockBalance = `<div class="balance-mock-amount">Rs.12,480.50</div><div class="balance-mock-label">DhanAI linked-account balance (demo figure, not a live bank balance)</div>`;
  if (!brief.has_data) {
    wrap.innerHTML = `<h3>Your DhanAI Balance</h3>${mockBalance}<div class="brief-list-item" style="border-top:none; color:rgba(255,255,255,.85);">${escapeHtml(brief.proactive_message)}</div>`;
    renderUserTxnList(brief);
    return;
  }
  const s = brief.spend_summary;

  wrap.innerHTML = `
    <h3>Your DhanAI Balance</h3>
    ${mockBalance}
    <div class="brief-message">${escapeHtml(brief.proactive_message)}</div>
    <div class="brief-stats">
      <div class="brief-stat"><div class="num">Rs.${Number(s.total_spend_7d).toLocaleString("en-IN")}</div><div class="label">Spend, 7d</div></div>
      <div class="brief-stat"><div class="num">Rs.${Number(s.total_spend_30d).toLocaleString("en-IN")}</div><div class="label">Spend, 30d</div></div>
      <div class="brief-stat"><div class="num">${s.transaction_count_30d}</div><div class="label">Txns, 30d</div></div>
    </div>
    <div class="demo-note">Demo balance shown for illustration &mdash; there is no live bank-balance endpoint in this build.</div>`;
  renderUserTxnList(brief);
}

// ---------- RECENT TRANSACTIONS LIST (Paytm User home) ----------
// Built client-side from the deterministic brief's needs_attention (issues) and
// refund_status (already-resolved items) - no new backend endpoint invented.
// Rows with an issue are tappable and open the assistant panel pre-filled with the
// matching SCENARIOS complaint (matched by customer_id), reusing existing flows.
// Each row also has a kebab menu offering "Ask DhanAI about this".
const GUARDIAN_KIND_LABEL = { safe_refund: "Safe refund", safe_action: "Safe action", escalation: "Escalated", pending_stuck: "Pending stuck" };
const GUARDIAN_KIND_CLASS = { safe_refund: "badge-green", safe_action: "badge-green", escalation: "badge-red", pending_stuck: "badge-amber" };

async function runGuardianScan() {
  const btn = document.getElementById("runGuardianScanBtn");
  const resultsEl = document.getElementById("guardianResults");
  if (!btn || !resultsEl) return;
  btn.disabled = true;
  resultsEl.innerHTML = `<div class="panel-loading">Scanning your account</div>`;
  try {
    const res = await fetch(`/api/user/${currentCustomerId}/proactive-scan`);
    const data = await res.json();
    renderGuardianResults(data);
    if (typeof updateImpactMetrics === 'function') updateImpactMetrics();
  } catch (e) {
    resultsEl.innerHTML = `<div class="panel-error">Couldn't run the scan.</div>`;
  }
  btn.disabled = false;
}

function renderGuardianResults(data) {
  const resultsEl = document.getElementById("guardianResults");
  if (!resultsEl) return;
  const issues = data.issues || [];
  const alerts = data.alerts || [];
  const summary = data.summary || {};

  // Seeded alerts first
  let html = alerts.map(a => `
    <div class="brief-list-item" style="border-left:3px solid var(--accent-primary);padding-left:10px;margin-bottom:6px">
      <div style="font-size:.82rem;opacity:.7">${escapeHtml(a.timestamp || '')}</div>
      <div>${escapeHtml(a.message)}</div>
    </div>
  `).join('');

  if (!issues.length) {
    html += `<div class="brief-list-item">Scanned ${summary.total_scanned || 0} transaction(s) &mdash; no proactive action needed.</div>`;
    resultsEl.innerHTML = html;
    return;
  }

  // Summary bar
  html += `<div class="brief-list-item" style="display:flex;gap:10px;flex-wrap:wrap;margin:8px 0">
    <span class="status-badge badge-green">${summary.safe_refund || 0} safe refund</span>
    <span class="status-badge badge-amber">${summary.pending_stuck || 0} pending stuck</span>
    <span class="status-badge badge-red">${summary.escalation || 0} escalation</span>
    <span style="opacity:.6;font-size:.8rem">${summary.total_scanned || 0} scanned</span>
  </div>`;

  // Each issue with timeline
  html += issues.map(issue => {
    const sevClass = issue.severity === 'high' ? 'badge-red' : issue.severity === 'medium' ? 'badge-amber' : 'badge-green';
    const catLabel = GUARDIAN_KIND_LABEL[issue.category] || issue.category;
    const timeline = (issue.timeline || []).map(t => {
      const icon = t.status === 'done' ? '✅' : t.status === 'ready' ? '🔧' : t.status === 'waiting' ? '⏳' : '⏸';
      return `${icon} ${escapeHtml(t.step)}: ${escapeHtml(t.detail)}`;
    }).join('<br>');
    return `
      <div class="brief-list-item" style="margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span class="status-badge ${sevClass}">${escapeHtml(catLabel)}</span>
          <strong>${escapeHtml(issue.title)}</strong>
        </div>
        <div class="txn-sub">${escapeHtml(issue.description)}</div>
        <div class="txn-sub" style="margin-top:4px;line-height:1.6;font-size:.78rem">${timeline}</div>
      </div>
    `;
  }).join('');

  resultsEl.innerHTML = html;
}

document.getElementById("runGuardianScanBtn") && document.getElementById("runGuardianScanBtn").addEventListener("click", runGuardianScan);

function renderUserTxnList(brief) {
  if (!userTxnList) return;
  if (!brief.has_data) {
    userTxnList.innerHTML = emptyStateHtml("No recent transactions", "Once you make a payment, it'll show up here.");
    return;
  }

  // Build a lookup so transactions that need attention or have an active refund get
  // the richer status line + tap-to-ask behavior, while the full history (including
  // plain successful payments) still renders underneath - a real transaction list,
  // not just the flagged subset.
  const attentionByTxnId = {};
  (brief.needs_attention || []).forEach(a => { attentionByTxnId[a.txn_id] = a; });
  const refundByTxnId = {};
  (brief.refund_status || []).forEach(r => { refundByTxnId[r.txn_id] = r; });

  const rows = (brief.recent_transactions || []).map(t => {
    const attention = attentionByTxnId[t.txn_id];
    const refund = refundByTxnId[t.txn_id];
    if (attention) {
      const isFailed = /failed/i.test(attention.issue);
      return {
        merchant: t.merchant_name, amount: t.amount, txn_id: t.txn_id,
        sub: attention.issue, badgeClass: isFailed ? "badge-red" : "badge-amber",
        badgeText: isFailed ? "FAILED" : "PENDING",
        actionable: true,
      };
    }
    if (refund) {
      return {
        merchant: t.merchant_name, amount: t.amount, txn_id: t.txn_id,
        sub: `Refund ${refund.status} · ETA ${refund.eta_hours}h`, badgeClass: "badge-green",
        badgeText: refund.status === "COMPLETED" ? "REFUNDED" : "SUCCESS",
        actionable: false,
      };
    }
    return {
      merchant: t.merchant_name, amount: t.amount, txn_id: t.txn_id,
      sub: new Date(t.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      badgeClass: t.status === "SUCCESS" ? "badge-green" : "badge-amber",
      badgeText: t.status,
      actionable: false,
    };
  });

  if (!rows.length) {
    userTxnList.innerHTML = emptyStateHtml("No recent transactions", "Once you make a payment, it'll show up here.");
    return;
  }

  userTxnList.innerHTML = rows.map((r, i) => `
    <div class="txn-row ${r.actionable ? "" : "not-actionable"}" data-idx="${i}" style="animation-delay:${i * 40}ms">
      <span class="txn-icon"><svg><use href="#ic-shop"/></svg></span>
      <div class="txn-main">
        <div class="txn-merchant">${escapeHtml(r.merchant)}</div>
        <div class="txn-sub">${escapeHtml(r.sub)}</div>
      </div>
      <div class="txn-side">
        <div class="txn-amount">Rs.${Number(r.amount).toLocaleString("en-IN")}</div>
        <span class="status-badge ${r.badgeClass}">${r.badgeText}</span>
      </div>
      ${r.actionable ? `<button class="txn-kebab" data-kebab-idx="${i}" aria-label="More options"><svg><use href="#ic-kebab"/></svg></button>` : ""}
    </div>`).join("");

  userTxnList.querySelectorAll(".txn-row").forEach((el, i) => {
    if (!rows[i].actionable) return;
    el.addEventListener("click", (e) => {
      if (e.target.closest(".txn-kebab")) return;
      askAboutTxn(rows[i]);
    });
  });
  userTxnList.querySelectorAll(".txn-kebab").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      askAboutTxn(rows[Number(btn.dataset.kebabIdx)]);
    });
  });
}

function emptyStateHtml(title, sub) {
  return `<div class="empty-state">
    <svg><use href="#ic-txn"/></svg>
    <div class="empty-state-title">${escapeHtml(title)}</div>
    <div class="empty-state-sub">${escapeHtml(sub)}</div>
  </div>`;
}

function askAboutTxn(row) {
  const scenario = SCENARIOS[currentCustomerId.replace("CUST_", "")];
  openAssistOverlay(userAssistOverlay);
  const complaint = scenario ? scenario.complaint :
    `I have an issue with my Rs.${row.amount} payment to ${row.merchant} (${row.sub}).`;
  startRun(currentCustomerId, complaint);
}

async function refreshStats() {
  const box = document.getElementById("statsBox");
  const before = box.innerHTML;
  try {
    const res = await fetch("/api/stats");
    const s = await res.json();
    if (!s.total_runs) {
      box.innerHTML = `<h3>Session Outcomes</h3><div class="kv">No runs yet</div>`;
    } else {
      box.innerHTML = `<h3>Session Outcomes</h3>
        <div class="kv"><span class="k">Runs</span> ${s.total_runs}</div>
        <div class="kv"><span class="k">Resolved</span> ${s.resolved} (${s.resolution_rate}%)</div>
        <div class="kv"><span class="k">Escalated</span> ${s.escalated} (${s.escalation_rate}%)</div>
        <div class="kv"><span class="k">Guardrail blocks</span> ${s.guardrail_blocks}</div>
        <div class="kv"><span class="k">Avg steps</span> ${s.avg_steps}</div>
        <div class="kv"><span class="k">Avg tool latency</span> ${s.avg_latency_ms ?? "-"} ms</div>`;
    }
  } catch (e) {
    box.innerHTML = `<h3>Session Outcomes</h3><div class="kv">Unavailable</div>`;
  }
  if (box.innerHTML !== before) flash(box);
}

async function refreshInboxBadge() {
  try {
    const res = await fetch("/api/escalations");
    const data = await res.json();
    const n = data.queue.length;
    [inboxBadge, inboxBadgeMerch].forEach(badge => {
      badge.textContent = n;
      badge.classList.toggle("hidden", n === 0);
    });
  } catch (e) { /* badge is best-effort */ }
}

async function loadInboxView() {
  inboxBody.innerHTML = `<div class="inbox-empty">Loading escalation queue...</div>`;
  const res = await fetch("/api/escalations");
  const data = await res.json();
  renderInboxQueue(data.queue);
}

function renderInboxQueue(queue) {
  if (!queue.length) {
    inboxBody.innerHTML = `<div class="inbox-empty">No escalations waiting. The agent handles everything else on its own.</div>`;
    return;
  }
  inboxBody.innerHTML = queue.map(ticket => {
    const esc = ticket.escalation;
    const txnRows = (ticket.transactions || []).slice(0, 3).map(t =>
      `${t.txn_id}  ${escapeHtml(t.merchant_name)}  Rs.${t.amount.toLocaleString("en-IN")}  ${t.status}`
    ).join("\n") || "No recent transactions";
    return `
      <div class="esc-card" data-ticket-id="${ticket.ticket_id}">
        <div class="esc-card-head">
          <div>
            <div class="esc-card-title">${ticket.ticket_id} &middot; ${ticket.customer_id}</div>
            <div class="esc-card-sub">Handed off by the agent &mdash; awaiting human review</div>
          </div>
          <span class="pill ESCALATED">ESCALATED</span>
        </div>
        <div class="esc-field">
          <div class="esc-field-label">Why it was escalated</div>
          <div class="esc-field-value">${escapeHtml(esc.reason)}</div>
        </div>
        <div class="esc-field">
          <div class="esc-field-label">Agent's context summary</div>
          <div class="esc-field-value">${escapeHtml(esc.context_summary)}</div>
        </div>
        <div class="esc-field">
          <div class="esc-field-label">Suggested action</div>
          <div class="esc-field-value">${escapeHtml(esc.suggested_action)}</div>
        </div>
        <div class="esc-field">
          <div class="esc-field-label">Recent transactions</div>
          <div class="esc-txns">${escapeHtml(txnRows)}</div>
        </div>
        <div class="esc-resolve">
          <div class="esc-resolve-field">
            <label for="resnote-${ticket.ticket_id}">Resolution note</label>
            <input type="text" id="resnote-${ticket.ticket_id}" placeholder="e.g. manually refunded after KYC check..." />
          </div>
          <button>Resolve</button>
        </div>
      </div>`;
  }).join("");

  inboxBody.querySelectorAll(".esc-card").forEach(card => {
    const ticketId = card.dataset.ticketId;
    const input = card.querySelector(".esc-resolve input");
    const btn = card.querySelector(".esc-resolve button");
    btn.addEventListener("click", async () => {
      const note = input.value.trim();
      if (!note) { input.focus(); return; }
      btn.disabled = true;
      await fetch(`/api/escalations/${ticketId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution_note: note }),
      });
      await loadInboxView();
      refreshInboxBadge();
      refreshStats();
      showToast("Escalation resolved");
    });
  });
}

let inboxOpenedFrom = consoleView;

function openInbox() {
  inboxOpenedFrom = ALL_WORKSPACE_VIEWS.find(v => !v.classList.contains("hidden")) || consoleView;
  hideAllWorkspaces();
  inboxView.classList.remove("hidden");
  loadInboxView();
  if (inboxBadgeTimer) clearInterval(inboxBadgeTimer);
  inboxBadgeTimer = setInterval(refreshInboxBadge, 3000);
}

function closeInbox() {
  inboxView.classList.add("hidden");
  inboxOpenedFrom.classList.remove("hidden");
  if (inboxBadgeTimer) { clearInterval(inboxBadgeTimer); inboxBadgeTimer = null; }
}

humanInboxBtn.addEventListener("click", openInbox);
humanInboxBtnMerch.addEventListener("click", openInbox);
inboxBackBtn.addEventListener("click", closeInbox);

let currentRunEvents = [];

async function startRun(customerId, complaint) {
  currentCustomerId = customerId;
  renderedCount = 0;
  currentRunEvents = [];
  activityBody.innerHTML = "";
  typingCardRefs.typingCardEl = null;
  removeDecisionCard();
  addBubble("user", complaint);
  sendBtn.disabled = true;
  setStatus("running", "Running");
  setAgentDrawerState("userAgentState", true);
  showTyping();

  const attachments = attachmentsPayload(userAttachStore);
  clearAttachStore(userAttachStore);

  const res = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ complaint, customer_id: customerId, attachments }),
  });
  const { run_id } = await res.json();
  pollEvents(run_id);
}

function pollEvents(runId) {
  if (pollTimer) clearInterval(pollTimer);
  let pollInFlight = false;
  pollTimer = setInterval(async () => {
    if (pollInFlight) return;
    pollInFlight = true;
    const res = await fetch(`/api/runs/${runId}/events?since=${renderedCount}`);
    const data = await res.json();
    pollInFlight = false;

    if (data.events.length > 0) hideTyping();

    let hadError = false;
    for (const event of data.events) {
      addActivityCard(event);
      currentRunEvents.push(event);
      if (event.type === "done") {
        if (event.result && event.result.status === "error") hadError = true;
        const text = (event.result && event.result.final_text) || "Ticket escalated to a human agent.";
        addBubble("agent", text);
      }
    }
    renderedCount += data.events.length;
    renderState(data.state);

    if (data.done) {
      clearInterval(pollTimer);
      pollTimer = null;
      if (typeof updateImpactMetrics === 'function') updateImpactMetrics();
      sendBtn.disabled = false;
      setAgentDrawerState("userAgentState", false);
      const finalStatus = data.state.ticket && data.state.ticket.status;
      if (hadError) setStatus("escalated", "Error");
      else if (finalStatus === "ESCALATED") setStatus("escalated", "Escalated");
      else setStatus("resolved", "Resolved");
      if (!hadError) renderDecisionCard(currentRunEvents, data.state);
      refreshStats();
      refreshInboxBadge();
      loadUserBrief(currentCustomerId);
    } else {
      showTyping();
    }
  }, 400);
}

// ---------- DECISION CARD (explainability) ----------
// Built entirely from the run's own tool-call events and results - nothing here is
// invented, it's a structured read-out of what the agent actually did and found.
const ACTION_TOOL_LABELS = {
  initiate_refund: "Refund initiated",
  force_settlement: "Force-settled pending transaction",
  escalate_to_human: "Escalated to human agent",
  update_ticket: "Ticket updated",
};

function removeDecisionCard() {
  const existing = document.getElementById("decisionCard");
  if (existing) existing.remove();
}

function renderDecisionCard(events, state) {
  removeDecisionCard();

  const toolCalls = events.filter(e => e.type === "tool_call" || e.type === "escalation" || e.type === "message_sent");
  const guardrails = events.filter(e => e.type === "guardrail_block");
  const doneEvent = events.find(e => e.type === "done");
  const finalText = doneEvent && doneEvent.result && doneEvent.result.final_text;

  const actionEvent = events.find(e => e.tool === "initiate_refund" || e.tool === "force_settlement" || e.tool === "escalate_to_human");
  const finalAction = actionEvent ? (ACTION_TOOL_LABELS[actionEvent.tool] || actionEvent.tool) : "Ticket updated, no monetary action taken";

  const wasEscalated = events.some(e => e.type === "escalation");
  // Confidence is derived, not guessed: a clean run with no guardrail friction and a
  // clear resolution path is high confidence; guardrail pushback lowers it; an
  // escalation means the agent itself judged the case ambiguous or high-risk.
  let confidence = "high";
  let confidenceReason = "Resolved via a single clean tool-call path with no guardrail pushback.";
  if (wasEscalated) {
    confidence = "medium";
    confidenceReason = "Agent judged this case ambiguous or high-risk and deferred to a human rather than acting.";
  } else if (guardrails.length > 0) {
    confidence = "medium";
    confidenceReason = `Agent's first attempt was blocked by a guardrail (${guardrails.length}x) before it found a safe path.`;
  }

  const evidence = toolCalls.slice(0, 6).map(e => {
    const label = e.tool || e.type;
    let detail = "";
    try {
      const r = typeof e.result === "string" ? JSON.parse(e.result) : e.result;
      if (r && r.settlement_state) detail = ` &rarr; bank: ${r.settlement_state}`;
      else if (r && r.status) detail = ` &rarr; ${r.status}`;
    } catch (err) { /* non-JSON result, skip detail */ }
    return `<li><code>${escapeHtml(label)}</code>${detail}</li>`;
  }).join("");

  const policyApplied = guardrails.length > 0
    ? guardrails.map(g => `<li>${escapeHtml(g.result)}</li>`).join("")
    : wasEscalated
      ? "<li>Escalation policy: high-value or ambiguous case routed to a human, not auto-resolved.</li>"
      : "<li>No guardrail was triggered - request was within all auto-resolution limits.</li>";

  // Transaction/reference ID and human escalation status, sourced from the run's
  // own state (ticket_id / refund_id already present in state.refunds), not invented.
  const ticketId = state.ticket && state.ticket.ticket_id;
  const refundEntries = Object.values(state.refunds || {});
  const refundId = refundEntries.length ? refundEntries[0].refund_id : null;
  const escalationStatus = wasEscalated ? "Escalated - awaiting human review" : "Not escalated - resolved autonomously";

  const card = document.createElement("div");
  card.className = "decision-card";
  card.id = "decisionCard";
  card.innerHTML = `
    <div class="decision-card-head">
      <span class="decision-card-title">Decision Card</span>
      <span class="confidence-pill ${confidence}">${confidence.toUpperCase()} CONFIDENCE</span>
    </div>
    <div class="decision-row"><div class="drk">Decision</div><div class="drv">${escapeHtml(finalAction)}</div></div>
    <div class="decision-row"><div class="drk">Why</div><div class="drv">${escapeHtml(confidenceReason)}</div></div>
    <div class="decision-row"><div class="drk">Evidence</div><div class="drv"><ul>${evidence || "<li>No tool calls recorded.</li>"}</ul></div></div>
    <div class="decision-row"><div class="drk">Policy applied</div><div class="drv"><ul>${policyApplied}</ul></div></div>
    ${ticketId ? `<div class="decision-row"><div class="drk">Reference ID</div><div class="drv">${escapeHtml(ticketId)}${refundId ? ` &middot; ${escapeHtml(refundId)}` : ""}</div></div>` : ""}
    <div class="decision-row"><div class="drk">Escalation status</div><div class="drv">${escapeHtml(escalationStatus)}</div></div>
    <div class="decision-row"><div class="drk">Final message</div><div class="drv">${escapeHtml(finalText || "-")}</div></div>
    <div class="decision-row">
      <div class="drk">Evidence &amp; Policy</div>
      <div class="drv">
        <button class="explain-toggle" id="policyEvidenceToggle" type="button">Show evidence &amp; policy &darr;</button>
        <div class="hidden" id="policyEvidenceWrap"><div class="panel-loading">Loading policy evidence</div></div>
      </div>
    </div>
  `;
  activityBody.appendChild(card);
  maybeAutoscroll(activityBody);

  loadPolicyEvidence(actionEvent, toolCalls, wasEscalated);
}

async function loadPolicyEvidence(actionEvent, toolCalls, wasEscalated) {
  const toggle = document.getElementById("policyEvidenceToggle");
  const wrap = document.getElementById("policyEvidenceWrap");
  if (!toggle || !wrap) return;
  toggle.addEventListener("click", () => {
    const hidden = wrap.classList.contains("hidden");
    wrap.classList.toggle("hidden");
    toggle.textContent = hidden ? "Hide evidence & policy ↑" : "Show evidence & policy ↓";
  });

  const q = (toolCalls || []).map(e => e.tool || "").join(" ");
  const action = actionEvent ? (actionEvent.tool || "") : "";
  const status = wasEscalated ? "escalate" : "";
  try {
    const res = await fetch(`/api/policy/retrieve?q=${encodeURIComponent(q)}&action=${encodeURIComponent(action)}&status=${encodeURIComponent(status)}`);
    const data = await res.json();
    const policies = data.policies || [];
    const bankEvidence = (toolCalls || []).filter(e => e.tool === "check_bank_settlement" || e.tool === "check_merchant_settlement");
    const evidenceHtml = bankEvidence.length
      ? bankEvidence.map(e => `<li>Bank/transaction evidence: <code>${escapeHtml(e.result || "")}</code></li>`).join("")
      : "<li>No direct bank-settlement lookup in this run.</li>";
    const policyHtml = policies.length
      ? policies.map(p => `<li><strong>${escapeHtml(p.title)}</strong> &mdash; ${escapeHtml(p.description || p.explanation || '')}</li>`).join("")
      : "<li>No matching local policy found for this action.</li>";
    wrap.innerHTML = `
      <div class="brief-list-item"><strong>Evidence considered</strong><ul>${evidenceHtml}</ul></div>
      <div class="brief-list-item"><strong>Retrieved policy</strong><ul>${policyHtml}</ul></div>
      ${policies.length ? `<span class="confidence-pill high">Policy evidence checked</span>` : ""}
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="panel-error">Couldn't load policy evidence.</div>`;
  }
}

sendBtn.addEventListener("click", () => {
  const text = complaintInput.value.trim();
  if (!text) return;
  startRun(currentCustomerId, text);
  complaintInput.value = "";
});

complaintInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

document.querySelectorAll(".preset-btn[data-scenario]").forEach(btn => {
  btn.addEventListener("click", () => {
    const scenario = SCENARIOS[btn.dataset.scenario];
    openAssistOverlay(userAssistOverlay);
    startRun(scenario.customer_id, scenario.complaint);
    loadUserBrief(scenario.customer_id);
  });
});

// Suggested prompt chips insert (and send) their text.
document.querySelectorAll("#userPromptChips .prompt-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    openAssistOverlay(userAssistOverlay);
    startRun(currentCustomerId, chip.dataset.prompt);
  });
});
document.querySelectorAll(".help-chip[data-help-prompt]").forEach(chip => {
  chip.addEventListener("click", () => {
    openAssistOverlay(userAssistOverlay);
    startRun(currentCustomerId, chip.dataset.helpPrompt);
  });
});

resetBtn.addEventListener("click", async () => {
  if (pollTimer) clearInterval(pollTimer);
  await fetch("/api/reset", { method: "POST" });
  if (typeof updateImpactMetrics === 'function') updateImpactMetrics();
  chatBody.innerHTML = "";
  activityBody.innerHTML = "";
  typingCardRefs.typingCardEl = null;
  removeDecisionCard();
  renderedCount = 0;
  sendBtn.disabled = false;
  setStatus("", "Idle");
  renderState({ ticket: null, transactions: [], refunds: {}, sms_outbox: [] });
  refreshStats();
  refreshInboxBadge();
  loadUserBrief(currentCustomerId);
  showToast("Demo state reset");
});
document.getElementById("sbUserReset")?.addEventListener("click", () => resetBtn.click());

// ---------- Paytm User home dashboard wiring ----------
userAskAiFab.addEventListener("click", () => openAssistOverlay(userAssistOverlay));
userAssistClose.addEventListener("click", () => closeAssistOverlay(userAssistOverlay));
userExplainToggle.addEventListener("click", () => toggleExplain(userExplainToggle, userExplainWrap));

qaGetHelp.addEventListener("click", () => openAssistOverlay(userAssistOverlay));
qaRefundHelp.addEventListener("click", () => {
  openAssistOverlay(userAssistOverlay);
  const scenario = SCENARIOS[currentCustomerId.replace("CUST_", "")];
  const complaint = scenario ? scenario.complaint : "I need help with a refund on a recent payment.";
  startRun(currentCustomerId, complaint);
});

// ---------- Paytm User sidebar (desktop) ----------
document.getElementById("sbUserHome").addEventListener("click", () => { closeAssistOverlay(userAssistOverlay); setActiveSidebarItem(["sbUserHome","sbUserPayments","sbUserBills","sbUserAssistant","sbUserSupport","sbUserActivity"], "sbUserHome"); });
document.getElementById("sbUserPayments").addEventListener("click", () => openAssistOverlay(userAssistOverlay));
document.getElementById("sbUserBills").addEventListener("click", () => openAssistOverlay(userAssistOverlay));
document.getElementById("sbUserAssistant").addEventListener("click", () => openAssistOverlay(userAssistOverlay));
document.getElementById("sbUserSupport").addEventListener("click", () => openAssistOverlay(userAssistOverlay));
document.getElementById("sbUserActivity").addEventListener("click", () => openInbox());
document.getElementById("sbUserActivity2")?.addEventListener("click", () => openInbox());
document.getElementById("sbUserSwitchRole").addEventListener("click", () => backBtn.click());
document.getElementById("sbUserSettings").addEventListener("click", () => showToast("Settings coming soon in this demo"));

// ---------- Paytm User bottom nav (5-tab: Home / Activity / Ask DhanAI / Insights / Profile) ----------
const userNavHome = document.getElementById("userNavHome");
const userNavActivity = document.getElementById("userNavActivity");
const userNavAskAi = document.getElementById("userNavAskAi");
const userNavInsights = document.getElementById("userNavInsights");
const userNavProfile = document.getElementById("userNavProfile");

userNavHome.addEventListener("click", () => closeAssistOverlay(userAssistOverlay));
userNavActivity.addEventListener("click", () => openInbox());
userNavAskAi.addEventListener("click", () => openAssistOverlay(userAssistOverlay));
userNavInsights.addEventListener("click", () => openAssistOverlay(userAssistOverlay));
userNavProfile.addEventListener("click", () => backBtn.click());

userScenarioToggle.addEventListener("click", () => {
  const isHidden = userScenarioPresets.classList.contains("hidden");
  userScenarioPresets.classList.toggle("hidden");
  userScenarioToggle.textContent = isHidden ? "Hide demo scenarios ↑" : "Try demo scenarios (A–G) →";
});

// ---------- ROLE SELECTOR / WORKSPACE ROUTER ----------
// One shared shell: every workspace view lives hidden in the DOM until routed to,
// and every workspace's back action returns here rather than closing the app.
const ALL_WORKSPACE_VIEWS = [consoleView, inboxView, salesView, reconView, merchantView];

function hideAllWorkspaces() {
  ALL_WORKSPACE_VIEWS.forEach(v => v.classList.add("hidden"));
}

function openConsole() {
  landing.classList.add("fade-out");
  setTimeout(() => {
    landing.classList.add("hidden");
    document.body.classList.add("console-active");
    hideAllWorkspaces();
    consoleView.classList.remove("hidden");
    consoleView.classList.add("fade-in");
    requestAnimationFrame(() => requestAnimationFrame(() => consoleView.classList.add("show")));
  }, 250);
  loadUserBrief(currentCustomerId);
}

async function backToLanding() {
  if (pollTimer) clearInterval(pollTimer);
  await fetch("/api/reset", { method: "POST" });
  if (typeof updateImpactMetrics === 'function') updateImpactMetrics();
  hideAllWorkspaces();
  consoleView.classList.remove("fade-in", "show");
  document.body.classList.remove("console-active");
  landing.classList.remove("hidden", "fade-out");
  chatBody.innerHTML = "";
  activityBody.innerHTML = "";
  typingCardRefs.typingCardEl = null;
  renderedCount = 0;
  sendBtn.disabled = false;
  setStatus("", "Idle");
  renderState({ ticket: null, transactions: [], refunds: {}, sms_outbox: [] });
  closeAssistOverlay(userAssistOverlay);
}

// ---------- LOGIN GATE ----------
// Role card tap opens a mock login screen for that role first; submitting the
// form (any values, even empty, are accepted - there's no real backend auth)
// routes into the same workspace-opening functions the role cards used to call
// directly, so the dashboard-first interaction model is unchanged past this point.
const ROLE_LOGIN_CONFIG = {
  user: { icon: "#ic-user", title: "Login as Paytm User", open: () => { openConsole(); refreshStats(); refreshInboxBadge(); } },
  merchant: { icon: "#ic-shop", title: "Login as Merchant", open: () => { openMerchant(); } },
  business: { icon: "#ic-growth", title: "Login as Business Owner", open: () => { openSales(); } },
};
let pendingLoginRole = "user";

function openLogin(role) {
  pendingLoginRole = role;
  const cfg = ROLE_LOGIN_CONFIG[role] || ROLE_LOGIN_CONFIG.user;
  loginRoleIcon.innerHTML = `<svg><use href="${cfg.icon}"/></svg>`;
  loginRoleTitle.textContent = cfg.title;
  loginForm.reset();
  landing.classList.add("fade-out");
  setTimeout(() => {
    landing.classList.add("hidden");
    landing.classList.remove("fade-out");
    loginView.classList.remove("hidden");
  }, 250);
}

function closeLoginToLanding() {
  loginView.classList.add("hidden");
  landing.classList.remove("hidden", "fade-out");
}

loginBackBtn.addEventListener("click", closeLoginToLanding);

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  loginView.classList.add("hidden");
  const cfg = ROLE_LOGIN_CONFIG[pendingLoginRole] || ROLE_LOGIN_CONFIG.user;
  cfg.open();
});

roleUserCard.addEventListener("click", () => openLogin("user"));
backBtn.addEventListener("click", backToLanding);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add("in-view"), i * 60);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

// ---------- LANDING: header/hero CTAs + final CTA role links ----------
// These are new landing-only controls layered on top of the existing role-card
// routing above; they never duplicate the routing logic, only call into it.
(function () {
  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openDhanAiBtn = document.getElementById("openDhanAiBtn");
  const heroChooseWorkspaceBtn = document.getElementById("heroChooseWorkspaceBtn");
  const heroWatchDemoBtn = document.getElementById("heroWatchDemoBtn");
  const finalCtaBtn = document.getElementById("finalCtaBtn");
  const demoPanel = document.getElementById("demoPanel");

  if (openDhanAiBtn) openDhanAiBtn.addEventListener("click", () => scrollToId("workspace-select"));
  if (heroChooseWorkspaceBtn) heroChooseWorkspaceBtn.addEventListener("click", () => scrollToId("workspace-select"));
  if (finalCtaBtn) finalCtaBtn.addEventListener("click", () => scrollToId("workspace-select"));
  if (heroWatchDemoBtn && demoPanel) {
    heroWatchDemoBtn.addEventListener("click", () => {
      demoPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      demoPanel.classList.add("demo-panel-highlight");
      setTimeout(() => demoPanel.classList.remove("demo-panel-highlight"), 900);
    });
  }

  // Final CTA section's small role links reuse the exact same openLogin() routing
  // path as the main workspace-selector cards - no separate implementation.
  const finalRoleUser = document.getElementById("finalRoleUser");
  const finalRoleMerchant = document.getElementById("finalRoleMerchant");
  const finalRoleBusiness = document.getElementById("finalRoleBusiness");
  if (finalRoleUser) finalRoleUser.addEventListener("click", () => openLogin("user"));
  if (finalRoleMerchant) finalRoleMerchant.addEventListener("click", () => openLogin("merchant"));
  if (finalRoleBusiness) finalRoleBusiness.addEventListener("click", () => openLogin("business"));

  // Demo panel step progression: a lightweight, self-contained visual loop for the
  // static hero "DhanAI in action" panel - not wired to any real backend call.
  const steps = document.querySelectorAll("#demoSteps .demo-step");
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (steps.length) {
    if (prefersReducedMotion) {
      steps.forEach(s => s.classList.add("done"));
    } else {
      let i = 0;
      const revealNext = () => {
        steps.forEach(s => s.classList.remove("done", "active"));
        for (let j = 0; j <= i; j++) steps[j].classList.add("done");
        i = (i + 1) % steps.length;
        if (i === 0) {
          setTimeout(() => { steps.forEach(s => s.classList.remove("done")); revealNext(); }, 1400);
        } else {
          setTimeout(revealNext, 900);
        }
      };
      revealNext();
    }
  }
})();

// ---------- SALES TEAMMATE ----------

function setSalesStatus(kind, label) {
  salesStatusIndicator.className = `status-indicator ${kind}`;
  salesStatusText.textContent = label;
}

let latestLeads = [];

async function loadLeadPresets() {
  const res = await fetch("/api/sales/leads");
  const data = await res.json();
  latestLeads = data.leads;

  leadPresets.innerHTML = data.leads.map(l =>
    `<button class="preset-btn" data-lead-id="${l.lead_id}">${l.lead_id}</button>`
  ).join("");
  leadPresets.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const lead = data.leads.find(l => l.lead_id === btn.dataset.leadId);
      openAssistOverlay(salesAssistOverlay);
      renderLeadPreview(lead);
      startSalesRun(lead.lead_id, lead.customer_id, lead.cart_value);
    });
  });

  renderLeadListCards(data.leads);
  renderSalesTrendChart(data.leads);
}

// ---------- Business Owner home: recovery lead cards ----------
function renderLeadListCards(leads) {
  if (!leadListCards) return;
  if (!leads.length) {
    leadListCards.innerHTML = emptyStateHtml("No recovery leads right now", "DhanAI will surface new leads here as they appear.");
    return;
  }
  leadListCards.innerHTML = leads.map((l, i) => `
    <div class="lead-card" data-lead-id="${l.lead_id}" style="animation-delay:${i * 40}ms">
      <div class="lead-card-head">
        <span class="lead-card-title">${escapeHtml(l.merchant_name)}</span>
        <span class="lead-tier">${escapeHtml(l.customer_tier)}</span>
      </div>
      <div class="lead-card-sub">${l.lead_id} &middot; Rs.${Number(l.cart_value).toLocaleString("en-IN")} cart &middot; ${l.checkout_status} &middot; ${l.prior_coupons_used} prior coupon(s)</div>
    </div>`).join("");

  leadListCards.querySelectorAll(".lead-card").forEach(card => {
    card.addEventListener("click", () => {
      const lead = latestLeads.find(l => l.lead_id === card.dataset.leadId);
      if (!lead) return;
      openAssistOverlay(salesAssistOverlay);
      renderLeadPreview(lead);
      startSalesRun(lead.lead_id, lead.customer_id, lead.cart_value);
    });
  });
}

// ---------- Business Owner: hand-rolled CSS/SVG bar chart of leads by status ----------
function renderSalesTrendChart(leads) {
  const el = document.getElementById("salesTrendChart");
  if (!el) return;
  if (!leads || !leads.length) {
    el.innerHTML = emptyStateHtml("No lead data yet", "Chart will populate once leads are loaded.");
    return;
  }
  const byStatus = {};
  leads.forEach(l => { byStatus[l.checkout_status] = (byStatus[l.checkout_status] || 0) + Number(l.cart_value); });
  const max = Math.max(...Object.values(byStatus), 1);
  el.innerHTML = Object.entries(byStatus).map(([status, value]) => `
    <div class="bar-chart-col">
      <div class="bar-chart-value">Rs.${Number(value).toLocaleString("en-IN")}</div>
      <div class="bar-chart-bar" style="height:${Math.max(6, Math.round((value / max) * 100))}px"></div>
      <div class="bar-chart-label">${escapeHtml(status)}</div>
    </div>`).join("");
}

function renderLeadPreview(lead) {
  leadBody.innerHTML = `
    <div class="bubble agent">
      <strong>${lead.lead_id}</strong> &middot; ${lead.customer_id} &middot; ${lead.customer_tier}<br>
      ${escapeHtml(lead.merchant_name)} &middot; Rs.${Number(lead.cart_value).toLocaleString("en-IN")}<br>
      Status: ${lead.checkout_status} &middot; Prior coupons: ${lead.prior_coupons_used}
    </div>`;
}

let currentSalesRunEvents = [];
let currentLeadCartValue = 0;

async function startSalesRun(leadId, customerId, cartValue) {
  currentLeadId = leadId;
  currentLeadCartValue = cartValue || 0;
  salesRenderedCount = 0;
  currentSalesRunEvents = [];
  salesActivityBody.innerHTML = "";
  typingCardRefs.salesTypingCardEl = null;
  setSalesStatus("running", "Running");
  setAgentDrawerState("salesAgentState", true);
  showTyping(salesActivityBody, "salesTypingCardEl");
  clearAttachStore(salesAttachStore);

  const res = await fetch("/api/sales/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead_id: leadId, customer_id: customerId }),
  });
  const { run_id } = await res.json();
  pollSalesEvents(run_id);
}

function pollSalesEvents(runId) {
  if (salesPollTimer) clearInterval(salesPollTimer);
  let pollInFlight = false;
  salesPollTimer = setInterval(async () => {
    if (pollInFlight) return;
    pollInFlight = true;
    const res = await fetch(`/api/sales/runs/${runId}/events?since=${salesRenderedCount}`);
    const data = await res.json();
    pollInFlight = false;

    if (data.events.length > 0) hideTyping("salesTypingCardEl");

    let hadError = false;
    for (const event of data.events) {
      addActivityCard(event, salesActivityBody, "salesTypingCardEl");
      currentSalesRunEvents.push(event);
      if (event.type === "done" && event.result && event.result.status === "error") hadError = true;
    }
    salesRenderedCount += data.events.length;
    renderSalesState(data.state);

    if (data.done) {
      clearInterval(salesPollTimer);
      salesPollTimer = null;
      if (typeof updateImpactMetrics === 'function') updateImpactMetrics();
      setAgentDrawerState("salesAgentState", false);
      const status = data.state.lead_record && data.state.lead_record.status;
      if (hadError) setSalesStatus("escalated", "Error");
      else if (status === "COUPON_OFFERED") setSalesStatus("resolved", "Coupon Offered");
      else setSalesStatus("resolved", "Contacted");
      if (!hadError) {
        const blocked = currentSalesRunEvents.filter(e => e.type === "guardrail_block");
        updateImpactFromRun(currentLeadCartValue, data.state, blocked);
        renderOutcomeCard(currentLeadId, currentSalesRunEvents, data.state, currentLeadCartValue);
      }
      loadBusinessBrief();
    } else {
      showTyping(salesActivityBody, "salesTypingCardEl");
    }
  }, 400);
}

// ---------- Campaign outcome card ----------
// Parses the completed run's own event stream (same pattern as the User workspace's
// Decision Card) - customer/lead, recommended action, coupon issued/withheld with the
// actual guardrail reason when withheld, estimated recovery value, message status.
function renderOutcomeCard(leadId, events, state, cartValue) {
  const existing = document.getElementById(`outcome-${leadId}`);
  if (existing) existing.remove();

  const messageSent = events.find(e => e.type === "message_sent");
  const couponBlocked = events.find(e => e.type === "guardrail_block" && e.tool === "issue_discount_coupon");
  const coupon = state.coupon;

  const card = document.createElement("div");
  card.className = "outcome-card";
  card.id = `outcome-${leadId}`;
  card.innerHTML = `
    <div class="outcome-row">
      <span class="outcome-lead">${escapeHtml(leadId)}</span>
      <span class="pill ${coupon ? "pill-success" : couponBlocked ? "pill-danger" : "pill-info"}">${coupon ? "Coupon issued" : couponBlocked ? "Coupon withheld" : "No coupon needed"}</span>
    </div>
    <div class="outcome-field"><b>Recommended action:</b> ${messageSent ? "Send win-back message" : "Update lead record"}</div>
    ${coupon ? `<div class="outcome-field"><b>Coupon:</b> ${escapeHtml(coupon.coupon_code)} &middot; ${coupon.discount_pct}% off</div>` : ""}
    ${couponBlocked ? `<div class="outcome-field"><b>Guardrail reason:</b> ${escapeHtml(renderJson(couponBlocked.result))}</div>` : ""}
    <div class="outcome-field"><b>Est. recovery value:</b> Rs.${Number(cartValue).toLocaleString("en-IN")}</div>
    <div class="outcome-field"><b>Message status:</b> ${messageSent ? "Sent" : "Pending"}</div>
  `;
  leadBody.appendChild(card);
  maybeAutoscroll(leadBody);
}

function renderSalesState(state) {
  const recordBox = document.getElementById("leadRecordBox");
  const beforeR = recordBox.innerHTML;
  if (!state.lead_record) {
    recordBox.innerHTML = `<h3>Lead Status</h3><div class="kv">No lead selected</div>`;
  } else {
    const notes = (state.lead_record.notes || []).map(n => `<div class="kv">&bull; ${escapeHtml(n)}</div>`).join("");
    recordBox.innerHTML = `<h3>Lead Status</h3>
      <div class="kv"><span class="k">${state.lead_record.lead_id}</span>
      <span class="status-pill ${state.lead_record.status}">${state.lead_record.status}</span></div>
      ${notes}`;
  }
  if (recordBox.innerHTML !== beforeR) flash(recordBox);

  const couponBox = document.getElementById("couponBox");
  const beforeC = couponBox.innerHTML;
  if (!state.coupon) {
    couponBox.innerHTML = `<h3>Coupon</h3><div class="kv">None issued</div>`;
  } else {
    couponBox.innerHTML = `<h3>Coupon</h3>
      <div class="kv"><span class="k">${state.coupon.coupon_code}</span> ${state.coupon.discount_pct}% off &middot; valid ${state.coupon.valid_hours}h</div>`;
  }
  if (couponBox.innerHTML !== beforeC) flash(couponBox);

  const smsBox = document.getElementById("salesSmsBox");
  const beforeS = smsBox.innerHTML;
  if (!state.sms_outbox || state.sms_outbox.length === 0) {
    smsBox.innerHTML = `<h3>SMS Outbox</h3><div class="kv">Empty</div>`;
  } else {
    smsBox.innerHTML = `<h3>SMS Outbox</h3>` + state.sms_outbox.map(m => `<div class="sms-item">${escapeHtml(m.message)}</div>`).join("");
  }
  if (smsBox.innerHTML !== beforeS) flash(smsBox);
}

// ---------- BUSINESS AI BRIEF (Business Owner workspace) ----------
// Deterministic - fetched from GET /api/business/{business_id}/brief, no LLM call involved.
async function loadBusinessBrief() {
  const wrap = document.getElementById("businessBriefWrap");
  wrap.innerHTML = `<div class="panel-loading"><div class="skeleton skeleton-line w-40"></div><div class="skeleton skeleton-line w-80"></div></div>`;
  try {
    const res = await fetch(`/api/business/default/brief`);
    const brief = await res.json();
    renderBusinessBrief(brief);
  } catch (e) {
    wrap.innerHTML = `<div class="panel-error">Couldn't load the business brief right now.</div>`;
  }
}

function renderBusinessBrief(brief) {
  const wrap = document.getElementById("businessBriefWrap");
  if (!brief.has_data) {
    wrap.innerHTML = `<h3>Business AI Brief</h3><div class="panel-empty">No leads yet.</div>`;
    return;
  }
  const r = brief.recoverable_leads;
  const cd = brief.coupon_discipline;
  const retryOnly = brief.retry_only_lead_ids.length
    ? `<div class="brief-list-item">Retry-reminder only (no discount needed): ${brief.retry_only_lead_ids.join(", ")}</div>`
    : "";

  wrap.innerHTML = `
    <h3>Business AI Brief</h3>
    <div class="brief-message">${r.count} recoverable lead(s) worth an estimated Rs.${Number(r.estimated_value).toLocaleString("en-IN")}.</div>
    <div class="brief-stats">
      <div class="brief-stat"><div class="num">${r.count}</div><div class="label">Recoverable leads</div></div>
      <div class="brief-stat"><div class="num">Rs.${Number(r.estimated_value).toLocaleString("en-IN")}</div><div class="label">Est. value</div></div>
      <div class="brief-stat"><div class="num">${cd.customers_at_coupon_limit}</div><div class="label">At coupon limit</div></div>
    </div>
    ${retryOnly}
    <div class="brief-list-item">Discount protected so far: Rs.${Number(cd.estimated_discount_protected).toLocaleString("en-IN")} (guardrail: max ${cd.max_discount_pct}%, ${cd.max_coupons_per_customer} coupon/customer)</div>`;
}

// ---------- IMPACT CARD / CAMPAIGN PERFORMANCE ----------
// Running tally for this session, built only from confirmed tool results (coupons
// actually issued, messages actually sent) - not projected or guessed numbers.
// Presented as "Campaign Performance" per the Business Owner spec - same real numbers.
let impactTotals = { leadsContacted: 0, couponsIssued: 0, revenueRecovered: 0, discountProtected: 0 };

function resetImpactCard() {
  impactTotals = { leadsContacted: 0, couponsIssued: 0, revenueRecovered: 0, discountProtected: 0 };
  renderImpactCard();
}

function renderImpactCard() {
  const box = document.getElementById("impactCardBox");
  box.innerHTML = `
    <h3>Campaign Performance</h3>
    <div class="impact-grid">
      <div class="impact-stat"><div class="num">${impactTotals.leadsContacted}</div><div class="label">Leads contacted</div></div>
      <div class="impact-stat"><div class="num">${impactTotals.couponsIssued}</div><div class="label">Coupons issued</div></div>
      <div class="impact-stat"><div class="num">Rs.${Number(impactTotals.revenueRecovered).toLocaleString("en-IN")}</div><div class="label">Est. revenue recovered</div></div>
      <div class="impact-stat"><div class="num">Rs.${Number(impactTotals.discountProtected).toLocaleString("en-IN")}</div><div class="label">Discount protected</div></div>
    </div>`;
}

function updateImpactFromRun(leadCartValue, state, blockedEvents) {
  impactTotals.leadsContacted += 1;
  if (state.coupon) {
    impactTotals.couponsIssued += 1;
    impactTotals.revenueRecovered += leadCartValue;
  }
  const blockedDiscountAmount = (blockedEvents || [])
    .filter(e => e.tool === "issue_discount_coupon")
    .length;
  if (blockedDiscountAmount > 0 || (!state.coupon && leadCartValue)) {
    impactTotals.discountProtected += leadCartValue * 0.15;
  }
  renderImpactCard();
}

function openSales() {
  landing.classList.add("hidden");
  hideAllWorkspaces();
  salesView.classList.remove("hidden");
  document.body.classList.add("console-active");
  if (latestLeads.length) { renderLeadListCards(latestLeads); renderSalesTrendChart(latestLeads); }
  else loadLeadPresets();
  loadBusinessBrief();
  resetImpactCard();
  closeAssistOverlay(salesAssistOverlay);
}

salesBackBtn.addEventListener("click", () => {
  hideAllWorkspaces();
  document.body.classList.remove("console-active");
  landing.classList.remove("hidden", "fade-out");
  closeAssistOverlay(salesAssistOverlay);
});

roleBusinessCard.addEventListener("click", () => openLogin("business"));
humanInboxBtnBiz.addEventListener("click", openInbox);

// ---------- Business Owner home dashboard wiring ----------
salesAskAiFab.addEventListener("click", () => openAssistOverlay(salesAssistOverlay));
salesAssistClose.addEventListener("click", () => closeAssistOverlay(salesAssistOverlay));
salesExplainToggle.addEventListener("click", () => toggleExplain(salesExplainToggle, salesExplainWrap));
qaBizAskAi.addEventListener("click", () => openAssistOverlay(salesAssistOverlay));

document.querySelectorAll("#salesPromptChips .prompt-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    openAssistOverlay(salesAssistOverlay);
    if (latestLeads.length) { renderLeadPreview(latestLeads[0]); }
  });
});

// Quick actions: Recover failed payments / Customer insights just surface the leads list + drawer.
document.getElementById("qaBizRecover").addEventListener("click", () => {
  openAssistOverlay(salesAssistOverlay);
  leadListCards.scrollIntoView({ behavior: "smooth" });
});
document.getElementById("qaBizInsights").addEventListener("click", () => openAssistOverlay(salesAssistOverlay));

// Create a controlled offer / Send payment reminder: these trigger a REAL simulated
// win-back run against the first available lead, so they go through the confirmation
// modal first (policy requires confirmation before a real simulated money-moving action).
document.getElementById("qaBizOffer").addEventListener("click", async () => {
  if (!latestLeads.length) { showToast("No leads available right now"); return; }
  const lead = latestLeads[0];
  const ok = await askConfirm("Create a controlled offer?", `DhanAI will check coupon eligibility for ${lead.lead_id} (${lead.merchant_name}) under existing guardrails and issue a coupon only if policy allows it. Proceed?`);
  if (!ok) return;
  openAssistOverlay(salesAssistOverlay);
  renderLeadPreview(lead);
  startSalesRun(lead.lead_id, lead.customer_id, lead.cart_value);
});
document.getElementById("qaBizReminder").addEventListener("click", async () => {
  if (!latestLeads.length) { showToast("No leads available right now"); return; }
  const lead = latestLeads[0];
  const ok = await askConfirm("Send payment reminder?", `DhanAI will run its win-back flow for ${lead.lead_id} (${lead.merchant_name}), which may send a retry-nudge message. Proceed?`);
  if (!ok) return;
  openAssistOverlay(salesAssistOverlay);
  renderLeadPreview(lead);
  startSalesRun(lead.lead_id, lead.customer_id, lead.cart_value);
});

// ---------- Business Owner sidebar (desktop) ----------
document.getElementById("sbBizOverview").addEventListener("click", () => closeAssistOverlay(salesAssistOverlay));
document.getElementById("sbBizRevenue").addEventListener("click", () => document.getElementById("impactCardBox").scrollIntoView({ behavior: "smooth" }));
document.getElementById("sbBizCustomers").addEventListener("click", () => leadListCards.scrollIntoView({ behavior: "smooth" }));
document.getElementById("sbBizCampaigns").addEventListener("click", () => leadListCards.scrollIntoView({ behavior: "smooth" }));
document.getElementById("sbBizAssistant").addEventListener("click", () => openAssistOverlay(salesAssistOverlay));
document.getElementById("sbBizReports").addEventListener("click", () => document.getElementById("impactCardBox").scrollIntoView({ behavior: "smooth" }));
document.getElementById("sbBizSwitchRole").addEventListener("click", () => salesBackBtn.click());
document.getElementById("sbBizSettings").addEventListener("click", () => showToast("Settings coming soon in this demo"));
document.getElementById("sbBizReset").addEventListener("click", () => salesResetBtn.click());

// ---------- Business Owner bottom nav ----------
const salesNavHome = document.getElementById("salesNavHome");
const salesNavActivity = document.getElementById("salesNavActivity");
const salesNavAskAi = document.getElementById("salesNavAskAi");
const salesNavInsights = document.getElementById("salesNavInsights");
const salesNavProfile = document.getElementById("salesNavProfile");

salesNavHome.addEventListener("click", () => closeAssistOverlay(salesAssistOverlay));
salesNavActivity.addEventListener("click", () => openInbox());
salesNavAskAi.addEventListener("click", () => openAssistOverlay(salesAssistOverlay));
salesNavInsights.addEventListener("click", () => document.getElementById("impactCardBox").scrollIntoView({ behavior: "smooth" }));
salesNavProfile.addEventListener("click", () => salesBackBtn.click());

salesResetBtn.addEventListener("click", async () => {
  if (salesPollTimer) clearInterval(salesPollTimer);
  await fetch("/api/reset", { method: "POST" });
  if (typeof updateImpactMetrics === 'function') updateImpactMetrics();
  leadBody.innerHTML = "";
  salesActivityBody.innerHTML = "";
  typingCardRefs.salesTypingCardEl = null;
  salesRenderedCount = 0;
  setSalesStatus("", "Idle");
  renderSalesState({ lead_record: null, coupon: null, sms_outbox: [] });
  loadLeadPresets();
  loadBusinessBrief();
  resetImpactCard();
  closeAssistOverlay(salesAssistOverlay);
  showToast("Demo state reset");
});

// ---------- RECONCILIATION TEAMMATE ----------

function setReconStatus(kind, label) {
  reconStatusIndicator.className = `status-indicator ${kind}`;
  reconStatusText.textContent = label;
}

async function startReconSweep() {
  reconRenderedCount = 0;
  reconActivityBody.innerHTML = "";
  typingCardRefs.reconTypingCardEl = null;
  runSweepBtn.disabled = true;
  setReconStatus("running", "Sweeping");
  showTyping(reconActivityBody, "reconTypingCardEl");

  const res = await fetch("/api/recon/run", { method: "POST" });
  const { run_id } = await res.json();
  pollReconEvents(run_id);
}

function pollReconEvents(runId) {
  if (reconPollTimer) clearInterval(reconPollTimer);
  let pollInFlight = false;
  reconPollTimer = setInterval(async () => {
    if (pollInFlight) return;
    pollInFlight = true;
    const res = await fetch(`/api/recon/runs/${runId}/events?since=${reconRenderedCount}`);
    const data = await res.json();
    pollInFlight = false;

    if (data.events.length > 0) hideTyping("reconTypingCardEl");

    let hadError = false;
    let summary = null;
    for (const event of data.events) {
      addActivityCard(event, reconActivityBody, "reconTypingCardEl");
      if (event.type === "done") {
        if (event.result && event.result.status === "error") hadError = true;
        else summary = event.result;
      }
    }
    reconRenderedCount += data.events.length;
    renderReconState(data.state, summary);

    if (data.done) {
      clearInterval(reconPollTimer);
      reconPollTimer = null;
      if (typeof updateImpactMetrics === 'function') updateImpactMetrics();
      runSweepBtn.disabled = false;
      if (hadError) setReconStatus("escalated", "Error");
      else setReconStatus("resolved", "Sweep Complete");
    } else {
      showTyping(reconActivityBody, "reconTypingCardEl");
    }
  }, 400);
}

function renderReconState(state, summary) {
  const summaryBox = document.getElementById("reconSummaryBox");
  const beforeS = summaryBox.innerHTML;
  if (summary) {
    summaryBox.innerHTML = `<h3>Last Sweep</h3>
      <div class="kv"><span class="k">Audited</span> ${summary.total}</div>
      <div class="kv"><span class="k">Matched</span> ${summary.matched}</div>
      <div class="kv"><span class="k">Auto-fixed</span> ${summary.auto_fixed}</div>
      <div class="kv"><span class="k">Escalated</span> ${summary.escalated}</div>`;
    if (summaryBox.innerHTML !== beforeS) flash(summaryBox);
  }

  const txnBox = document.getElementById("reconTxnBox");
  const beforeT = txnBox.innerHTML;
  const txns = (state && state.transactions || []).filter(Boolean);
  if (!txns.length) {
    txnBox.innerHTML = `<h3>Transactions Audited</h3><div class="kv">No data</div>`;
  } else {
    const rows = txns.map(t => `
      <div class="kv">
        <span class="k">${t.txn_id}</span> Rs.${Number(t.amount).toLocaleString("en-IN")} &middot; ${escapeHtml(t.merchant_name)}<br>
        <span class="k">internal:</span> ${t.status} &middot; <span class="k">settlement:</span> ${t.settlement_status || "-"} &middot; <span class="k">refund:</span> ${t.refund_id || "-"}
      </div>`).join("<hr style='border-color:var(--border);margin:6px 0'>");
    txnBox.innerHTML = `<h3>Transactions Audited</h3>${rows}`;
  }
  if (txnBox.innerHTML !== beforeT) flash(txnBox);
}

function openRecon() {
  hideAllWorkspaces();
  reconView.classList.remove("hidden");
  document.body.classList.add("console-active");
}

reconBackBtn.addEventListener("click", () => {
  hideAllWorkspaces();
  merchantView.classList.remove("hidden");
});

goPlatformReconBtn.addEventListener("click", openRecon);
runSweepBtn.addEventListener("click", startReconSweep);

reconResetBtn.addEventListener("click", async () => {
  if (reconPollTimer) clearInterval(reconPollTimer);
  await fetch("/api/reset", { method: "POST" });
  if (typeof updateImpactMetrics === 'function') updateImpactMetrics();
  reconActivityBody.innerHTML = "";
  typingCardRefs.reconTypingCardEl = null;
  reconRenderedCount = 0;
  runSweepBtn.disabled = false;
  setReconStatus("", "Idle");
  renderReconState({ transactions: [] }, null);
  document.getElementById("reconSummaryBox").innerHTML = `<h3>Last Sweep</h3><div class="kv">No sweep run yet</div>`;
  showToast("Demo state reset");
});

// ---------- MERCHANT WORKSPACE ----------
// Collections & settlement operations: a merchant picker (simulates merchant login),
// a proactive sweep over that merchant's own transactions, and a natural-language
// query box. Every request carries the picked merchant_id, and the backend's tool
// executor (merchant_tools.py) independently checks that scope on every call - the
// frontend picker is a UX convenience, not the security boundary.

function setMerchantStatus(kind, label) {
  merchantStatusIndicator.className = `status-indicator ${kind}`;
  merchantStatusText.textContent = label;
}

async function loadMerchantPicker() {
  try {
    const res = await fetch("/api/merchant/list");
    const data = await res.json();
    merchantList = data.merchants;
    merchantPicker.innerHTML = merchantList.map(m =>
      `<button class="merchant-chip" data-merchant-id="${m.merchant_id}">${escapeHtml(m.name)}</button>`
    ).join("");
    merchantPicker.querySelectorAll(".merchant-chip").forEach(chip => {
      chip.addEventListener("click", () => selectMerchant(chip.dataset.merchantId));
    });
    if (merchantList.length && !currentMerchantId) selectMerchant(merchantList[0].merchant_id);
  } catch (e) {
    merchantPicker.innerHTML = `<div class="panel-error">Couldn't load merchants.</div>`;
  }
}

function selectMerchant(merchantId) {
  currentMerchantId = merchantId;
  merchantPicker.querySelectorAll(".merchant-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.merchantId === merchantId);
  });
  merchantChatBody.innerHTML = "";
  merchantActivityBody.innerHTML = "";
  typingCardRefs.merchantTypingCardEl = null;
  const merchant = merchantList.find(m => m.merchant_id === merchantId);
  const greet = document.getElementById("merchantGreetingTitle");
  if (greet && merchant) greet.textContent = `Good morning, ${merchant.owner_name}`;
  loadMerchantBrief(merchantId);
  loadMerchantState(merchantId);
}

async function loadMerchantBrief(merchantId) {
  merchantBriefWrap.innerHTML = `<div class="panel-loading"><div class="skeleton skeleton-line w-40"></div><div class="skeleton skeleton-line w-80"></div></div>`;
  try {
    const merchant = merchantList.find(m => m.merchant_id === merchantId);
    const stateRes = await fetch(`/api/merchant/${merchantId}/state`);
    const state = await stateRes.json();
    renderMerchantBriefFromState(merchant, state);
  } catch (e) {
    merchantBriefWrap.innerHTML = `<div class="panel-error">Couldn't load merchant brief.</div>`;
  }
}

function renderMerchantBriefFromState(merchant, state) {
  if (!merchant) {
    merchantBriefWrap.innerHTML = `<div class="panel-empty">Select a merchant above.</div>`;
    renderMerchantTxnList(state);
    renderMerchantStats(state);
    renderMerchantTrendChart(state);
    return;
  }
  const txns = (state && state.transactions) || [];
  const pendingCount = txns.filter(t => t.settlement_status === "PENDING" || t.settlement_status === null).length;
  const collectedTotal = txns.reduce((sum, t) => sum + Number(t.amount), 0);

  merchantBriefWrap.innerHTML = `
    <h3>Merchant AI Brief</h3>
    <div class="brief-message">${escapeHtml(merchant.name)} &middot; ${escapeHtml(merchant.owner_name)} &middot; ${escapeHtml(merchant.category)}</div>
    <div class="brief-stats">
      <div class="brief-stat"><div class="num">Rs.${Number(collectedTotal).toLocaleString("en-IN")}</div><div class="label">Recorded collections</div></div>
      <div class="brief-stat"><div class="num">${pendingCount}</div><div class="label">Pending/unverified</div></div>
      <div class="brief-stat"><div class="num">${txns.length}</div><div class="label">Transactions</div></div>
    </div>
    <div class="brief-list-item">Run a settlement sweep or ask a question via Ask DhanAI to investigate and act.</div>`;
  renderMerchantTxnList(state);
  renderMerchantStats(state);
  renderMerchantTrendChart(state);
}

// Today's collection amount / txn count / pending settlement amount, derived client-side
// from the merchant's own transaction list (extends the existing renderMerchantBriefFromState logic).
function renderMerchantStats(state) {
  const row = document.getElementById("merchantStatRow");
  const etaEl = document.getElementById("merchantEtaValue");
  if (!row) return;
  const txns = (state && state.transactions || []).filter(Boolean);
  const todaysCollection = txns.reduce((sum, t) => sum + Number(t.amount), 0);
  const pendingTxns = txns.filter(t => (t.settlement_status || "PENDING") === "PENDING");
  const pendingAmount = pendingTxns.reduce((sum, t) => sum + Number(t.amount), 0);

  row.innerHTML = `
    <div class="stat-card">
      <span class="stat-card-icon"><svg><use href="#ic-txn"/></svg></span>
      <div class="num">Rs.${Number(todaysCollection).toLocaleString("en-IN")}</div>
      <div class="label">Today's collections</div>
    </div>
    <div class="stat-card">
      <span class="stat-card-icon"><svg><use href="#ic-activity"/></svg></span>
      <div class="num">${txns.length}</div>
      <div class="label">Transaction count</div>
    </div>
    <div class="stat-card">
      <span class="stat-card-icon"><svg><use href="#ic-sweep"/></svg></span>
      <div class="num">Rs.${Number(pendingAmount).toLocaleString("en-IN")}</div>
      <div class="label">Pending settlement</div>
    </div>`;
  if (etaEl) etaEl.textContent = pendingTxns.length > 0 ? "Within 24h" : "All settled";
}

// Hand-rolled CSS/SVG bar chart of collection amounts by transaction (simple, illustrative).
function renderMerchantTrendChart(state) {
  const el = document.getElementById("merchantTrendChart");
  if (!el) return;
  const txns = (state && state.transactions || []).filter(Boolean);
  if (!txns.length) {
    el.innerHTML = emptyStateHtml("No transactions yet", "Run a sweep to populate the trend.");
    return;
  }
  const values = txns.slice(0, 8).map(t => Number(t.amount));
  const max = Math.max(...values, 1);
  el.innerHTML = txns.slice(0, 8).map((t, i) => `
    <div class="bar-chart-col">
      <div class="bar-chart-value">Rs.${Number(t.amount).toLocaleString("en-IN")}</div>
      <div class="bar-chart-bar" style="height:${Math.max(6, Math.round((values[i] / max) * 100))}px"></div>
      <div class="bar-chart-label">${escapeHtml(t.mtxn_id || `#${i+1}`)}</div>
    </div>`).join("");
}

async function loadMerchantState(merchantId) {
  try {
    const res = await fetch(`/api/merchant/${merchantId}/state`);
    const state = await res.json();
    renderMerchantTxnBox(state);
    renderMerchantTxnList(state);
    renderMerchantStats(state);
    renderMerchantTrendChart(state);
  } catch (e) {
    renderMerchantTxnBox({ transactions: [] });
    renderMerchantTxnList({ transactions: [] });
  }
}

// ---------- Merchant home: Paytm-style collections/settlements list ----------
function renderMerchantTxnList(state) {
  if (!merchantTxnList) return;
  const txns = (state && state.transactions || []).filter(Boolean);
  if (!txns.length) {
    merchantTxnList.innerHTML = emptyStateHtml("No data yet", "Run a sweep or ask a question to populate this list.");
    return;
  }
  merchantTxnList.innerHTML = txns.map((t, i) => {
    const settlement = t.settlement_status || "PENDING";
    const badgeClass = settlement === "SETTLED" ? "badge-green" : settlement === "PENDING" ? "badge-amber" : "badge-red";
    return `
    <div class="txn-row not-actionable" style="animation-delay:${i * 40}ms">
      <span class="txn-icon"><svg><use href="#ic-shop"/></svg></span>
      <div class="txn-main">
        <div class="txn-merchant">${escapeHtml(t.payer_name)}</div>
        <div class="txn-sub">${t.mtxn_id} &middot; collected: ${t.collection_status}</div>
      </div>
      <div class="txn-side">
        <div class="txn-amount">Rs.${Number(t.amount).toLocaleString("en-IN")}</div>
        <span class="status-badge ${badgeClass}">${settlement}</span>
      </div>
    </div>`;
  }).join("");
}

function renderMerchantTxnBox(state) {
  const box = document.getElementById("merchantTxnBox");
  const before = box.innerHTML;
  const txns = (state && state.transactions || []).filter(Boolean);
  if (!txns.length) {
    box.innerHTML = `<h3>Today's Collections &amp; Pending Settlements</h3><div class="panel-empty">No data yet &mdash; run a sweep or ask a question.</div>`;
  } else {
    const rows = txns.map(t => `
      <div class="kv">
        <span class="k">${t.mtxn_id}</span> Rs.${Number(t.amount).toLocaleString("en-IN")} &middot; ${escapeHtml(t.payer_name)}<br>
        <span class="k">collected:</span> ${t.collection_status} &middot; <span class="k">settlement:</span> ${t.settlement_status || "-"} &middot; <span class="k">reversal:</span> ${t.refund_id || "-"}
      </div>`).join("<hr style='border-color:var(--border);margin:6px 0'>");
    box.innerHTML = `<h3>Today's Collections &amp; Pending Settlements</h3>${rows}`;
  }
  if (box.innerHTML !== before) flash(box);
}

function renderMerchantExceptions(events) {
  const box = document.getElementById("merchantExceptionsBox");
  const before = box.innerHTML;
  const exceptions = (events || []).filter(e => e.type === "escalation" || e.type === "guardrail_block");
  if (!exceptions.length) {
    box.innerHTML = `<h3>Exceptions / Escalations</h3><div class="kv">None</div>`;
  } else {
    const rows = exceptions.map(e => `<div class="kv"><span class="status-pill ESCALATED">${e.type === "escalation" ? "ESCALATED" : "BLOCKED"}</span> ${escapeHtml(e.tool || "")}</div>`).join("");
    box.innerHTML = `<h3>Exceptions / Escalations</h3>${rows}`;
  }
  if (box.innerHTML !== before) flash(box);

  if (merchantExceptionsBadge) {
    if (exceptions.length) {
      merchantExceptionsBadge.textContent = `${exceptions.length} exception${exceptions.length > 1 ? "s" : ""} needs review`;
      merchantExceptionsBadge.classList.remove("hidden");
    } else {
      merchantExceptionsBadge.classList.add("hidden");
    }
  }
}

// --- Proactive sweep, presented as a readable step timeline with a technical-details toggle ---
async function startMerchantSweep() {
  if (!currentMerchantId) return;
  merchantSweepRenderedCount = 0;
  merchantActivityBody.innerHTML = "";
  typingCardRefs.merchantTypingCardEl = null;
  merchantSweepBtn.disabled = true;
  setMerchantStatus("running", "Sweeping");
  setAgentDrawerState("merchantAgentState", true);
  showTyping(merchantActivityBody, "merchantTypingCardEl");

  const res = await fetch(`/api/merchant/${currentMerchantId}/sweep`, { method: "POST" });
  const { run_id, error } = await res.json();
  if (error) {
    merchantActivityBody.innerHTML = `<div class="panel-error">${escapeHtml(error)}</div>`;
    merchantSweepBtn.disabled = false;
    setMerchantStatus("", "Idle");
    setAgentDrawerState("merchantAgentState", false);
    return;
  }
  pollMerchantSweepEvents(run_id);
}

function pollMerchantSweepEvents(runId) {
  if (merchantSweepPollTimer) clearInterval(merchantSweepPollTimer);
  let pollInFlight = false;
  let allEvents = [];
  merchantSweepPollTimer = setInterval(async () => {
    if (pollInFlight) return;
    pollInFlight = true;
    const res = await fetch(`/api/merchant/sweep/${runId}/events?since=${merchantSweepRenderedCount}`);
    const data = await res.json();
    pollInFlight = false;

    if (data.events.length > 0) hideTyping("merchantTypingCardEl");

    let hadError = false;
    let summary = null;
    for (const event of data.events) {
      addActivityCard(event, merchantActivityBody, "merchantTypingCardEl");
      allEvents.push(event);
      if (event.type === "done") {
        if (event.result && event.result.status === "error") hadError = true;
        else summary = event.result;
      }
    }
    merchantSweepRenderedCount += data.events.length;
    renderMerchantTxnBox(data.state);
    renderMerchantExceptions(allEvents);
    renderMerchantSweepSummary(summary);
    renderMerchantStats(data.state);
    renderMerchantTrendChart(data.state);

    if (data.done) {
      clearInterval(merchantSweepPollTimer);
      merchantSweepPollTimer = null;
      if (typeof updateImpactMetrics === 'function') updateImpactMetrics();
      merchantSweepBtn.disabled = false;
      setAgentDrawerState("merchantAgentState", false);
      if (hadError) setMerchantStatus("escalated", "Error");
      else setMerchantStatus("resolved", "Sweep Complete");
      refreshInboxBadge();
    } else {
      showTyping(merchantActivityBody, "merchantTypingCardEl");
    }
  }, 400);
}

function renderMerchantSweepSummary(summary) {
  const box = document.getElementById("merchantSweepBox");
  if (!summary) return;
  const btn = document.getElementById("merchantSweepBtn");
  const btnHtml = btn.outerHTML;
  box.innerHTML = `<h3>Reconciliation Sweep</h3>${btnHtml}
    <div class="kv"><span class="k">Audited</span> ${summary.total}</div>
    <div class="kv"><span class="k">Matched</span> ${summary.matched}</div>
    <div class="kv"><span class="k">Auto-fixed</span> ${summary.auto_fixed}</div>
    <div class="kv"><span class="k">Escalated</span> ${summary.escalated}</div>`;
  document.getElementById("merchantSweepBtn").addEventListener("click", startMerchantSweep);
  flash(box);
}

// --- Natural-language query ---
function addMerchantBubble(role, text) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  merchantChatBody.appendChild(div);
  if (isNearBottom(merchantChatBody)) {
    merchantChatBody.scrollTo({ top: merchantChatBody.scrollHeight, behavior: "smooth" });
  }
}

async function startMerchantQuery(question) {
  if (!currentMerchantId) return;
  merchantRenderedCount = 0;
  merchantActivityBody.innerHTML = "";
  typingCardRefs.merchantTypingCardEl = null;
  addMerchantBubble("user", question);
  merchantQuerySendBtn.disabled = true;
  setMerchantStatus("running", "Investigating");
  setAgentDrawerState("merchantAgentState", true);
  showTyping(merchantActivityBody, "merchantTypingCardEl");

  const attachments = attachmentsPayload(merchantAttachStore);
  clearAttachStore(merchantAttachStore);

  const res = await fetch("/api/merchant/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchant_id: currentMerchantId, question, attachments }),
  });
  const { run_id, error } = await res.json();
  if (error) {
    addMerchantBubble("agent", error);
    merchantQuerySendBtn.disabled = false;
    setMerchantStatus("", "Idle");
    setAgentDrawerState("merchantAgentState", false);
    return;
  }
  pollMerchantQueryEvents(run_id);
}

function pollMerchantQueryEvents(runId) {
  if (merchantPollTimer) clearInterval(merchantPollTimer);
  let pollInFlight = false;
  let allEvents = [];
  merchantPollTimer = setInterval(async () => {
    if (pollInFlight) return;
    pollInFlight = true;
    const res = await fetch(`/api/merchant/query/${runId}/events?since=${merchantRenderedCount}`);
    const data = await res.json();
    pollInFlight = false;

    if (data.events.length > 0) hideTyping("merchantTypingCardEl");

    let hadError = false;
    for (const event of data.events) {
      addActivityCard(event, merchantActivityBody, "merchantTypingCardEl");
      allEvents.push(event);
      if (event.type === "done") {
        if (event.result && event.result.status === "error") hadError = true;
        const text = (event.result && event.result.final_text) || "Ticket escalated to a human agent.";
        addMerchantBubble("agent", text);
      }
    }
    merchantRenderedCount += data.events.length;
    renderMerchantTxnBox(data.state);
    renderMerchantExceptions(allEvents);
    renderMerchantStats(data.state);
    renderMerchantTrendChart(data.state);

    if (data.done) {
      clearInterval(merchantPollTimer);
      merchantPollTimer = null;
      if (typeof updateImpactMetrics === 'function') updateImpactMetrics();
      merchantQuerySendBtn.disabled = false;
      setAgentDrawerState("merchantAgentState", false);
      if (hadError) setMerchantStatus("escalated", "Error");
      else if (allEvents.some(e => e.type === "escalation")) setMerchantStatus("escalated", "Escalated");
      else setMerchantStatus("resolved", "Resolved");
      refreshInboxBadge();
    } else {
      showTyping(merchantActivityBody, "merchantTypingCardEl");
    }
  }, 400);
}

merchantQuerySendBtn.addEventListener("click", () => {
  const text = merchantQueryInput.value.trim();
  if (!text) return;
  startMerchantQuery(text);
  merchantQueryInput.value = "";
});

merchantQueryInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    merchantQuerySendBtn.click();
  }
});

document.querySelectorAll("#merchantPromptChips .prompt-chip").forEach(chip => {
  chip.addEventListener("click", () => startMerchantQuery(chip.dataset.prompt));
});

merchantSweepBtn.addEventListener("click", startMerchantSweep);

// ---------- Merchant quick actions: settlement report export (real CSV, client-side) ----------
document.getElementById("qaDownloadReport").addEventListener("click", async () => {
  if (!currentMerchantId) { showToast("Select a merchant first"); return; }
  try {
    const res = await fetch(`/api/merchant/${currentMerchantId}/state`);
    const state = await res.json();
    const txns = (state.transactions || []).filter(Boolean);
    const header = "mtxn_id,payer_name,amount,collection_status,settlement_status,refund_id\n";
    const rows = txns.map(t => [t.mtxn_id, t.payer_name, t.amount, t.collection_status, t.settlement_status || "", t.refund_id || ""].join(",")).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentMerchantId}_settlement_report.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Report downloaded");
  } catch (e) {
    showToast("Couldn't generate report");
  }
});

document.getElementById("qaDeviceIssue").addEventListener("click", () => {
  openAssistOverlay(merchantAssistOverlay);
  startMerchantQuery("I'm having a QR code / payment device issue and need help checking recent collections.");
});
document.getElementById("qaDispute").addEventListener("click", () => {
  openAssistOverlay(merchantAssistOverlay);
  startMerchantQuery("I want to raise a dispute about one of my recent settlements.");
});

function openMerchant() {
  landing.classList.add("hidden");
  hideAllWorkspaces();
  merchantView.classList.remove("hidden");
  document.body.classList.add("console-active");
  if (!merchantPicker.children.length) loadMerchantPicker();
  refreshInboxBadge();
  closeAssistOverlay(merchantAssistOverlay);
}

merchantBackBtn.addEventListener("click", () => {
  hideAllWorkspaces();
  document.body.classList.remove("console-active");
  landing.classList.remove("hidden", "fade-out");
  closeAssistOverlay(merchantAssistOverlay);
});

roleMerchantCard.addEventListener("click", () => openLogin("merchant"));

merchantResetBtn.addEventListener("click", async () => {
  if (merchantPollTimer) clearInterval(merchantPollTimer);
  if (merchantSweepPollTimer) clearInterval(merchantSweepPollTimer);
  await fetch("/api/reset", { method: "POST" });
  if (typeof updateImpactMetrics === 'function') updateImpactMetrics();
  merchantChatBody.innerHTML = "";
  merchantActivityBody.innerHTML = "";
  typingCardRefs.merchantTypingCardEl = null;
  merchantRenderedCount = 0;
  merchantSweepRenderedCount = 0;
  merchantQuerySendBtn.disabled = false;
  merchantSweepBtn.disabled = false;
  setMerchantStatus("", "Idle");
  renderMerchantTxnBox({ transactions: [] });
  renderMerchantExceptions([]);
  renderMerchantTxnList({ transactions: [] });
  document.getElementById("merchantSweepBox").innerHTML = `<h3>Reconciliation Sweep</h3><button class="preset-btn" id="merchantSweepBtn" style="margin-bottom:8px;">Run Settlement Sweep</button><div class="kv">No sweep run yet</div>`;
  document.getElementById("merchantSweepBtn").addEventListener("click", startMerchantSweep);
  if (currentMerchantId) loadMerchantBrief(currentMerchantId);
  refreshInboxBadge();
  closeAssistOverlay(merchantAssistOverlay);
  showToast("Demo state reset");
});

// ---------- Merchant home dashboard wiring ----------
merchantAskAiFab.addEventListener("click", () => openAssistOverlay(merchantAssistOverlay));
merchantAssistClose.addEventListener("click", () => closeAssistOverlay(merchantAssistOverlay));
merchantExplainToggle.addEventListener("click", () => toggleExplain(merchantExplainToggle, merchantExplainWrap));

qaMerchantAskAi.addEventListener("click", () => openAssistOverlay(merchantAssistOverlay));
qaRunSweep.addEventListener("click", () => {
  openAssistOverlay(merchantAssistOverlay);
  startMerchantSweep();
});
qaGoRecon.addEventListener("click", () => openRecon());

// ---------- Merchant sidebar (desktop) ----------
document.getElementById("sbMerchOverview").addEventListener("click", () => closeAssistOverlay(merchantAssistOverlay));
document.getElementById("sbMerchTxns").addEventListener("click", () => merchantTxnList.scrollIntoView({ behavior: "smooth" }));
document.getElementById("sbMerchSettlements").addEventListener("click", () => document.getElementById("merchantSettlementEtaCard").scrollIntoView({ behavior: "smooth" }));
document.getElementById("sbMerchRecon").addEventListener("click", () => openRecon());
document.getElementById("sbMerchAssistant").addEventListener("click", () => openAssistOverlay(merchantAssistOverlay));
document.getElementById("sbMerchSupport").addEventListener("click", () => openAssistOverlay(merchantAssistOverlay));
document.getElementById("sbMerchSwitchRole").addEventListener("click", () => merchantBackBtn.click());
document.getElementById("sbMerchSettings").addEventListener("click", () => showToast("Settings coming soon in this demo"));
document.getElementById("sbMerchReset").addEventListener("click", () => merchantResetBtn.click());

// ---------- Merchant bottom nav ----------
const merchantNavHome = document.getElementById("merchantNavHome");
const merchantNavActivity = document.getElementById("merchantNavActivity");
const merchantNavAskAi = document.getElementById("merchantNavAskAi");
const merchantNavInsights = document.getElementById("merchantNavInsights");
const merchantNavProfile = document.getElementById("merchantNavProfile");

merchantNavHome.addEventListener("click", () => closeAssistOverlay(merchantAssistOverlay));
merchantNavActivity.addEventListener("click", () => openInbox());
merchantNavAskAi.addEventListener("click", () => openAssistOverlay(merchantAssistOverlay));
merchantNavInsights.addEventListener("click", () => document.getElementById("merchantTrendCard").scrollIntoView({ behavior: "smooth" }));
merchantNavProfile.addEventListener("click", () => merchantBackBtn.click());

// ---------- SCAM SHIELD ----------
(function scamShieldInit() {
  const openBtn = document.getElementById("scamShieldOpenBtn");
  const openBtnDashboard = document.getElementById("scamShieldOpenBtnDashboard");
  const modal = document.getElementById("scamShieldModal");
  const closeBtn = document.getElementById("scamShieldCloseBtn");
  const checkBtn = document.getElementById("scamShieldCheckBtn");
  const input = document.getElementById("scamShieldInput");
  const resultEl = document.getElementById("scamShieldResult");
  if (!modal) return;

  const openHandler = () => {
    modal.classList.remove("hidden");
    resultEl.innerHTML = "";
    input.value = "";
  };

  if (openBtn) openBtn.addEventListener("click", openHandler);
  if (openBtnDashboard) openBtnDashboard.addEventListener("click", openHandler);
  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });

  modal.querySelectorAll("[data-scam-demo]").forEach(btn => {
    btn.addEventListener("click", () => { input.value = btn.dataset.scamDemo; });
  });

  checkBtn.addEventListener("click", async () => {
    const message = input.value.trim();
    if (!message) { input.focus(); return; }
    checkBtn.disabled = true;
    resultEl.innerHTML = `<div class="panel-loading">Checking message</div>`;
    try {
      const res = await fetch("/api/scam-shield/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, customer_id: currentCustomerId }),
      });
      const data = await res.json();
      renderScamResult(data, message);
    } catch (e) {
      resultEl.innerHTML = `<div class="panel-error">Couldn't check this message.</div>`;
    }
    checkBtn.disabled = false;
  });

  function renderScamResult(data, message) {
    const risk = data.risk_level || 'LOW';
    const riskClass = risk === "HIGH" ? "badge-red" : risk === "MEDIUM" ? "badge-amber" : "badge-green";
    const signalsHtml = (data.signals || []).length
      ? `<div class="txn-sub" style="margin:6px 0"><strong>Signals detected:</strong><ul style="margin:4px 0;padding-left:18px">${data.signals.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul></div>`
      : `<div class="txn-sub">No specific scam signals found.</div>`;

    let actionsHtml = "";
    if (risk === "HIGH") {
      actionsHtml = `
        <div class="brief-list-item" style="margin-top:8px;color:var(--color-danger)"><strong>⛔ Do not pay or share OTP/PIN</strong></div>
        <div class="modal-actions" style="margin-top:8px;">
          <button class="btn btn-cancel" id="scamBlockPayeeBtn" type="button">Block payee</button>
          <button class="btn btn-confirm" id="scamReportBtn" type="button">Report scam</button>
        </div>
        <div id="scamActionStatus"></div>
      `;
    } else if (risk === "MEDIUM") {
      actionsHtml = `
        <div class="modal-actions" style="margin-top:8px;">
          <button class="btn btn-confirm" id="scamReportBtn" type="button">Report scam</button>
        </div>
        <div id="scamActionStatus"></div>
      `;
    }

    resultEl.innerHTML = `
      <div class="brief-card">
        <span class="status-badge ${riskClass}">${risk} RISK</span>
        <div style="font-size:.82rem;opacity:.7;margin:4px 0">Risk score: ${data.risk_score || 0}/100</div>
        ${signalsHtml}
        <div class="brief-message" style="margin-top:8px">${escapeHtml(data.advice || '')}</div>
        ${actionsHtml}
      </div>
    `;

    const blockBtn = document.getElementById("scamBlockPayeeBtn");
    const reportBtn = document.getElementById("scamReportBtn");
    if (blockBtn) {
      blockBtn.addEventListener("click", async () => {
        const r = await fetch("/api/scam-shield/block-payee", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_id: currentCustomerId, message }),
        });
        const d = await r.json();
        document.getElementById("scamActionStatus").innerHTML = `<div class="txn-sub">${escapeHtml(d.note)}</div>`;
        showToast("Payee blocked");
        if (typeof updateImpactMetrics === 'function') updateImpactMetrics();
      });
    }
    if (reportBtn) {
      reportBtn.addEventListener("click", async () => {
        const r = await fetch("/api/scam-shield/report", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_id: currentCustomerId, message }),
        });
        const d = await r.json();
        document.getElementById("scamActionStatus").innerHTML = `<div class="txn-sub">${escapeHtml(d.note)}</div>`;
        showToast("Scam reported");
        if (typeof updateImpactMetrics === 'function') updateImpactMetrics();
      });
    }
  }
})();

async function updateImpactMetrics() {
  try {
    const res = await fetch("/api/impact");
    const data = await res.json();
    const eMoney = document.getElementById("impactMoney");
    const eTickets = document.getElementById("impactTickets");
    const eTime = document.getElementById("impactTime");
    const eFraud = document.getElementById("impactFraud");
    if (eMoney) eMoney.textContent = data.money_recovered;
    if (eTickets) eTickets.textContent = data.tickets_prevented;
    if (eTime) eTime.textContent = data.settlement_hours_saved;
    if (eFraud) eFraud.textContent = data.fraud_prevented;
  } catch(e) {}
}
updateImpactMetrics();
setInterval(updateImpactMetrics, 10000);
