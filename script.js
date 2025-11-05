"use strict";

// L'Oréal Chat — clean client script
// - Conversation history is maintained and sent to your Cloudflare Worker
// - Keeps a demo fallback so the UI stays testable during development

// DOM elements
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// System prompt (assistant personality)
const systemPrompt =
  "You are a helpful L'Oréal beauty assistant. You can answer questions about L'Oréal products, skincare routines, haircare, fragrances, and makeup. If asked about unrelated topics, politely decline.";

// API endpoint (your Cloudflare Worker)
const API_ENDPOINT = "https://loreal-chat-proxy.amukash.workers.dev";

// Conversation history (starts with system prompt)
const conversation = [{ role: "system", content: systemPrompt }];

// Append a message bubble to the chat window
function appendMessage(role, text, opts = {}) {
  const container = document.createElement("div");
  container.className = "msg " + (role === "user" ? "user" : "ai");

  if (role === "ai" && opts.userEcho) {
    const echo = document.createElement("span");
    echo.className = "user-echo";
    echo.textContent = opts.userEcho;
    container.appendChild(echo);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  container.appendChild(bubble);

  chatWindow.appendChild(container);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return container;
}

// Conservative client-side off-topic guard
function simpleOffTopicCheck(text) {
  const offTopic = [
    "politics",
    "president",
    "election",
    "stock",
    "crypto",
    "bitcoin",
    "porn",
    "torrent",
    "torrenting",
  ];
  const lower = text.toLowerCase();
  return offTopic.some((k) => lower.includes(k));
}

// Limit conversation length before sending to control token usage
function trimConversation(maxItems = 12) {
  // keep the system prompt plus the last (maxItems) user/assistant pairs
  const kept = [conversation[0]]; // system prompt
  const tail = conversation.slice(-maxItems);
  return kept.concat(tail);
}

// Send conversation to API and return assistant reply (or throw)
async function fetchAssistantReply(messages) {
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Worker error ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const reply =
    data?.choices?.[0]?.message?.content || data?.reply || data?.content;
  return reply;
}

// Submit handler
chatForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  // Display user's message
  appendMessage("user", text);
  userInput.value = "";

  // Save to conversation
  conversation.push({ role: "user", content: text });

  // Off-topic guard
  if (simpleOffTopicCheck(text)) {
    const refusal =
      "I'm sorry, I can only answer questions related to L'Oréal and beauty.";
    appendMessage("ai", refusal, { userEcho: text });
    conversation.push({ role: "assistant", content: refusal });
    userInput.focus();
    return;
  }

  // Show placeholder
  const placeholder = appendMessage("ai", "Thinking...", { userEcho: text });

  // Disable input while waiting
  const sendBtn = chatForm.querySelector("button");
  userInput.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  try {
    // Trim conversation to keep payload small
    const messagesToSend = trimConversation(16);
    const reply = await fetchAssistantReply(messagesToSend);

    if (!reply) {
      // show demo fallback when reply is empty
      const demo =
        "(Demo) I can't reach your API endpoint or it returned no reply. Confirm the worker is deployed and OPENAI_API_KEY is set.";
      const bubble = placeholder.querySelector(".bubble");
      if (bubble) bubble.textContent = demo;
      else placeholder.textContent = demo;
      conversation.push({ role: "assistant", content: demo });
    } else {
      const bubble = placeholder.querySelector(".bubble");
      if (bubble) bubble.textContent = reply;
      else placeholder.textContent = reply;
      conversation.push({ role: "assistant", content: reply });
    }
  } catch (err) {
    console.error("Chat request failed", err);
    const fallback =
      "(Demo) Unable to reach API. Update API_ENDPOINT to your deployed worker or server. Example answer: L'Oréal offers targeted serums to hydrate skin and improve texture.";
    const bubble = placeholder.querySelector(".bubble");
    if (bubble) bubble.textContent = fallback;
    else placeholder.textContent = fallback;
    conversation.push({ role: "assistant", content: fallback });
  } finally {
    userInput.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    userInput.focus();
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});

// Initial greeting
appendMessage(
  "ai",
  "👋 Hello! I'm the L'Oréal assistant. Ask me about products, routines, or ingredients."
);
