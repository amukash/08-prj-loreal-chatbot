// Cloudflare Worker proxy for OpenAI Chat Completions
// - Paste this into a new Worker (or deploy with Wrangler)
// - Set a secret named OPENAI_API_KEY in your Worker environment
// - This forwards the `messages` array to OpenAI and returns the response

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (err) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const messages = payload.messages || payload;
    if (!messages) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const body = {
      model: "gpt-4o",
      messages: messages,
      max_tokens: 800,
    };

    try {
      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: corsHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 502,
        headers: corsHeaders,
      });
    }
  },
};
