// Robust Cloudflare Worker proxy for OpenAI chat completions
addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Handle preflight CORS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Only POST requests are allowed.", { status: 405 });
  }

  // Read JSON body safely
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response("Invalid or missing JSON body", { status: 400 });
  }

  // Validate expected shape: messages array
  if (!payload.messages || !Array.isArray(payload.messages)) {
    return new Response("Request body must include a 'messages' array", { status: 400 });
  }

  // Safely read the OPENAI key from the worker environment
  // Cloudflare exposes secrets as globals; use globalThis to avoid shadowing issues.
  const OPENAI_API_KEY = globalThis.OPENAI_API_KEY || null;
  if (!OPENAI_API_KEY) {
    return new Response("OpenAI API key not configured on Worker (OPENAI_API_KEY)", { status: 500 });
  }

  // Build request to OpenAI
  const openaiUrl = "https://api.openai.com/v1/chat/completions";
  const openaiBody = {
    model: payload.model || "gpt-4o-mini",
    messages: payload.messages,
    max_tokens: payload.max_tokens || 800,
    temperature: typeof payload.temperature === "number" ? payload.temperature : 0.2,
  };

  try {
    const resp = await fetch(openaiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(openaiBody),
    });

    const text = await resp.text();

    // If OpenAI isn't OK, forward the error body for easier debugging
    if (!resp.ok) {
      return new Response(`OpenAI error: ${text}`, { status: 502, headers: { "Content-Type": "text/plain" } });
    }

    // Parse OpenAI JSON and return a compact shape to the client
    const json = JSON.parse(text);
    const assistant = json.choices?.[0]?.message?.content ?? json.choices?.[0]?.text ?? "";

    return new Response(JSON.stringify({ assistant, raw: json }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    // Catch network/runtime errors
    return new Response("Worker runtime error: " + String(err), { status: 500 });
  }
}
