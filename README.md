# VANES AI

![VANES AI](assets/vanes-logo.svg)

**VANES AI — Verseversatile Adaptive Neuro Emergent System** is an online, learner-friendly study companion designed around the Tanzanian secondary-school curriculum. It detects likely subject and level, explains concepts, analyses work, creates practice, organises study time, and works with study images.

![OB Technologies Lab](assets/ob-technologies-lab.svg)

## 🚀 Use VANES online

The production app is deployed as a **Cloudflare Worker** and is available at:

**https://vanes-ai.obtechnologies625.workers.dev**

Students do not need Command Prompt, Python, Node.js, or a local server to use the public app. They can open the URL from a phone, tablet, or PC.

### Owner setup for AI

The frontend calls `/api/chat` on the same Cloudflare Worker. The OpenRouter secret must stay server-side.

Create a **runtime secret** named:

`OPENROUTER_API_KEY`

Do not put a real API key in `app.js`, browser JavaScript, README files, screenshots, or GitHub. If a key has ever been exposed, revoke/rotate it before using a replacement.

The Worker also exposes a safe health check at `/api/health`; it reports only whether the runtime secret is configured and never returns the secret itself.

## 📱 How students use VANES

1. **Enter your name.** VANES creates a local learner profile on that device.
2. **Browse subjects or ask directly.** VANES includes O-Level/CSEE and A-Level/ACSEE subject areas.
3. **Ask VANES.** Questions can be written in English or Kiswahili.
4. **Use study modes:** `#explain`, `#practice`, `#analyze`, `#plan`, `#summarize`, `#translate`, and `#mark`.
5. **Upload a study image.** Use a photo of a question, handwritten work, notes, graph, diagram, or textbook page.
6. **Use the planner and notes** to organise focused sessions.
7. **Switch Light/Dark mode** for comfortable studying.

## 🎓 Curriculum coverage

The subject library includes:

- Kiswahili
- English Language
- Basic Mathematics
- Basic Applied Mathematics
- Advanced Mathematics
- History
- Geography
- Chemistry
- Physics
- Biology
- Civics
- Information and Computer Studies
- Commerce
- Bookkeeping
- Agriculture
- Food and Nutrition
- Fine Art
- Music
- French
- Arabic
- Bible Knowledge
- Islamic Knowledge
- Physical Education
- Economics
- General Studies
- Computer Science
- Accountancy
- Business Studies
- Computer Applications

VANES includes topic maps for many of these subjects and supports both O-Level and Advanced/A-Level contexts where applicable. Learners should verify high-stakes exam information against their current teacher, textbook, and official syllabus.

## 🧠 Product direction

The name **VANES** represents **Verseversatile Adaptive Neuro Emergent System**. The product is designed to adapt its help to the learner rather than behave like a simple question-and-answer page.

Current functionality includes:

- Subject and level detection through AI context
- Tanzanian curriculum-aware AI prompting
- Multi-turn chat history
- Streaming AI responses
- Stop generation
- Regenerate and edit controls
- Markdown and code formatting
- Copy answer and copy-code controls
- Study-image upload and analysis foundation
- Educational image-request workflow
- Personal learner profile
- Subject/topic workspace
- Study planner
- Local notes
- Progress/session controls
- Light and dark themes
- Responsive mobile interface
- Secure Cloudflare Worker API proxy

## 🛠️ Development

The app is a lightweight static frontend plus Cloudflare Worker backend. The production Worker is configured by `wrangler.toml` with `src/index.js` as the Worker entry point and the repository root as the static asset directory.

For local development, a developer can use any static server or Cloudflare Wrangler workflow. Students should use the public Worker URL above.

## 🔐 Security

Never commit an OpenRouter API key. The browser sends requests only to `/api/chat`; the Worker reads `OPENROUTER_API_KEY` from its runtime secret and forwards the request to OpenRouter.

## 🌐 24-hour availability

The Cloudflare Worker provides the public app URL without requiring a developer's PC or Command Prompt to remain running. Students only need an internet connection.

## 👨‍💻 Made by OB Technologies Lab

VANES AI is a project by **OB Technologies Lab**.
