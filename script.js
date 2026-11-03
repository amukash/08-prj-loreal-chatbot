
"use strict";

// ============================================
// L'ORÉAL BEAUTY ASSISTANT
// Complete Frontend JavaScript
// ============================================


// 1. DOM ELEMENTS
// ============================================

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");


// 2. CLOUDFLARE WORKER API
// ============================================

const API_ENDPOINT =
  "https://loreal-chat-proxy.amukash.workers.dev";


// 3. AI SYSTEM PROMPT
// ============================================

const systemPrompt = `
You are L'Oréal Beauty Assistant, a friendly and knowledgeable
virtual beauty consultant.

Your goal is to help users discover beauty products, understand
skincare ingredients, and create personalized beauty routines.

AREAS OF EXPERTISE:

SKINCARE:
- Oily skin
- Dry skin
- Combination skin
- Sensitive skin
- Acne-prone skin
- Dark spots
- Uneven skin tone
- Skin hydration
- Fine lines and wrinkles
- Skincare routines

HAIRCARE:
- Curly, straight, wavy, and coily hair
- Hair treatments
- Shampoos and conditioners
- Hair hydration
- Scalp care

MAKEUP:
- Foundation
- Concealer
- Mascara
- Lip products
- Makeup routines
- Product recommendations

FRAGRANCES:
- Perfumes
- Fragrance recommendations
- Fragrance preferences

L'ORÉAL PRODUCTS:
- Recommend relevant L'Oréal products.
- Explain product benefits.
- Explain ingredients and their purposes.
- Help customers choose products based on their needs.

IMPORTANT GUIDELINES:

1. Always be friendly, professional, and welcoming.

2. Ask questions when necessary to understand the user's
skin type, concerns, preferences, and budget.

3. Provide personalized recommendations rather than
giving everyone the same routine.

4. When recommending products, explain:
   - What the product does.
   - Why it may help.
   - How to use it.
   - When to use it.

5. Provide morning and evening routines when requested.

6. Recommend sunscreen as part of morning skincare.

7. Introduce active skincare ingredients gradually.

8. Never promise to cure skin conditions.

9. Never invent L'Oréal product names, ingredients,
prices, or availability. If uncertain, say so.

10. Recommend consulting a dermatologist for persistent
or severe skin concerns.

11. If someone asks about unrelated topics, politely
explain that you specialize in beauty and L'Oréal products.

Keep answers conversational, helpful, and easy to understand.
`;


// 4. CONVERSATION HISTORY
// ============================================

const conversation = [
  {
    role: "system",
    content: systemPrompt
  }
];


// 5. DISPLAY CHAT MESSAGES
// ============================================

function appendMessage(role, text, options = {}) {

  const container = document.createElement("div");

  container.className =
    "msg " + (role === "user" ? "user" : "ai");

  // Display user's original question above AI response
  if (role === "ai" && options.userEcho) {

    const echo = document.createElement("span");

    echo.className = "user-echo";
    echo.textContent = options.userEcho;

    container.appendChild(echo);
  }

  // Create message bubble
  const bubble = document.createElement("div");

  bubble.className = "bubble";
  bubble.textContent = text;

  container.appendChild(bubble);

  // Add message to chat
  chatWindow.appendChild(container);

  // Automatically scroll to latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return container;
}


// 6. LIMIT CONVERSATION HISTORY
// ============================================

function trimConversation(maxItems = 16) {

  // Keep system prompt and recent conversation
  const recentMessages = conversation
    .slice(1)
    .slice(-maxItems);

  return [
    conversation[0],
    ...recentMessages
  ];
}


// 7. EXTRACT AI RESPONSE
// ============================================

function extractReply(data) {

  if (typeof data === "string") {
    return data.trim();
  }

  let reply =
    data?.reply ||
    data?.choices?.[0]?.message?.content ||
    data?.output_text ||
    data?.content ||
    data?.assistant;

  // Handle alternative response formats
  if (Array.isArray(reply)) {

    reply = reply
      .map(item => {

        if (typeof item === "string") {
          return item;
        }

        return item?.text || item?.content || "";

      })
      .join("\n");

  }

  return typeof reply === "string"
    ? reply.trim()
    : "";
}


// 8. CONNECT TO CLOUDFLARE WORKER
// ============================================

async function fetchAssistantReply(messages) {

  const response = await fetch(API_ENDPOINT, {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      messages: messages
    })

  });

  // Read server response
  const responseText = await response.text();

  let data;

  try {

    data = JSON.parse(responseText);

  } catch {

    throw new Error(
      "The server returned an invalid response."
    );

  }

  // Check for server errors
  if (!response.ok) {

    throw new Error(
      data?.error ||
      data?.message ||
      `Server error: ${response.status}`
    );

  }

  // Extract AI response
  const reply = extractReply(data);

  if (!reply) {

    throw new Error(
      "The AI returned an empty response."
    );

  }

  return reply;
}


// 9. HANDLE CHAT SUBMISSION
// ============================================

chatForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  // Get user message
  const text = userInput.value.trim();

  if (!text) return;

  // Display user message
  appendMessage("user", text);

  // Clear input
  userInput.value = "";

  // Save message to conversation
  conversation.push({
    role: "user",
    content: text
  });

  // Create loading message
  const placeholder = appendMessage(
    "ai",
    "Thinking...",
    {
      userEcho: text
    }
  );

  const bubble = placeholder.querySelector(".bubble");

  // Disable input while waiting
  const sendButton = chatForm.querySelector("button");

  userInput.disabled = true;

  if (sendButton) {
    sendButton.disabled = true;
  }

  try {

    // Prepare conversation history
    const messages = trimConversation(16);

    // Request AI response
    const reply = await fetchAssistantReply(messages);

    // Display response
    bubble.textContent = reply;

    // Save AI response
    conversation.push({
      role: "assistant",
      content: reply
    });

  } catch (error) {

    // Log actual error for debugging
    console.error(
      "L'Oréal Beauty Assistant Error:",
      error
    );

    // Display friendly error
    bubble.textContent =
      "I'm sorry! I'm having trouble connecting right now. Please try again shortly.";

    // Do not save temporary errors as AI responses

  } finally {

    // Re-enable input
    userInput.disabled = false;

    if (sendButton) {
      sendButton.disabled = false;
    }

    // Return focus to input
    userInput.focus();

    // Scroll to latest message
    chatWindow.scrollTop = chatWindow.scrollHeight;

  }

});


// 10. INITIAL GREETING
// ============================================

appendMessage(
  "ai",
  "👋 Hello! Welcome to L'Oréal Beauty Assistant! I'm here to help you discover beauty products, build personalized skincare routines, explore ingredients, and find the right beauty solutions. What can I help you with today?"
);
