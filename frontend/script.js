/**
 * DevMind AI – Persistent-Memory AI Coding & Debugging Assistant
 * Complete Frontend Controller (Vanilla JavaScript)
 */

const API_BASE_URL = "http://127.0.0.1:8000";

// Project Memories Database (Local In-Memory Cache)
let projectMemories = [];

function renderReplyHtml(text) {
  const parts = String(text || "").split("```");
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const lines = part.split("\n");
      const lang = lines[0].trim() || "python";
      const code = lines.slice(1).join("\n").replace(/\n$/, "");
      return `<div class="code-block"><div class="code-header"><span class="code-lang">${escapeHtml(lang)}</span><button class="copy-btn" onclick="copyCode(this)">Copy</button></div><pre><code>${escapeHtml(code)}</code></pre></div>`;
    }
    const clean = part.trim();
    return clean ? `<p>${escapeHtml(clean).replace(/\n/g, "<br>")}</p>` : "";
  }).join("");
}

function appendBackendReply(data, query) {
  const chatStream = document.getElementById("chat-stream");
  const msgDiv = document.createElement("div");
  msgDiv.className = "chat-message assistant-msg";

  let chip;
  if (data.isError) {
    chip = "Error";
  } else if (data.recalled_fix) {
    chip = `✦ Memory recalled (${data.memory_count} retrieved)`;
  } else {
    chip = `${data.memory_count || 0} memories retrieved, no matching fix`;
  }

  msgDiv.innerHTML = `
    <div class="msg-avatar ai-avatar">AI</div>
    <div class="msg-bubble">
      <div class="msg-meta">
        <span class="author">DevMind AI</span>
        <span class="time">${getCurrentTime()}</span>
        <span class="recalled-chip">${escapeHtml(chip)}</span>
      </div>
      <div class="msg-content">${renderReplyHtml(data.reply)}</div>
    </div>
  `;
  if (!data.isError && query) {
    const bar = document.createElement("div");
    bar.style.cssText = "margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;";
    bar.innerHTML = `<span style="font-size:13px;">Did this fix work?</span>
      <button type="button" class="copy-btn yes-btn">✅ Yes, save it</button>
      <button type="button" class="copy-btn no-btn">❌ No</button>
      <span class="verify-status" style="font-size:13px;"></span>`;
    const status = bar.querySelector(".verify-status");

    bar.querySelector(".yes-btn").addEventListener("click", async () => {
      status.textContent = "Saving to Hindsight...";
      const parts = String(data.reply || "").split("\n\n---\n\n");
      const fixText = parts[parts.length - 1];
      try {
        const res = await fetch(`${API_BASE_URL}/api/memory/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query, reply: fixText })
        });
        if (!res.ok) throw new Error("Server status " + res.status);
        status.textContent = "✅ Verified fix saved to Hindsight memory.";
        bar.querySelectorAll("button").forEach(b => b.disabled = true);
      } catch (e) {
        status.textContent = "Save failed: " + e.message;
      }
    });

    bar.querySelector(".no-btn").addEventListener("click", () => {
      status.textContent = "Not saved. Unverified fixes are never stored.";
      bar.querySelectorAll("button").forEach(b => b.disabled = true);
    });

    msgDiv.querySelector(".msg-content").appendChild(bar);
  }
  chatStream.appendChild(msgDiv);
  chatStream.scrollTop = chatStream.scrollHeight;
}

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const statusBadge = document.getElementById("backend-status");
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const chatStream = document.getElementById("chat-stream");
  const askBtn = document.getElementById("ask-btn");
  const clearChatBtn = document.getElementById("clear-chat-btn");

  // Input Drawer Elements
  const toggleCodeBtn = document.getElementById("toggle-code-input");
  const toggleErrorBtn = document.getElementById("toggle-error-input");
  const codeDrawer = document.getElementById("code-drawer");
  const errorDrawer = document.getElementById("error-drawer");
  const closeCodeDrawer = document.getElementById("close-code-drawer");
  const closeErrorDrawer = document.getElementById("close-error-drawer");
  const codeInput = document.getElementById("code-input");
  const codeLangSelect = document.getElementById("code-lang-select");
  const errorInput = document.getElementById("error-input");

  // Memory Panel Elements
  const memoryPanel = document.getElementById("memory-panel");
  const toggleMemoryBtn = document.getElementById("toggle-memory-btn");
  const memorySearchInput = document.getElementById("memory-search-input");
  const filterTabs = document.querySelectorAll(".filter-tab");
  const memoryCardsContainer = document.getElementById("memory-cards-container");
  const memoryCountBadge = document.getElementById("memory-count-badge");
  const addMemoryBtn = document.getElementById("add-memory-btn");
  const newMemoryForm = document.getElementById("new-memory-form");
  const saveMemBtn = document.getElementById("save-mem-btn");
  const cancelMemBtn = document.getElementById("cancel-mem-btn");
  const newMemTitle = document.getElementById("new-mem-title");
  const newMemBody = document.getElementById("new-mem-body");

  // Quick Prompt Chips
  const promptChips = document.querySelectorAll(".prompt-chip");

  // 1. Check Backend Connectivity
  checkBackendStatus(statusBadge);
  setInterval(() => checkBackendStatus(statusBadge), 15000);

  // 2. Toggle Memory Drawer (For Laptop Screens)
  if (toggleMemoryBtn && memoryPanel) {
    toggleMemoryBtn.addEventListener("click", () => {
      memoryPanel.classList.toggle("collapsed");
    });
  }

  // 3. Toggle Code and Error Input Drawers
  toggleCodeBtn.addEventListener("click", () => {
    const isHidden = codeDrawer.classList.toggle("hidden");
    toggleCodeBtn.classList.toggle("active", !isHidden);
    if (!isHidden) codeInput.focus();
  });

  closeCodeDrawer.addEventListener("click", () => {
    codeDrawer.classList.add("hidden");
    toggleCodeBtn.classList.remove("active");
  });

  toggleErrorBtn.addEventListener("click", () => {
    const isHidden = errorDrawer.classList.toggle("hidden");
    toggleErrorBtn.classList.toggle("active", !isHidden);
    if (!isHidden) errorInput.focus();
  });

  closeErrorDrawer.addEventListener("click", () => {
    errorDrawer.classList.add("hidden");
    toggleErrorBtn.classList.remove("active");
  });

  // 4. Quick Prompts Clicking
  promptChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const promptText = chip.getAttribute("data-prompt");
      userInput.value = promptText;
      userInput.focus();
    });
  });

  // 5. Submit Message Form (Ask DevMind)
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleAskDevMind();
  });

  // Keyboard shortcut: Ctrl + Enter or Cmd + Enter to submit
  [userInput, codeInput, errorInput].forEach((field) => {
    field.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleAskDevMind();
      }
    });
  });

  // 6. Clear Chat
  clearChatBtn.addEventListener("click", () => {
    if (confirm("Reset conversation history?")) {
      chatStream.innerHTML = `
        <div class="chat-message assistant-msg">
          <div class="msg-avatar ai-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a5 5 0 0 1 5 5v1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v1a5 5 0 0 1-10 0v-1H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2V7a5 5 0 0 1 5-5z"></path>
              <path d="M9 12h6"></path>
            </svg>
          </div>
          <div class="msg-bubble">
            <div class="msg-meta">
              <span class="author">DevMind AI</span>
              <span class="time">${getCurrentTime()}</span>
              <span class="recalled-chip"><span class="chip-sparkle">✦</span> Standby</span>
            </div>
            <div class="msg-content">
              <p>Conversation reset. DevMind's persistent memory is intact across sessions. Ask a question, paste code, or supply an error log to begin debugging.</p>
            </div>
          </div>
        </div>
      `;
    }
  });

  // 7. Memory Search and Filtering
  memorySearchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    filterMemoryCards(query, getActiveCategory());
  });

  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filterTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const category = tab.getAttribute("data-filter");
      filterMemoryCards(memorySearchInput.value.toLowerCase().trim(), category);
    });
  });

  // 8. Add Manual Memory Note
  addMemoryBtn.addEventListener("click", () => {
    newMemoryForm.classList.remove("hidden");
    addMemoryBtn.style.display = "none";
    newMemTitle.focus();
  });

  cancelMemBtn.addEventListener("click", () => {
    newMemoryForm.classList.add("hidden");
    addMemoryBtn.style.display = "block";
    newMemTitle.value = "";
    newMemBody.value = "";
  });

  saveMemBtn.addEventListener("click", async () => {
    const title = newMemTitle.value.trim();
    const body = newMemBody.value.trim();

    if (!title || !body) {
      alert("Please enter both a title and description.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/memory/retain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `${title}: ${body}` })
      });

      if (!response.ok) throw new Error("Could not save memory.");

      await loadHindsightMemories();

      newMemoryForm.classList.add("hidden");
      addMemoryBtn.style.display = "block";
      newMemTitle.value = "";
      newMemBody.value = "";

      alert("Memory successfully saved to Hindsight!");
    } catch (error) {
      alert("Memory save failed: " + error.message);
    }
  });
  // Main Send Action Handler
  async function handleAskDevMind() {
    const prompt = userInput.value.trim();
    const code = codeInput.value.trim();
    const codeLang = codeLangSelect.value;
    const errorText = errorInput.value.trim();

    if (!prompt && !code && !errorText) {
      userInput.focus();
      return;
    }

    // 1. Render User Message
    appendUserMessage(prompt, code, codeLang, errorText);

    // Reset input fields
    userInput.value = "";
    codeInput.value = "";
    errorInput.value = "";
    codeDrawer.classList.add("hidden");
    errorDrawer.classList.add("hidden");
    toggleCodeBtn.classList.remove("active");
    toggleErrorBtn.classList.remove("active");

    // 2. Show Animated Thinking / Memory Retrieval Indicator
    const thinkingId = appendThinkingIndicator();
    askBtn.disabled = true;

    // 3. Prepare payload for API
    const combinedQuery = [
      prompt,
      code ? `\n[Code snippet (${codeLang})]:\n${code}` : "",
      errorText ? `\n[Error Log]:\n${errorText}` : ""
    ].filter(Boolean).join("\n");

       const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 150000);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: combinedQuery }),
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`Server status ${response.status}`);

      const data = await response.json();
      appendBackendReply(data, combinedQuery);
    } catch (err) {
      console.warn("DevMind API error:", err);
      const msg = err.name === "AbortError"
        ? "The request timed out. Is Ollama running?"
        : "Could not reach the backend: " + err.message;
      appendBackendReply({ reply: "⚠️ " + msg, isError: true });
    } finally {
      clearTimeout(timer);
      removeThinkingIndicator(thinkingId);
      askBtn.disabled = false;
    }
   } 
  function getActiveCategory() {
    const activeTab = document.querySelector(".filter-tab.active");
    return activeTab ? activeTab.getAttribute("data-filter") : "all";
  }

  function filterMemoryCards(query, category) {
    const cards = memoryCardsContainer.querySelectorAll(".memory-card");
    let matchCount = 0;

    cards.forEach((card) => {
      const cardCategory = card.getAttribute("data-category");
      const title = card.querySelector("h4").textContent.toLowerCase();
      const body = card.querySelector("p").textContent.toLowerCase();

      const matchesQuery = !query || title.includes(query) || body.includes(query);
      const matchesCategory = category === "all" || cardCategory === category;

      if (matchesQuery && matchesCategory) {
        card.style.display = "flex";
        matchCount++;
      } else {
        card.style.display = "none";
      }
    });

    memoryCountBadge.textContent = `${matchCount} active`;
  }
});

/**
 * Backend Connectivity Checker
 */
async function checkBackendStatus(badgeElement) {
  if (!badgeElement) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { method: "GET" });
    if (res.ok) {
      badgeElement.classList.add("online");
      badgeElement.classList.remove("offline");
      badgeElement.querySelector(".status-text").textContent = "Backend: Connected";
    } else {
      throw new Error();
    }
  } catch (err) {
    badgeElement.classList.add("offline");
    badgeElement.classList.remove("online");
    badgeElement.querySelector(".status-text").textContent = "Backend: Disconnected (Local UI)";
  }
}

/**
 * Render Message Stream Helpers
 */
function getCurrentTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function appendUserMessage(prompt, code, codeLang, errorText) {
  const chatStream = document.getElementById("chat-stream");
  const msgDiv = document.createElement("div");
  msgDiv.className = "chat-message user-msg";

  let innerHTML = `
    <div class="msg-avatar">DEV</div>
    <div class="msg-bubble">
      <div class="msg-meta">
        <span class="author">You</span>
        <span class="time">${getCurrentTime()}</span>
      </div>
      <div class="msg-content">
  `;

  if (prompt) {
    innerHTML += `<p>${escapeHtml(prompt).replace(/\n/g, "<br>")}</p>`;
  }

  if (code) {
    innerHTML += `
      <div class="code-block">
        <div class="code-header">
          <span class="code-lang">${escapeHtml(codeLang)}</span>
          <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        </div>
        <pre><code>${escapeHtml(code)}</code></pre>
      </div>
    `;
  }

  if (errorText) {
    innerHTML += `
      <div class="error-block">
        <div class="error-header">
          <span class="error-title">⚠️ Error Traceback / Log</span>
        </div>
        <pre><code>${escapeHtml(errorText)}</code></pre>
      </div>
    `;
  }

  innerHTML += `</div></div>`;
  msgDiv.innerHTML = innerHTML;
  chatStream.appendChild(msgDiv);
  chatStream.scrollTop = chatStream.scrollHeight;
}

function appendThinkingIndicator() {
  const chatStream = document.getElementById("chat-stream");
  const thinkingId = "thinking-" + Date.now();
  const div = document.createElement("div");
  div.id = thinkingId;
  div.className = "chat-message assistant-msg";
  div.innerHTML = `
    <div class="msg-avatar ai-avatar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2a5 5 0 0 1 5 5v1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v1a5 5 0 0 1-10 0v-1H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2V7a5 5 0 0 1 5-5z"></path>
        <path d="M9 12h6"></path>
      </svg>
    </div>
    <div class="msg-bubble">
      <div class="thinking-bubble">
        <div class="thinking-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
        <span>Consulting persistent project memory & analyzing code...</span>
      </div>
    </div>
  `;
  chatStream.appendChild(div);
  chatStream.scrollTop = chatStream.scrollHeight;
  return thinkingId;
}

function removeThinkingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function appendAssistantMessage(data) {
  const chatStream = document.getElementById("chat-stream");
  const msgDiv = document.createElement("div");
  msgDiv.className = "chat-message assistant-msg";

  let innerHTML = `
    <div class="msg-avatar ai-avatar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2a5 5 0 0 1 5 5v1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v1a5 5 0 0 1-10 0v-1H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2V7a5 5 0 0 1 5-5z"></path>
        <path d="M9 12h6"></path>
      </svg>
    </div>
    <div class="msg-bubble">
      <div class="msg-meta">
        <span class="author">DevMind AI</span>
        <span class="time">${getCurrentTime()}</span>
        <span class="recalled-chip">
          <span class="chip-sparkle">✦</span> Recalled: ${data.recalledId || "Project Context"}
        </span>
      </div>
      <div class="msg-content">
  `;

  if (data.recalledTitle && data.recalledExplanation) {
    innerHTML += `
      <div class="memory-callout">
        <div class="callout-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span>Persistent Memory [${escapeHtml(data.recalledId)}]: ${escapeHtml(data.recalledTitle)}</span>
        </div>
        <p>${escapeHtml(data.recalledExplanation)}</p>
      </div>
    `;
  }

  innerHTML += `<p>${data.summary}</p>`;

  if (data.codeSnippet) {
    innerHTML += `
      <div class="code-block">
        <div class="code-header">
          <span class="code-lang">${data.codeLang || "python"} (Verified Solution)</span>
          <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        </div>
        <pre><code>${escapeHtml(data.codeSnippet)}</code></pre>
      </div>
    `;
  }

  if (data.guidance) {
    innerHTML += `<p>${data.guidance}</p>`;
  }

  innerHTML += `</div></div>`;
  msgDiv.innerHTML = innerHTML;
  chatStream.appendChild(msgDiv);
  chatStream.scrollTop = chatStream.scrollHeight;
}

/**
 * Intelligent Contextual Reply Generator (Demonstrates Persistent Memory)
 */
function generateContextualReply(prompt, code, errorText) {
  const lower = (prompt + " " + code + " " + errorText).toLowerCase();

  if (lower.includes("jwt") || lower.includes("token") || lower.includes("auth") || lower.includes("blacklist")) {
    return {
      recalledId: "MEM-007",
      recalledTitle: "Redis Token Blacklist Race Condition Resolution",
      recalledExplanation: "In Commit #112, we migrated token invalidation from standalone Redis DEL keys to a high-speed SETNX with TTL. This prevents race conditions during concurrent logout requests.",
      summary: "I analyzed your authentication request against our established security policies. In ShopSphere-API, all revoked tokens must check against Redis with atomic SETNX operations.",
      codeLang: "python",
      codeSnippet: `async def revoke_user_token(token_jti: str, expires_in_seconds: int = 900):\n    # Atomically register revocation with TTL matching JWT expiration\n    redis_key = f"revoked_token:{token_jti}"\n    success = await redis_client.set(redis_key, "revoked", ex=expires_in_seconds, nx=True)\n    return bool(success)`,
      guidance: "Make sure your authentication dependency wraps token verification in this check before dispatching request context."
    };
  }

  if (lower.includes("webhook") || lower.includes("stripe") || lower.includes("idempotency") || lower.includes("payment")) {
    return {
      recalledId: "MEM-011",
      recalledTitle: "Stripe Webhook Idempotency Architecture",
      recalledExplanation: "Per our architecture guidelines established on June 14, duplicate webhook calls from Stripe must be guarded with a transactional idempotency check on 'event_id'.",
      summary: "I checked our persistent webhook rules. Stripe guarantees at-least-once delivery, which causes duplicate charging if events aren't deduplicated before invoice execution.",
      codeLang: "python",
      codeSnippet: `@router.post("/webhooks/stripe")\nasync def handle_stripe_webhook(event: StripeEvent, db: AsyncSession = Depends(get_db)):\n    # 1. Check idempotency in Postgres\n    existing = await db.scalar(select(ProcessedWebhook).where(ProcessedWebhook.event_id == event.id))\n    if existing:\n        return {"status": "already_processed"}\n    \n    # 2. Process and record atomically\n    db.add(ProcessedWebhook(event_id=event.id, status="completed"))\n    await db.commit()\n    return {"status": "success"}`,
      guidance: "This safeguards against double-charging customers during retry spikes."
    };
  }

  if (lower.includes("pool") || lower.includes("timeout") || lower.includes("leak") || lower.includes("postgres") || lower.includes("db")) {
    return {
      recalledId: "MEM-004",
      recalledTitle: "SQLAlchemy Async Session Pool Management",
      recalledExplanation: "Recalled from Memory Node #MEM-004: PgBouncer is in transaction pooling mode. Open sessions must not be held across asynchronous I/O bounds or HTTP calls.",
      summary: "Your database connection exhaustion is caused by holding the async DB connection while awaiting asynchronous tasks or external I/O.",
      codeLang: "python",
      codeSnippet: `# Correct session isolation pattern:\nasync def fetch_and_process():\n    async with async_session_maker() as session:\n        data = await session.scalars(select(Record))\n    # Connection is released here!\n    await external_api_sync(data)`,
      guidance: "By releasing the connection back to the QueuePool before running worker operations, throughput increases by over 400% without starving pool connections."
    };
  }

  // Default intelligent assistant response
  return {
    recalledId: "MEM-001",
    recalledTitle: "ShopSphere Architecture Overview",
    recalledExplanation: "DevMind persistent memory stores your project's technology stack (FastAPI, SQLAlchemy 2.0 Async, PostgreSQL 15, Redis 7).",
    summary: `I processed your inquiry: <em>"${prompt || 'Code inspection request'}"</em>. Cross-referencing our 14 active memory nodes confirms this aligns with our current architecture specifications.`,
    codeLang: "python",
    codeSnippet: `# Verified implementation adhering to active project memory constraints\ndef execute_task():\n    # Checked against persistent project architecture\n    return {"status": "validated", "memory_recalled": True}`,
    guidance: "You can pin any new architecture rule or bug resolution directly to the Memory Panel on the right to keep it persistent."
  };
}
async function loadHindsightMemories() {
  const container = document.getElementById("memory-cards-container");

  try {
    const response = await fetch(`${API_BASE_URL}/api/memory/recall`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "DevMind AI project architecture, technology stack and verified debugging solutions"
      })
    });
function renderMemoryCards() {
  const container = document.getElementById("memory-cards-container");
  const countBadge = document.getElementById("memory-count-badge");

  if (!container) return;

  container.innerHTML = "";

  if (!projectMemories.length) {
    container.textContent = "No memories found.";
    if (countBadge) countBadge.textContent = "0 active";
    return;
  }

  projectMemories.forEach((memory, index) => {
    const card = document.createElement("div");
    card.className = "memory-card";
    card.setAttribute("data-category", "all");

    const title = document.createElement("h4");
    title.textContent = memory.title || `Hindsight Memory ${index + 1}`;

    const body = document.createElement("p");
    body.textContent = memory.content || "";

    card.appendChild(title);
    card.appendChild(body);
    container.appendChild(card);
  });

  if (countBadge) {
    countBadge.textContent = `${projectMemories.length} active`;
  }
}

    if (!response.ok) throw new Error("Memory retrieval failed.");

    const data = await response.json();

    projectMemories = (data.memories || []).map((item, index) => ({
      title: `Hindsight Memory ${index + 1}`,
      content: String(item)
    }));

    renderMemoryCards();
  } catch (error) {
    console.error("Hindsight memory loading failed:", error);
    container.textContent = "Unable to load Hindsight memories. Check backend connection.";
  }
}

    

/**
 * One-Click Copy Code Handler
 */
function copyCode(button) {
  const pre = button.closest(".code-block").querySelector("pre code");
  if (!pre) return;

  const textToCopy = pre.innerText || pre.textContent;
  navigator.clipboard.writeText(textToCopy).then(() => {
    const originalText = button.textContent;
    button.textContent = "Copied! ✓";
    button.style.borderColor = "var(--cyan-primary)";
    button.style.color = "var(--cyan-light)";

    setTimeout(() => {
      button.textContent = originalText;
      button.style.borderColor = "";
      button.style.color = "";
    }, 2000);
  }).catch((err) => {
    console.error("Clipboard copy failed:", err);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadHindsightMemories);
} else {
  loadHindsightMemories();
}
 