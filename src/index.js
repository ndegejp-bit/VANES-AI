const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_IMAGE_MODEL = "openai/gpt-5.2";
const DEFAULT_MAX_TOKENS = 2048;
const MAX_BODY = 9000000;

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra } });
}
function cors(origin) { return { "Access-Control-Allow-Origin": origin || "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST,OPTIONS", "Vary": "Origin" }; }

function toImage(value, mime = "image/png") {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (/^https?:\/\//i.test(s) || /^data:image\//i.test(s)) return s;
  if (s.length > 100 && /^[A-Za-z0-9+/=_\-]+$/.test(s)) return `data:${mime};base64,${s}`;
  return null;
}

function collectImages(value, output = [], mime = "image/png") {
  if (value == null) return output;
  if (typeof value === "string") {
    const parsed = (() => { try { return /^[\[{]/.test(value.trim()) ? JSON.parse(value) : null; } catch { return null; } })();
    if (parsed) return collectImages(parsed, output, mime);
    const image = toImage(value, mime);
    if (image) output.push(image);
    return output;
  }
  if (Array.isArray(value)) { value.forEach(v => collectImages(v, output, mime)); return output; }
  if (typeof value !== "object") return output;
  const localMime = value.mime_type || value.media_type || value.content_type || mime;
  for (const key of ["url", "image_url", "image", "images", "output", "result", "content", "data", "file"]) {
    if (value[key] != null) collectImages(value[key], output, localMime);
  }
  for (const key of ["b64_json", "base64", "image_base64", "imageData", "image_data"]) {
    if (typeof value[key] === "string") {
      const image = toImage(value[key], localMime);
      if (image) output.push(image);
    }
  }
  if (typeof value.arguments === "string") collectImages(value.arguments, output, localMime);
  else if (value.arguments) collectImages(value.arguments, output, localMime);
  if (typeof value.input === "string") collectImages(value.input, output, localMime);
  else if (value.input) collectImages(value.input, output, localMime);
  return output;
}

function extractImageUrls(data) {
  const urls = [];
  collectImages(data, urls);
  return [...new Set(urls)];
}

function extractText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(part => typeof part === "string" ? part : (part?.text || "")).filter(Boolean).join("\n");
  return "";
}
function readableError(value, fallback = "Image generation failed.") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!value || typeof value !== "object") return fallback;
  const nested = value.message || value.error || value.detail || value.reason;
  if (typeof nested === "string" && nested.trim()) return nested.trim();
  if (nested && typeof nested === "object") return readableError(nested, fallback);
  try { const text = JSON.stringify(value); return text && text !== "{}" ? text : fallback; } catch { return fallback; }
}

async function handleChat(request, env) {
  const headers = cors(request.headers.get("Origin"));
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
  if (!env.OPENROUTER_API_KEY) return json({ error: "The VANES AI server is not configured yet. Add the runtime secret OPENROUTER_API_KEY in Cloudflare." }, 500, headers);
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY) return json({ error: "Request is too large. Please use a smaller image or shorter conversation." }, 413, headers);
  let body; try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400, headers); }
  if (!Array.isArray(body?.messages) || !body.messages.length) return json({ error: "messages must be a non-empty array." }, 400, headers);
  if (body.messages.length > 24) body.messages = body.messages.slice(-24);
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : DEFAULT_MODEL;
  const maxTokens = Number.isFinite(Number(body.max_tokens)) ? Math.min(Math.max(Number(body.max_tokens), 256), DEFAULT_MAX_TOKENS) : DEFAULT_MAX_TOKENS;
  try {
    const upstream = await fetch(OPENROUTER_URL, { method: "POST", headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": env.APP_URL || new URL(request.url).origin, "X-Title": "VANES AI" }, body: JSON.stringify({ model, messages: body.messages, stream: true, temperature: 0.4, max_tokens: maxTokens }) });
    if (!upstream.ok) { const detail = await upstream.text(); return new Response(detail || JSON.stringify({ error: "OpenRouter request failed." }), { status: upstream.status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }); }
    return new Response(upstream.body, { status: 200, headers: { ...headers, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
  } catch (error) { console.error("VANES chat error", error); return json({ error: "Unable to reach the AI service." }, 502, headers); }
}

async function handleImage(request, env) {
  const headers = cors(request.headers.get("Origin"));
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
  if (!env.OPENROUTER_API_KEY) return json({ error: "The VANES AI server is not configured yet. Add the runtime secret OPENROUTER_API_KEY in Cloudflare." }, 500, headers);
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY) return json({ error: "Image request is too large." }, 413, headers);
  let body; try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400, headers); }
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return json({ error: "Please enter an image description." }, 400, headers);
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : (env.VANES_IMAGE_MODEL || DEFAULT_IMAGE_MODEL);
  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": env.APP_URL || new URL(request.url).origin, "X-Title": "VANES AI Image Generator" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], tools: [{ type: "openrouter:image_generation" }], tool_choice: "required", max_tokens: DEFAULT_MAX_TOKENS })
    });
    const raw = await upstream.text();
    let data = null; try { data = JSON.parse(raw); } catch {}
    if (!upstream.ok) return json({ error: readableError(data?.error || data, `Image generation failed (${upstream.status}).`) }, upstream.status, headers);
    if (!data) return json({ error: "The image service returned an invalid response." }, 502, headers);
    const images = extractImageUrls(data);
    const text = extractText(data);
    if (!images.length) return json({ ok: false, error: "OpenRouter completed the image request but returned no directly renderable image data.", detail: text || null, model }, 502, headers);
    return json({ ok: true, model, images, text }, 200, headers);
  } catch (error) { console.error("VANES image generation error", error); return json({ error: readableError(error, "Unable to reach the image generation service.") }, 502, headers); }
}

export default { async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/api/health") return json({ ok: true, worker: "vanes-ai", openrouterConfigured: Boolean(env.OPENROUTER_API_KEY), imageModel: env.VANES_IMAGE_MODEL || DEFAULT_IMAGE_MODEL, maxTokens: DEFAULT_MAX_TOKENS });
  if (url.pathname === "/api/chat") return handleChat(request, env);
  if (url.pathname === "/api/image") return handleImage(request, env);
  return env.ASSETS.fetch(request);
} };