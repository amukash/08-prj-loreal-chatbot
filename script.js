// L'Oréal Beauty Assistant

const API_ENDPOINT =
  "https://loreal-chat-proxy.amukash.workers.dev";

// Instructions for the AI assistant.
const SYSTEM_PROMPT = `
You are the L'Oréal Beauty Assistant, a friendly and knowledgeable beauty advisor.

Your job is to help users with:
- Skincare routines and product recommendations.
- Oily, dry, combination, sensitive, and acne-prone skin.
- Haircare routines and hair products.
- Makeup recommendations and application tips.
- Fragrances and beauty products.
- Explaining skincare and beauty ingredients.

Guidelines:
1. Be friendly, welcoming, and conversational.
2. Give clear, practical recommendations.
3. Ask follow-up questions when needed to personalize recommendations.
4. Explain how and when to use products.
5. Do not diagnose medical conditions.
6. Recommend patch testing when appropriate.
7. Encourage users with persistent or severe skin concerns to consult a dermatologist.
8. Do not invent L'Oréal product names or claim a product has ingredients unless you are confident.
9. If a question is unrelated to beauty, politely guide the conversation back to beauty.
10. Keep responses organized and easy to understand.
`;

// Conversation history.
let conversation = [
  {
    role: "system",
    content: SYSTEM_PROMPT
  }
];

// Find the website elements.
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Display a message in the chat window.
function appendMessage(role, message) {
  const messageElement = document.createElement("div");

  messageElement.className =
    role === "user" ? "user-message" : "assistant-message";

  messageElement.textContent = message;

  chatWindow.appendChild(messageElement);

  chatWindow.scrollTop = chatWindow.scrollHeight;

  return messageElement;
}

// Keep the conversation from becoming too long.
function trimConversation() {
  const maximumMessages = 21;

  if (conversation.length > maximumMessages) {
    conversation = [
      conversation[0],
      ...conversation.slice(-(maximumMessages - 1))
    ];
  }
}

// Send the conversation to the Cloudflare Worker.
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Server error: ${response.status}`);
  }

  if (!data.reply) {
    throw new Error("The assistant did not return a response.");
  }

  return data.reply;
}

// Handle the user's message.
chatForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const message = userInput.value.trim();

  if (!message) {
    return;
  }

  // Display the user's message.
  appendMessage("user", message);

  // Add the message to conversation history.
  conversation.push({
    role: "user",
    content: message
  });

  trimConversation();

  // Clear the input field.
  userInput.value = "";

  // Temporarily display a loading message.
  const loadingMessage = appendMessage(
    "assistant",
    "Thinking..."
  );

  try {
    const reply = await fetchAssistantReply();

    // Replace the loading message with the actual response.
    loadingMessage.textContent = reply;

    // Save the assistant's response.
    conversation.push({
      role: "assistant",
      content: reply
    });

    trimConversation();

  } catch (error) {
    console.error("L'Oréal Assistant Error:", error);

    loadingMessage.textContent =
      "I'm sorry! I'm having trouble connecting right now. Please try again shortly.";

    // Remove the failed user message from the conversation
    // so it is not repeatedly sent to OpenAI.
    conversation.pop();
  }

  chatWindow.scrollTop = chatWindow.scrollHeight;
});

// Initial welcome message.
appendMessage(
  "assistant",
  "👋 Hello! Welcome to L'Oréal Beauty Assistant! I'm here to help you discover products, build skincare routines, explore ingredients, and find beauty solutions. What can I help you with today?"
);
