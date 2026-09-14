const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

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

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.APP_URL || "https://obtechnologies625-lab.github.io/VANES-AI/",
        "X-Title": "VANES AI"
      },
      body: JSON.stringify({
        model: body.model || DEFAULT_MODEL,
        messages: body.messages,
        stream: true,
        temperature: 0.4
      })
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return new Response(detail || "OpenRouter request failed.", {
        status: upstream.status,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });
  } catch (error) {
    console.error("VANES chat error", error);
    return Response.json({ error: "Unable to reach the AI service." }, { status: 500 });
  }
}
