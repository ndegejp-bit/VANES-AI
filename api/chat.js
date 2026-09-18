// VANES AI secure OpenRouter chat endpoint.
// OpenRouter model selection is deliberately free-first so VANES can keep working
// even when the account has little or no paid credit.
//
// Set OPENROUTER_API_KEY in your deployment provider environment variables.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free-first fallback chain. OpenRouter may add/remove free models over time,
// so the router is tried first, followed by specific free models.
const MODEL_FALLBACKS = [
  "openrouter/free",
  "qwen/qwen3-32b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  // Last resort: a low-cost model. It may require credits.
  "openai/gpt-4o-mini"
];

function isRetryableStatus(status) {
  return status === 402 || status === 408 || status === 409 ||
    status === 429 || status === 500 || status === 502 ||
    status === 503 || status === 504;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured on the server." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (!Array.isArray(body.messages) || !body.messages.length) {
      return res.status(400).json({ error: "messages must be a non-empty array" });
    }

    // Keep the frontend's requested model only when it is one of our free-first
    // choices. This prevents an old paid model setting from bypassing the fallback.
    const requested = typeof body.model === "string" ? body.model : "";
    const models = requested && MODEL_FALLBACKS.includes(requested)
      ? [requested, ...MODEL_FALLBACKS.filter(model => model !== requested)]
      : MODEL_FALLBACKS;

    let lastStatus = 503;
    let lastError = "OpenRouter request failed.";

    for (const model of models) {
      const upstream = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "https://vanes-ai.vercel.app",
          "X-Title": "VANES AI"
        },
        body: JSON.stringify({
          model,
          messages: body.messages,
          stream: true,
          temperature: 0.4,
          max_tokens: Math.min(Number(body.max_tokens) || 600, 700)
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

      console.warn(`VANES model ${model} failed with HTTP ${upstream.status}; trying next fallback.`);

      if (!isRetryableStatus(upstream.status)) break;
    }

    // Give the frontend a clean message instead of exposing the entire provider payload.
    if (lastStatus === 402) {
      return res.status(402).json({
        error: "Free OpenRouter models were unavailable. Please try again shortly. Paid fallback requires OpenRouter credits.",
        code: 402
      });
    }

    return res.status(lastStatus).json({
      error: "VANES could not get a response from the available OpenRouter models.",
      detail: lastError
    });
  } catch (error) {
    console.error("VANES chat error", error);
    if (!res.headersSent) return res.status(500).json({ error: "Unable to reach the AI service." });
    res.end();
  }
}
