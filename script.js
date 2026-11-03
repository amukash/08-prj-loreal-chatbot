
"use strict";

// ==========================================
// L'ORÉAL BEAUTY ASSISTANT
// Frontend JavaScript
// ==========================================

// DOM Elements
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Cloudflare Worker API endpoint
const API_ENDPOINT =
  "https://loreal-chat-proxy.amukash.workers.dev";

// ==========================================
// AI SYSTEM PROMPT
// ==========================================

const systemPrompt = `
You are the official L'Oréal Beauty Assistant.

Your purpose is to help users discover beauty products
and develop personalized beauty routines.

YOUR AREAS OF EXPERTISE:

1. Skincare
- Oily skin
- Dry skin
- Combination skin
- Sensitive skin
- Acne-prone skin
- Uneven skin tone
- Dark spots
- Hydration
- Anti-aging

2. Haircare
- Hair types and textures
- Hair treatments
- Shampoos and conditioners
- Hair growth and scalp care

3. Makeup
- Foundations
- Concealers
- Lip products
- Mascara
- Makeup routines

4. Fragrances
- Perfumes
- Fragrance recommendations

5. L'Oréal Products
- Recommend relevant L'Oréal products.
- Explain product benefits and ingredients.
- Help users select products based on their needs.
- Never invent product names, ingredients, or availability.

RESPONSE GUIDELINES:

- Be friendly, professional, and welcoming.
- Keep responses clear and easy to understand.
- Give practical recommendations.
- Personalize advice based on the user's skin or hair type.
- When recommending skincare, explain how to use products.
- Include morning and evening routines when appropriate.
- Recommend sunscreen as part of morning skincare.
- Introduce active ingredients gradually.
- Never promise to cure skin conditions.
- Recommend a dermatologist for persistent or severe skin concerns.

If a user asks an unrelated question, politely explain
that you specialize in L'Oréal and beauty-related topics.

Always make the experience feel like a personal beauty consultation.
`;

// ==========================================
// CONVERSATION HISTORY
// ==========================================

const conversation = [
  {
    role: "system",
    content: systemPrompt
  }
];

// ==========================================
// DISPLAY CHAT MESSAGES
// ==========================================

function appendMessage(role, text, options = {}) {

  const container = document.createElement("div");

  container.className =
    "msg " + (role === "user" ? "user" : "ai");

  if (role === "ai" && options.userEcho) {

    const echo = document.createElement("span");

    echo.className = "user-echo";
    echo.textContent = options.userEcho;

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

// ==========================================
// LIMIT CONVERSATION HISTORY
// ==========================================

function trimConversation(maxItems = 16) {

  const recentMessages = conversation
    .slice(1)
    .slice(-maxItems);

  return [
    conversation[0],
    ...recentMessages
  ];
}

// ==========================================
// EXTRACT AI RESPONSE
// ==========================================

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

  if (Array.isArray(reply)) {

    reply = reply
      .map(item => {
        if (typeof item === "string") return item;
        return item?.text || item?.content || "";
      })
      .join("\n");
  }

  return typeof reply === "string"
    ? reply.trim()
    : "";
}

// ==========================================
// CONNECT TO CLOUDFLARE WORKER
// ==========================================

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

  const rawResponse = await response.text();

  let data;

  try {

    data = JSON.parse(rawResponse);

  } catch {

    throw new Error(
      "Invalid response from the server."
    );

  }

  if (!response.ok) {

    throw new Error(
      data?.error ||
      data?.message ||
      `Server error: ${response.status}`
    );

  }

  const reply = extractReply(data);

  if (!reply) {

    throw new Error(
      "The AI returned an empty response."
    );

  }

  return reply;
}

// ==========================================
// CHAT SUBMISSION
// ==========================================

chatForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  const text = userInput.value.trim();

  if (!text) return;

  // Display user message
  appendMessage("user", text);

  // Clear input
  userInput.value = "";

  // Save user message
  conversation.push({
    role: "user",
    content: text
  });

  // Create loading message
  const placeholder = appendMessage(
    "ai",
    "Thinking...",
    { userEcho: text }
  );

  const bubble = placeholder.querySelector(".bubble");

  const sendButton = chatForm.querySelector("button");

  // Disable input while processing
  userInput.disabled = true;

  if (sendButton) {
    sendButton.disabled = true;
  }

  try {

    // Prepare conversation
    const messages = trimConversation(16);

    // Get AI response
    const reply = await fetchAssistantReply(messages);

    // Display response
    bubble.textContent = reply;

    // Save assistant response
    conversation.push({
      role: "assistant",
      content: reply
    });

  } catch (error) {

    console.error(
      "L'Oréal Assistant Error:",
      error
    );

    bubble.textContent =
      "I'm sorry! I'm having trouble connecting right now. Please try again shortly.";

  } finally {

    // Re-enable chat
    userInput.disabled = false;

    if (sendButton) {
      sendButton.disabled = false;
    }

    userInput.focus();

    chatWindow.scrollTop = chatWindow.scrollHeight;

  }

});

// ==========================================
// INITIAL GREETING
// ==========================================

appendMessage(
  "ai",
  "👋 Hello! Welcome to L'Oréal Beauty Assistant! I'm here to help you discover products, build skincare routines, explore ingredients, and find beauty solutions. What can I help you with today?"
);


export default {

  async fetch(request, env) {

    // CORS configuration
    const corsHeaders = {

      "Access-Control-Allow-Origin": "*",

      "Access-Control-Allow-Methods":
        "POST, OPTIONS",

      "Access-Control-Allow-Headers":
        "Content-Type"

    };

    // Handle browser preflight
    if (request.method === "OPTIONS") {

      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });

    }

    // Only allow POST requests
    if (request.method !== "POST") {

      return Response.json(
        {
          error: "Method not allowed"
        },
        {
          status: 405,
          headers: corsHeaders
        }
      );

    }

    try {

      // Read incoming messages
      const body = await request.json();

      const messages = body.messages;

      if (
        !Array.isArray(messages) ||
        messages.length === 0
      ) {

        return Response.json(
          {
            error: "Invalid messages provided."
          },
          {
            status: 400,
            headers: corsHeaders
          }
        );

      }

      // Check API key
      if (!env.OPENAI_API_KEY) {

        throw new Error(
          "OPENAI_API_KEY is missing from Cloudflare."
        );

      }

      // Connect to OpenAI
      const openAIResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {

          method: "POST",

          headers: {

            "Content-Type": "application/json",

            "Authorization":
              `Bearer ${env.OPENAI_API_KEY}`

          },

          body: JSON.stringify({

            model: "gpt-4o-mini",

            messages: messages,

            temperature: 0.7,

            max_tokens: 700

          })

        }
      );

      // Read OpenAI response
      const result = await openAIResponse.json();

      // Check API errors
      if (!openAIResponse.ok) {

        console.error(
          "OpenAI Error:",
          result
        );

        return Response.json(
          {
            error:
              result?.error?.message ||
              "OpenAI API request failed."
          },
          {
            status: openAIResponse.status,
            headers: corsHeaders
          }
        );

      }

      // Extract assistant response
      const reply =
        result?.choices?.[0]?.message?.content;

      if (!reply) {

        throw new Error(
          "No response received from OpenAI."
        );

      }

      // Return response to frontend
      return Response.json(
        {
          reply: reply
        },
        {
          status: 200,
          headers: corsHeaders
        }
      );

    } catch (error) {

      console.error(
        "Worker Error:",
        error
      );

      return Response.json(
        {
          error:
            error.message ||
            "Internal server error."
        },
        {
          status: 500,
          headers: corsHeaders
        }
      );

    }

  }

};

