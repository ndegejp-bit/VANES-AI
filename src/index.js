const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_IMAGE_MODEL = "openai/gpt-5.2";
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

function collectImageUrls(value, output = []) {
  if (typeof value === "string") {
    if (/^(https?:\/\/|data:image\/)/i.test(value)) output.push(value);
    return output;
  }
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    value.forEach(item => collectImageUrls(item, output));
    return output;
  }
  if (typeof value.url === "string") collectImageUrls(value.url, output);
  if (value.image_url) collectImageUrls(value.image_url, output);
  if (value.image) collectImageUrls(value.image, output);
  if (value.images) collectImageUrls(value.images, output);
  return output;
}

function extractImageUrls(data) {
  const urls = [];
  const message = data?.choices?.[0]?.message;
  collectImageUrls(message?.images, urls);
  collectImageUrls(message?.content, urls);
  collectImageUrls(message?.tool_calls, urls);
  return [...new Set(urls)];
}

function extractText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(part => typeof part === "string" ? part : (part?.text || "")).filter(Boolean).join("\n");
  }
  return "";
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
      headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": env.APP_URL || new URL(request.url).origin, "X-Title": "VANES AI" },
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

async function handleImage(request, env) {
  const headers = cors(request.headers.get("Origin"));
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
  if (!env.OPENROUTER_API_KEY) return json({ error: "The VANES AI server is not configured yet. Add the runtime secret OPENROUTER_API_KEY in Cloudflare." }, 500, headers);
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY) return json({ error: "Image request is too large." }, 413, headers);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400, headers); }
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return json({ error: "Please enter an image description." }, 400, headers);
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : (env.VANES_IMAGE_MODEL || DEFAULT_IMAGE_MODEL);
  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": env.APP_URL || new URL(request.url).origin, "X-Title": "VANES AI Image Generator" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "openrouter:image_generation" }]
      })
    });
    const raw = await upstream.text();
    if (!upstream.ok) return new Response(raw || JSON.stringify({ error: "Image generation failed." }), { status: upstream.status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
    let data;
    try { data = JSON.parse(raw); } catch { return json({ error: "The image service returned an invalid response." }, 502, headers); }
    const images = extractImageUrls(data);
    return json({ ok: true, model, images, text: extractText(data) }, 200, headers);
  } catch (error) {
    console.error("VANES image generation error", error);
    return json({ error: "Unable to reach the image generation service." }, 502, headers);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return json({ ok: true, worker: "vanes-ai", openrouterConfigured: Boolean(env.OPENROUTER_API_KEY), imageModel: env.VANES_IMAGE_MODEL || DEFAULT_IMAGE_MODEL });
    if (url.pathname === "/api/chat") return handleChat(request, env);
    if (url.pathname === "/api/image") return handleImage(request, env);
    return env.ASSETS.fetch(request);
  }
};
