
/* L'ORÉAL BEAUTY ASSISTANT */

const API_ENDPOINT = "https://loreal-chat-proxy.amukash.workers.dev";

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
10. Keep responses organized and easy to read.

FORMATTING RULES:
- Use **bold** for important labels and product names.
- Use clear section headings.
- Put headings on their own lines.
- Use numbered lists for routines and steps.
- Use bullet points for additional tips.
- Leave blank lines between sections.
- Do not put the entire response in one paragraph.
- Do not escape Markdown symbols with backslashes.
`;

let conversation = [
  { role: "system", content: SYSTEM_PROMPT }
];

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");


/* FORMAT ASSISTANT RESPONSES */

function addFormattedText(parent, text) {
  // Convert escaped Markdown symbols into normal Markdown.
  text = text.replace(/\\([*#])/g, "$1");

  // Recognize bold and italic text safely using DOM elements.
  const pattern = /(\*\*.+?\*\*|\*[^*]+?\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    parent.appendChild(
      document.createTextNode(text.slice(lastIndex, match.index))
    );

    const token = match[0];
    const element = document.createElement(
      token.startsWith("**") ? "strong" : "em"
    );

    element.textContent = token.startsWith("**")
      ? token.slice(2, -2)
      : token.slice(1, -1);

    parent.appendChild(element);
    lastIndex = pattern.lastIndex;
  }

  parent.appendChild(
    document.createTextNode(text.slice(lastIndex))
  );
}


function renderAssistantMessage(bubble, message) {
  bubble.replaceChildren();

  // Normalize line endings and escaped Markdown.
  let normalized = message
    .replace(/\r\n/g, "\n")
    .replace(/\\([*#])/g, "$1");

  // Add line breaks when headings or list items are run together.
  normalized = normalized
    .replace(/\s{2,}(?=#{1,3}\s)/g, "\n")
    .replace(/\s{2,}(?=\d+\.\s)/g, "\n")
    .replace(/\s{2,}(?=-\s)/g, "\n");

  const lines = normalized.split("\n");

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

    // Section headings
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);

    if (headingMatch) {
      closeList();

      const heading = document.createElement("h3");
      addFormattedText(heading, headingMatch[1]);
      bubble.appendChild(heading);
      return;
    }

    // Numbered list
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

    // Bullet list
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

    // Regular paragraph
    closeList();

    const paragraph = document.createElement("p");
    addFormattedText(paragraph, trimmed);
    bubble.appendChild(paragraph);
  });
}


/* DISPLAY CHAT MESSAGES */

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


/* KEEP CONVERSATION FROM GETTING TOO LONG */

function trimConversation() {
  const maximumMessages = 21;

  if (conversation.length > maximumMessages) {
    conversation = [
      conversation[0],
      ...conversation.slice(-(maximumMessages - 1))
    ];
  }
}


/* CONNECT TO CLOUDFLARE WORKER */

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


/* HANDLE USER MESSAGES */

chatForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const message = userInput.value.trim();

  if (!message || sendBtn.disabled) return;

  appendMessage("user", message);

  conversation.push({
    role: "user",
    content: message
  });

  trimConversation();

  userInput.value = "";
  sendBtn.disabled = true;

  const loadingBubble = appendMessage(
    "assistant",
    "Thinking..."
  );

  try {
    const reply = await fetchAssistantReply();

    renderAssistantMessage(loadingBubble, reply);

    conversation.push({
      role: "assistant",
      content: reply
    });

    trimConversation();

  } catch (error) {
    console.error("L'Oréal Assistant Error:", error);

    loadingBubble.textContent =
      "I'm sorry! I'm having trouble connecting right now. Please try again shortly.";

    const lastMessage = conversation[conversation.length - 1];

    if (lastMessage?.role === "user" && lastMessage.content === message) {
      conversation.pop();
    }

  } finally {
    sendBtn.disabled = false;
    userInput.focus();
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});


/* WELCOME MESSAGE */

appendMessage(
  "assistant",
  "👋 Hello! Welcome to L'Oréal Beauty Assistant!\n\nI'm here to help you discover products, build skincare routines, explore ingredients, and find beauty solutions.\n\nWhat can I help you with today?"
);
