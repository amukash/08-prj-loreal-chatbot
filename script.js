
/* ==========================================
   L'ORÉAL BEAUTY ASSISTANT
========================================== */

// Cloudflare Worker endpoint
const API_ENDPOINT =
  "https://loreal-chat-proxy.amukash.workers.dev";

// AI instructions
const SYSTEM_PROMPT = `
You are the L'Oréal Beauty Assistant, a friendly and knowledgeable beauty advisor.

Your purpose is to help users discover beauty products and solutions.

You can assist with:
- Skincare routines and product recommendations.
- Oily, dry, combination, sensitive, and acne-prone skin.
- Haircare routines and hair products.
- Makeup recommendations and application tips.
- Fragrances and beauty products.
- Skincare and beauty ingredients.

Guidelines:
1. Be friendly, welcoming, and conversational.
2. Give clear and practical recommendations.
3. Ask follow-up questions when needed.
4. Explain how and when to use products.
5. Never diagnose medical conditions.
6. Recommend patch testing when appropriate.
7. Encourage users with persistent or severe skin concerns to consult a dermatologist.
8. Do not invent L'Oréal product names or ingredients.
9. Politely redirect unrelated questions toward beauty topics.
10. Keep responses organized and easy to understand.
`;

// Conversation history
let conversation = [
  {
    role: "system",
    content: SYSTEM_PROMPT
  }
];

// HTML elements
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

// Check HTML elements
if (!chatForm || !userInput || !chatWindow || !sendBtn) {
  console.error("L'Oréal Assistant: Required HTML elements are missing.");
}

// ==========================================
// DISPLAY CHAT MESSAGES
// ==========================================

function appendMessage(role, message) {
  const messageRow = document.createElement("div");

  // Match the existing CSS classes
  messageRow.className =
    role === "user" ? "msg user" : "msg ai";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  bubble.textContent = message;

  messageRow.appendChild(bubble);
  chatWindow.appendChild(messageRow);

  chatWindow.scrollTop = chatWindow.scrollHeight;

  return bubble;
}

// ==========================================
// LIMIT CONVERSATION HISTORY
// ==========================================

function trimConversation() {
  const maximumMessages = 21;

  if (conversation.length > maximumMessages) {
    conversation = [
      conversation[0],
      ...conversation.slice(-(maximumMessages - 1))
    ];
  }
}

// ==========================================
// CONNECT TO OPENAI
// ==========================================

async function fetchAssistantReply() {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      messages: conversation
    })
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(
      data.error || `Server error: ${response.status}`
    );
  }

  if (!data.reply) {
    throw new Error("The assistant returned an empty response.");
  }

  return data.reply;
}

// ==========================================
// HANDLE USER SUBMISSIONS
// ==========================================

chatForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const message = userInput.value.trim();

  if (!message || sendBtn.disabled) {
    return;
  }

  // Display user message
  appendMessage("user", message);

  // Save user message
  conversation.push({
    role: "user",
    content: message
  });

  trimConversation();

  // Clear input
  userInput.value = "";

  // Disable button while waiting
  sendBtn.disabled = true;

  // Show loading message
  const loadingBubble = appendMessage(
    "assistant",
    "Thinking..."
  );

  try {
    // Get AI response
    const reply = await fetchAssistantReply();

    // Display AI response
    loadingBubble.textContent = reply;

    // Save AI response
    conversation.push({
      role: "assistant",
      content: reply
    });

    trimConversation();

  } catch (error) {
    console.error("L'Oréal Assistant Error:", error);

    loadingBubble.textContent =
      "I'm sorry! I'm having trouble connecting right now. Please try again shortly.";

    // Remove unsuccessful user message
    conversation.pop();

  } finally {
    // Re-enable button
    sendBtn.disabled = false;

    // Return focus to input
    userInput.focus();

    // Scroll to latest message
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});

// ==========================================
// INITIAL WELCOME MESSAGE
// ==========================================

appendMessage(
  "assistant",
  "👋 Hello! Welcome to L'Oréal Beauty Assistant! I'm here to help you discover products, build skincare routines, explore ingredients, and find beauty solutions. What can I help you with today?"
);
