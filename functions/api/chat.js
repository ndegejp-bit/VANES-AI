const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free-first fallback chain. Keep paid models out of the default path so a low/zero
// OpenRouter balance does not make VANES unusable.
const MODEL_FALLBACKS = [
  "openrouter/free",
  "qwen/qwen3-32b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free"
];

function retryable(status) {
  return [402, 408, 409, 429, 500, 502, 503, 504].includes(status);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.OPENROUTER_API_KEY) {
    return Response.json({ error: "OPENROUTER_API_KEY is not configured." }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body?.messages) || !body.messages.length) {
    return Response.json({ error: "messages must be a non-empty array." }, { status: 400 });
  }

  const requested = typeof body.model === "string" ? body.model.trim() : "";
  const models = requested && MODEL_FALLBACKS.includes(requested)
    ? [requested, ...MODEL_FALLBACKS.filter((model) => model !== requested)]
    : MODEL_FALLBACKS;

  let lastStatus = 503;
  let lastDetail = "OpenRouter request failed.";

  try {
    for (const model of models) {
      const upstream = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": env.APP_URL || new URL(request.url).origin,
          "X-Title": "VANES AI"
        },
        body: JSON.stringify({
          model,
          messages: body.messages.slice(-24),
          stream: true,
          temperature: 0.4,
          max_tokens: Math.min(Math.max(Number(body.max_tokens) || 600, 128), 700)
        })
      });

      if (upstream.ok) {
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-VANES-Model": model
          }
        });
      }

      lastStatus = upstream.status;
      lastDetail = (await upstream.text()).slice(0, 1000) || `OpenRouter returned HTTP ${upstream.status}`;
      if (!retryable(upstream.status)) break;
    }

    if (lastStatus === 402) {
      return Response.json({
        error: "VANES could not get a free OpenRouter model right now. Please try again shortly.",
        code: 402
      }, { status: 402 });
    }

    return Response.json({
      error: "VANES could not get a response from the available AI models.",
      detail: lastDetail
    }, { status: lastStatus });
  } catch (error) {
    console.error("VANES chat error", error);
    return Response.json({ error: "Unable to reach the AI service." }, { status: 502 });
  }
}
