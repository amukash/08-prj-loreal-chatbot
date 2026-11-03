
/* =========================================
   L'ORÉAL BEAUTY ASSISTANT
========================================= */

const API_ENDPOINT = "https://loreal-chat-proxy.amukash.workers.dev";


/* =========================================
   AI INSTRUCTIONS
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
2. Give clear and practical recommendations.
3. Ask follow-up questions when needed.
4. Explain how and when to use products.
5. Never diagnose medical conditions.
6. Recommend patch testing when appropriate.
7. Encourage users with persistent or severe skin concerns to consult a dermatologist.
8. Do not invent L'Oréal product names or ingredients.
9. Politely redirect unrelated questions toward beauty topics.
10. Keep responses organized and easy to read.

FORMATTING RULES:
1. Use **bold** for product names and important labels.
2. Use clear section headings.
3. Put each heading on its own line.
4. Use numbered lists for skincare routines and steps.
5. Use bullet points for additional tips.
6. Leave blank lines between sections.
7. Keep paragraphs short.
8. Never put the entire response in one paragraph.
9. Use normal Markdown formatting without escaping asterisks with backslashes.
`;

let conversation = [
  { role: "system", content: SYSTEM_PROMPT }
];


/* =========================================
   HTML ELEMENTS
========================================= */

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");


/* =========================================
   FORMAT TEXT
========================================= */

function addFormattedText(parent, text) {

  // Remove escaped Markdown characters.
  text = text.replace(/\\([*#])/g, "$1");

  // Detect bold and italic formatting.
  const pattern = /(\*\*.+?\*\*|\*[^*]+?\*)/g;

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {

    // Add normal text before formatting.
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

  // Normalize the response.
  let text = message
    .replace(/\r\n/g, "\n")
    .replace(/\\([*#])/g, "$1");

  // Separate headings, numbered lists, and bullet points
  // when the AI returns them on the same line.
  text = text
    .replace(/[ \t]+(?=#{1,3}\s)/g, "\n")
    .replace(/[ \t]+(?=\d+\.\s)/g, "\n")
    .replace(/[ \t]+(?=-\s)/g, "\n");

  const lines = text.split("\n");

  let currentList = null;

  function closeList() {
    currentList = null;
  }

  lines.forEach((line) => {

    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      return;
    }

    // SECTION HEADINGS
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);

    if (headingMatch) {

      closeList();

      const heading = document.createElement("h3");

      addFormattedText(heading, headingMatch[1]);

      bubble.appendChild(heading);

      return;
    }

    // NUMBERED LISTS
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);

    if (numberedMatch) {

      if (!currentList || currentList.tagName !== "OL") {

        closeList();

        currentList = document.createElement("ol");

        bubble.appendChild(currentList);
      }

      const item = document.createElement("li");

      addFormattedText(item, numberedMatch[1]);

      currentList.appendChild(item);

      return;
    }

    // BULLET LISTS
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);

    if (bulletMatch) {

      if (!currentList || currentList.tagName !== "UL") {

        closeList();

        currentList = document.createElement("ul");

        bubble.appendChild(currentList);
      }

      const item = document.createElement("li");

      addFormattedText(item, bulletMatch[1]);

      currentList.appendChild(item);

      return;
    }

    // REGULAR PARAGRAPHS
    closeList();

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

  // Disable send button while waiting.
  sendBtn.disabled = true;

  // Display loading message.
  const loadingBubble = appendMessage(
    "assistant",
    "Thinking..."
  );

  try {

    // Get AI response.
    const reply = await fetchAssistantReply();

    // Display formatted response.
    renderAssistantMessage(loadingBubble, reply);

    // Save response to conversation history.
    conversation.push({
      role: "assistant",
      content: reply
    });

    trimConversation();

  } catch (error) {

    console.error("L'Oréal Assistant Error:", error);

    loadingBubble.textContent =
      "I'm sorry! I'm having trouble connecting right now. Please try again shortly.";

    // Remove the failed user message from history.
    const lastMessage = conversation[conversation.length - 1];

    if (
      lastMessage?.role === "user" &&
      lastMessage.content === message
    ) {
      conversation.pop();
    }

  } finally {

    // Re-enable the send button.
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
