// VANES AI secure OpenRouter chat endpoint.
// Set OPENROUTER_API_KEY in your deployment provider environment variables.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.OPENROUTER_API_KEY) return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured on the server." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (!Array.isArray(body.messages) || !body.messages.length) return res.status(400).json({ error: "messages must be a non-empty array" });
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "https://vanes-ai.vercel.app",
        "X-Title": "VANES AI"
      },
      body: JSON.stringify({ model: body.model || DEFAULT_MODEL, messages: body.messages, stream: true, temperature: 0.4 })
    });
    if (!upstream.ok) return res.status(upstream.status).json({ error: await upstream.text() || "OpenRouter request failed" });
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    if (upstream.body) for await (const chunk of upstream.body) res.write(Buffer.from(chunk));
    res.end();
  } catch (error) {
    console.error("VANES chat error", error);
    if (!res.headersSent) return res.status(500).json({ error: "Unable to reach the AI service." });
    res.end();
  }
}
