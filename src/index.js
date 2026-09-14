const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const MAX_BODY = 9000000;

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra }
  });
}

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Vary": "Origin"
  };
}

async function handleChat(request, env) {
  const headers = cors(request.headers.get("Origin"));
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
  if (!env.OPENROUTER_API_KEY) return json({ error: "The VANES AI server is not configured yet. Add the runtime secret OPENROUTER_API_KEY in Cloudflare." }, 500, headers);

  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY) return json({ error: "Request is too large. Please use a smaller image or shorter conversation." }, 413, headers);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400, headers); }
  if (!Array.isArray(body?.messages) || body.messages.length === 0) return json({ error: "messages must be a non-empty array." }, 400, headers);
  if (body.messages.length > 24) body.messages = body.messages.slice(-24);

  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : DEFAULT_MODEL;
  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.APP_URL || new URL(request.url).origin,
        "X-Title": "VANES AI"
      },
      body: JSON.stringify({ model, messages: body.messages, stream: true, temperature: 0.4 })
    });
    if (!upstream.ok) {
      const detail = await upstream.text();
      return new Response(detail || JSON.stringify({ error: "OpenRouter request failed." }), { status: upstream.status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
    }
    return new Response(upstream.body, { status: 200, headers: { ...headers, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
  } catch (error) {
    console.error("VANES chat error", error);
    return json({ error: "Unable to reach the AI service." }, 502, headers);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return json({ ok: true, worker: "vanes-ai", openrouterConfigured: Boolean(env.OPENROUTER_API_KEY) });
    if (url.pathname === "/api/chat") return handleChat(request, env);
    return env.ASSETS.fetch(request);
  }
};
