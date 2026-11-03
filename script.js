/* =========================================
   L'ORÉAL BEAUTY ASSISTANT
========================================= */

const API_ENDPOINT = "https://loreal-chat-proxy.amukash.workers.dev";


/* =========================================
   AI SYSTEM INSTRUCTIONS
========================================= */

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

GUIDELINES:
1. Be friendly, welcoming, and conversational.
​2. Give clear and practical recommendations.
3. Ask follow-up questions when needed.
4. Explain how and when to use products.
5. Never diagnose medical conditions.
6. Recommend patch testing when appropriate.
7. Encourage users with persistent or severe skin concerns to consult a dermatologist.
8. Do not invent L'Oréal product names or ingredients.
9. Politely redirect unrelated questions toward beauty topics.
10. Keep responses organized and easy to read.

FORMATTING RULES:
1. Use clear, bold section headings.
​2. Organize skincare routines into Morning Routine and Evening Routine when appropriate.
3. NEVER number skincare steps.
4. Use bold labels for steps, such as **Cleanser**, **Toner**, **Serum**, and **Moisturizer**.
5. Put each skincare step in its own paragraph.
6. Use bullet points only for short explanations, product examples, or additional tips.
7. Do not use nested lists.
8. Leave a blank line between each skincare step.
9. Keep responses clean, elegant, and easy to read.
10. Avoid unnecessary formatting and long paragraphs.
11. Use standard Markdown without escaping symbols with backslashes.
12. Do not repeat list numbering or use numbered lists.

PRODUCT RECOMMENDATIONS:
- Recommend products only when you have reliable information about them.
- Do not invent product names, ingredients, or claims.
- Explain briefly why a product or ingredient may be suitable.
- Remind users that products should be selected according to their skin type and sensitivities.
`;


let conversation = [
  {
    role: "system",
    content: SYSTEM_PROMPT
  }
];


/* =========================================
   HTML ELEMENTS
========================================= */

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");


/* =========================================
   FORMAT BOLD AND ITALIC TEXT
========================================= */

function addFormattedText(parent, text) {

  // Remove escaped Markdown characters.
  text = text.replace(/\\([*#])/g, "$1");

  // Detect bold and italic formatting.
  const pattern = /(\*\*.+?\*\*|\*[^*]+?\*)/g;

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {

    // Add regular text.
    parent.appendChild(
      document.createTextNode(
        text.slice(lastIndex, match.index)
      )
    );

    const token = match[0];

    let element;

    if (token.startsWith("**")) {

      element = document.createElement("strong");
      element.textContent = token.slice(2, -2);

    } else {

      element = document.createElement("em");
      element.textContent = token.slice(1, -1);

    }

    parent.appendChild(element);

    lastIndex = pattern.lastIndex;
  }

  // Add remaining text.
  parent.appendChild(
    document.createTextNode(text.slice(lastIndex))
  );
}


/* =========================================
   ORGANIZE AI RESPONSES
========================================= */

function renderAssistantMessage(bubble, message) {

  bubble.replaceChildren();

  // Clean up the AI response.
  let text = message
    .replace(/\r\n/g, "\n")
    .replace(/\\([*#])/g, "$1");

  // Separate headings, lists, and bullet points
  // if they are returned on the same line.
  text = text
    .replace(/[ \t]+(?=#{1,3}\s)/g, "\n")
    .replace(/[ \t]+(?=-|\*|\d+\.\s)/g, "\n");

  const lines = text.split("\n");

  let currentList = null;
  let currentOrderedList = null;

  lines.forEach((line) => {

    const trimmed = line.trim();

    // Ignore empty lines.
    if (!trimmed) {
      currentList = null;
      currentOrderedList = null;
      return;
    }

    // SECTION HEADINGS
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);

    if (headingMatch) {
      currentList = null;
      currentOrderedList = null;

      const heading = document.createElement("h3");
      addFormattedText(heading, headingMatch[1]);
      bubble.appendChild(heading);
      return;
    }

    // ORDERED LISTS (1., 2., 3., etc.)
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);

    if (orderedMatch) {
      currentList = null;

      if (!currentOrderedList) {
        currentOrderedList = document.createElement("ol");
        bubble.appendChild(currentOrderedList);
      }

      const item = document.createElement("li");
      addFormattedText(item, orderedMatch[1]);
      currentOrderedList.appendChild(item);
      return;
    }

    // BULLET POINTS (- or *)
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);

    if (bulletMatch) {
      currentOrderedList = null;

      if (!currentList) {
        currentList = document.createElement("ul");
        bubble.appendChild(currentList);
      }

      const item = document.createElement("li");
      addFormattedText(item, bulletMatch[1]);
      currentList.appendChild(item);
      return;
    }

    // REGULAR PARAGRAPHS
    currentList = null;
    currentOrderedList = null;

    const paragraph = document.createElement("p");
    addFormattedText(paragraph, trimmed);
    bubble.appendChild(paragraph);

  });
}


/* =========================================
   DISPLAY CHAT MESSAGES
========================================= */

function appendMessage(role, message) {

  const messageRow = document.createElement("div");

  messageRow.className =
    role === "user" ? "msg user" : "msg ai";

  const bubble = document.createElement("div");

  bubble.className = "bubble";

  if (role === "assistant") {

    renderAssistantMessage(bubble, message);

  } else {

    bubble.textContent = message;

  }

  messageRow.appendChild(bubble);

  chatWindow.appendChild(messageRow);

  chatWindow.scrollTop = chatWindow.scrollHeight;

  return bubble;
}


/* =========================================
   LIMIT CONVERSATION HISTORY
========================================= */

function trimConversation() {

  const maximumMessages = 21;

  if (conversation.length > maximumMessages) {

    conversation = [
      conversation[0],
      ...conversation.slice(-(maximumMessages - 1))
    ];

  }
}


/* =========================================
   CONNECT TO CLOUDFLARE WORKER
========================================= */

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


/* =========================================
   HANDLE USER MESSAGES
========================================= */

chatForm.addEventListener("submit", async function(event) {

  event.preventDefault();

  const message = userInput.value.trim();

  if (!message || sendBtn.disabled) return;

  // Display user's message.
  appendMessage("user", message);

  conversation.push({
    role: "user",
    content: message
  });

  trimConversation();

  // Clear input.
  userInput.value = "";

  // Disable button while waiting.
  sendBtn.disabled = true;

  // Display loading message.
  const loadingBubble = appendMessage(
    "assistant",
    "Thinking..."
  );

  try {

    // Get AI response.
    const reply = await fetchAssistantReply();

    // Display organized response.
    renderAssistantMessage(loadingBubble, reply);

    // Save response.
    conversation.push({
      role: "assistant",
      content: reply
    });

    trimConversation();

  } catch (error) {

    console.error("L'Oréal Assistant Error:", error);

    loadingBubble.textContent =
      "I'm sorry! I'm having trouble connecting right now. Please try again shortly.";

    // Remove failed user message from conversation history.
    const lastMessage = conversation[conversation.length - 1];

    if (
      lastMessage?.role === "user" &&
      lastMessage.content === message
    ) {

      conversation.pop();

    }

  } finally {

    sendBtn.disabled = false;

    userInput.focus();

    chatWindow.scrollTop = chatWindow.scrollHeight;

  }

});


/* =========================================
   WELCOME MESSAGE
========================================= */

appendMessage(
  "assistant",
  `👋 Hello! Welcome to L'Oréal Beauty Assistant!

I'm here to help you discover products, build skincare routines, explore ingredients, and find beauty solutions.

What can I help you with today?`
);
