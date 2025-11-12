// Forwarding worker: send incoming requests to the demo proxy worker
// This worker forwards the payload to the demo proxy so clients don't need
// to talk directly to OpenAI or configure API keys here.

const PROXY_WORKER = "https://loreal-chat-proxy.amukash.workers.dev";

export default {
  async fetch(request) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
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

    try {
      const resp = await fetch(PROXY_WORKER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      return new Response(text, { status: resp.status, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 502,
        headers: corsHeaders,
      });
    }
  },
};
