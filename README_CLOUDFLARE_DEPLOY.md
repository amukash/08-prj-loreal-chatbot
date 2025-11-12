Cloudflare Worker: deploy & wire to the chat UI

This short guide helps you deploy the included `cloudflare-worker.js` and wire your front-end (`script.js`) to the worker URL.

1. Prepare

- Use the Cloudflare Dashboard (UI) or Wrangler (CLI).
- Install Wrangler (recommended):
  npm install -g wrangler

2. Create or update a Worker project

- You can copy `cloudflare-worker.js` into a new Worker project or paste it into the Cloudflare Workers editor.

3. Configure your OpenAI key as a secret

- Use Wrangler to set the secret (recommended):
  wrangler secret put OPENAI_API_KEY
  # paste your OpenAI API key when prompted

4. Publish the Worker

- Publish with:
  wrangler publish
- After successful publish you'll get a Worker URL like `https://<name>.<your-subdomain>.workers.dev`

5. Update the frontend `script.js`

- Open `script.js` and set the full worker URL (include https://) as `API_ENDPOINT`. For this project you can use the included demo worker:
- Example: `https://loreal-chat-proxy.amukash.workers.dev`

6. Test the worker from the Codespace (curl)

- Example test (post a small messages array):
  curl -i -X POST 'https://<your-worker>.workers.dev' \
   -H 'Content-Type: application/json' \
   -d '{"messages":[{"role":"system","content":"hi"},{"role":"user","content":"Hello"}]}'

Expected response: HTTP/200 and JSON similar to OpenAI's response:
{ "choices": [ { "message": { "content": "..." } } ], ... }

Notes

- Do not commit your OpenAI API key to the repo. Use Wrangler secrets or Cloudflare dashboard secrets.
- The worker includes permissive CORS for development; consider restricting origin in production.
