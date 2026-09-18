// VANES AI — Vercel-compatible secure chat endpoint.
// Keep provider credentials server-side. This route mirrors the Cloudflare worker's
// free-first fallback behaviour so deployments do not silently use the old paid model.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS = [
  "openrouter/free",
  "qwen/qwen3-32b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free"
];
const RETRYABLE = new Set([402,408,409,429,500,502,503,504]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured on the server." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    if (!Array.isArray(body.messages) || !body.messages.length) {
      return res.status(400).json({ error: "messages must be a non-empty array" });
    }

    const requested = typeof body.model === "string" ? body.model.trim() : "";
    const messages = body.messages.slice(-24);
    const hasImageInput = messages.some(m => Array.isArray(m?.content) && m.content.some(part => part?.type === "image_url" || part?.type === "input_image"));
    const visionModels = ["google/gemma-3-27b-it:free", "openrouter/free"];
    const orderedModels = hasImageInput ? visionModels : MODELS;
    const models = requested && orderedModels.includes(requested)
      ? [requested, ...orderedModels.filter(m => m !== requested)]
      : orderedModels;
    const requestedTokens = Number(body.max_tokens);
    const maxTokens = Number.isFinite(requestedTokens)
      ? Math.min(Math.max(requestedTokens, 128), 700)
      : 600;
    const tokenAttempts = [maxTokens, ...[512,384,256,160].filter(n => n < maxTokens)];

    let lastStatus = 503;
    let lastError = "OpenRouter request failed.";

    for (const model of models) {
      for (const max_tokens of tokenAttempts) {
        const upstream = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.APP_URL || "https://vanes-ai.vercel.app",
            "X-Title": "VANES AI"
          },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            temperature: 0.4,
            max_tokens
          })
        });

        if (upstream.ok) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache, no-transform");
          res.setHeader("Connection", "keep-alive");
          res.setHeader("X-VANES-Model", model);
          if (upstream.body) {
            for await (const chunk of upstream.body) res.write(Buffer.from(chunk));
          }
          res.end();
          return;
        }

        lastStatus = upstream.status;
        lastError = (await upstream.text()).slice(0, 1000) || `OpenRouter returned HTTP ${upstream.status}`;
        // A 402 caused by token affordability gets a smaller request before the
        // next model; other retryable failures move directly to the next model.
        if (lastStatus === 400 || lastStatus === 422) { if (hasImageInput) continue; break; }
        if (lastStatus !== 402) break;
        if (!/credits|credit|afford|limit|insufficient/i.test(lastError)) break;
      }
      if (!RETRYABLE.has(lastStatus)) break;
    }

    if (lastStatus === 402) {
      return res.status(402).json({
        error: "Free OpenRouter models were unavailable. Please try again shortly.",
        code: 402
      });
    }
    return res.status(lastStatus).json({
      error: "VANES could not get a response from the available OpenRouter models.",
      detail: lastError
    });
  } catch (error) {
    console.error("VANES chat error", error);
    if (!res.headersSent) return res.status(502).json({ error: "Unable to reach the AI service." });
    res.end();
  }
}
