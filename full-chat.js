/* VANES AI — full chat experience. Loaded before the legacy coach enhancement. */
(function () {
  "use strict";

  const STORAGE_KEY = "vanes-chat-conversations-v1";
  const ACTIVE_KEY = "vanes-chat-active-v1";
  const ENDPOINT = window.VANES_CHAT_ENDPOINT || "/api/chat";
  const MODEL = window.VANES_CHAT_MODEL || "openai/gpt-4o-mini";
  const messagesEl = document.querySelector("#messages");
  const form = document.querySelector("#chatForm");
  const input = document.querySelector("#chatInput");
  if (!messagesEl || !form || !input) return;

  let conversations = load();
  let activeId = localStorage.getItem(ACTIVE_KEY) || null;
  let controller = null;
  let generating = false;

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (_) { return []; }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 30))); }
  function makeId() { return "chat-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function current() { return conversations.find(c => c.id === activeId); }
  function escape(s) { return String(s).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
  function markdown(s) {
    let out = escape(s);
    out = out.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code><button class="vanes-copy-code" type="button">Copy code</button></pre>`);
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    out = out.replace(/^### (.*)$/gm, "<h4>$1</h4>").replace(/^## (.*)$/gm, "<h3>$1</h3>").replace(/^# (.*)$/gm, "<h2>$1</h2>");
    out = out.replace(/^[-*] (.*)$/gm, "<li>$1</li>");
    out = out.replace(/(?:<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
    out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>");
    return out.replace(/\n/g, "<br>");
  }

  function newChat() {
    const c = { id: makeId(), title: "New chat", messages: [] };
    conversations.unshift(c); activeId = c.id; save(); renderHistory(); renderMessages(); input.focus();
  }
  function ensureChat() { if (!current()) newChat(); }

  function renderHistory() {
    let box = document.querySelector("#vanes-chat-history");
    if (!box) return;
    const list = conversations.slice(0, 12);
    box.innerHTML = list.length ? list.map(c => `<button type="button" class="vanes-history-item ${c.id === activeId ? "active" : ""}" data-chat-id="${c.id}"><strong>${escape(c.title || "New chat")}</strong><small>${c.messages.filter(m=>m.role!=="system").length} messages</small></button>`).join("") : `<p class="vanes-history-empty">No saved chats yet.</p>`;
    box.querySelectorAll("[data-chat-id]").forEach(b => b.addEventListener("click", () => { activeId = b.dataset.chatId; localStorage.setItem(ACTIVE_KEY, activeId); renderHistory(); renderMessages(); }));
  }

  function renderMessages() {
    ensureChat();
    messagesEl.innerHTML = "";
    const c = current();
    if (!c.messages.length) {
      const el = document.createElement("div"); el.className = "message coach-message";
      el.innerHTML = "<span>✦</span><p>Hi! I'm VANES AI. Ask me anything, in English or Kiswahili. I can explain, analyse, practise, mark, plan, summarise, translate, and work from study images.</p>";
      messagesEl.append(el);
      return;
    }
    c.messages.forEach((m, i) => {
      if (m.role === "system") return;
      const el = document.createElement("div"); el.className = `message ${m.role === "user" ? "user-message" : "coach-message"}`;
      if (m.role === "assistant") {
        const imageMatch=String(m.content||"").match(/^<VANES_IMAGE>([\\s\\S]+)<\\/VANES_IMAGE>$/);
        const rendered=imageMatch ? `<div>✦ Image created by VANES AI</div><img src="${escape(imageMatch[1])}" alt="AI-generated educational visual" style="display:block;max-width:100%;max-height:520px;margin-top:10px;border-radius:12px">` : markdown(m.content);
        el.innerHTML = `<span>✦</span><div class="vanes-bubble"><div class="vanes-content">${rendered}</div><div class="vanes-actions"><button type="button" data-copy="${i}">Copy</button><button type="button" data-regenerate="${i}">Regenerate</button></div></div>`;
      } else {
        el.innerHTML = `<div class="vanes-bubble"><div class="vanes-content">${markdown(m.content)}</div><div class="vanes-actions"><button type="button" data-edit="${i}">Edit</button></div></div>`;
      }
      messagesEl.append(el);
    });
    messagesEl.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", () => navigator.clipboard?.writeText(c.messages[Number(b.dataset.copy)].content).then(() => toast("Copied"))));
    messagesEl.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => { input.value = c.messages[Number(b.dataset.edit)].content; input.focus(); }));
    messagesEl.querySelectorAll("[data-regenerate]").forEach(b => b.addEventListener("click", () => regenerate(Number(b.dataset.regenerate))));
    messagesEl.querySelectorAll(".vanes-copy-code").forEach(b => b.addEventListener("click", () => { navigator.clipboard?.writeText(b.parentElement.querySelector("code").innerText); b.textContent="Copied"; setTimeout(()=>b.textContent="Copy code",1000); }));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function toast(text) { if (window.showToast) window.showToast(text); }

  function addStyles() {
    const s = document.createElement("style");
    s.textContent = `
      .vanes-chat-tools{display:flex;gap:7px;padding:10px 15px;border-bottom:1px solid var(--line);align-items:center;flex-wrap:wrap}.vanes-chat-tools button{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:8px;padding:7px 10px;font:600 11px inherit;cursor:pointer}.vanes-chat-tools button.primary{background:var(--purple);color:#fff;border-color:var(--purple)}.vanes-chat-history{display:none;max-height:150px;overflow:auto;border-bottom:1px solid var(--line);padding:7px}.vanes-chat-history.open{display:block}.vanes-history-item{display:flex;width:100%;justify-content:space-between;gap:10px;border:0;background:transparent;color:var(--ink);padding:8px;border-radius:7px;text-align:left;cursor:pointer}.vanes-history-item.active{background:var(--lavender)}.vanes-history-item small,.vanes-history-empty{color:var(--muted);font-size:10px}.vanes-bubble{min-width:0;flex:1}.vanes-content{background:#f7f6fb;padding:10px 12px;border-radius:0 10px 10px 10px;font-size:13px;line-height:1.6;overflow-wrap:anywhere}.user-message .vanes-content{background:var(--purple);color:#fff;border-radius:10px 0 10px 10px}.vanes-content h2,.vanes-content h3,.vanes-content h4{margin:0 0 7px;font-family:Georgia,serif}.vanes-content ul{margin:5px 0;padding-left:20px}.vanes-content code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;background:rgba(99,84,199,.12);padding:1px 4px;border-radius:4px}.vanes-content pre{position:relative;background:#171b24;color:#f5f7fb;padding:12px;border-radius:8px;overflow:auto}.vanes-content pre code{background:none;padding:0}.vanes-copy-code{position:absolute;right:7px;top:7px;border:0;border-radius:5px;padding:4px 7px;cursor:pointer}.vanes-actions{display:flex;gap:8px;margin-top:5px}.vanes-actions button{border:0;background:none;color:var(--muted);font-size:10px;cursor:pointer;padding:2px}.vanes-stop{margin-left:auto!important}.dark .vanes-content{background:#2a303b;color:#f1f3f7}.dark .user-message .vanes-content{background:#7063d4;color:#fff}.dark .vanes-chat-tools button{background:#242a35;color:var(--ink);border-color:#48515f}.dark .vanes-history-item.active{background:#302d55}
    `;
    document.head.append(s);
  }

  function setupUI() {
    addStyles();
    const panel = form.closest(".chat-panel");
    const tools = document.createElement("div"); tools.className="vanes-chat-tools";
    tools.innerHTML = `<button type="button" class="primary" id="vanes-new-chat">＋ New chat</button><button type="button" id="vanes-history-toggle">☰ History</button><button type="button" id="vanes-clear-history">Clear history</button><span id="vanes-status" style="font-size:10px;color:var(--muted)">Ready</span>`;
    panel.insertBefore(tools, messagesEl);
    const history = document.createElement("div"); history.id="vanes-chat-history"; history.className="vanes-chat-history"; panel.insertBefore(history, messagesEl);
    document.querySelector("#vanes-new-chat").onclick = newChat;
    document.querySelector("#vanes-history-toggle").onclick = () => history.classList.toggle("open");
    document.querySelector("#vanes-clear-history").onclick = () => { if(confirm("Delete all saved VANES chats from this browser?")){ conversations=[]; activeId=null; localStorage.removeItem(ACTIVE_KEY); save(); newChat(); } };
    input.addEventListener("keydown", e => { if(e.key === "Enter" && !e.shiftKey){e.preventDefault();form.requestSubmit();} });
    const send = form.querySelector("button[type=submit]");
    if(send) send.addEventListener("dblclick", e => e.preventDefault());
    const stop = document.createElement("button"); stop.type="button"; stop.className="vanes-stop"; stop.id="vanes-stop"; stop.textContent="■"; stop.title="Stop generating"; stop.hidden=true; form.insertBefore(stop, form.lastElementChild); stop.onclick=()=>controller?.abort();
    renderHistory(); renderMessages();
  }

  function systemPrompt() {
    return `You are VANES AI — Versatile Adaptive Neuro Emergent System — the official AI learning system created by OB Technologies / OB Tech-Labs.

ABOUT VANES:
- Your full name is "Versatile Adaptive Neuro Emergent System". Never describe your name as "Verseversatile".
- You are VANES AI, an adaptive learning companion designed to study, explain, analyse, practise, plan, mark, summarise, translate and work with educational images.
- Your creator/organization is OB Technologies / OB Tech-Labs. The app branding may say "Made by OB Tech-Labs".
- When asked who you are, explain your name and purpose clearly. When asked who created you, identify OB Technologies / OB Tech-Labs.
- Do not invent biographies, company history, products, people, addresses, achievements or other facts about OB Technologies. If information is not provided in the conversation/system context, say that you do not have verified details.
- Keep this identity memory stable across the conversation while still following the learner's profile and current question.

LEARNING BEHAVIOUR:
You are an expert study assistant for learners following the Tanzanian secondary-school curriculum. Be accurate, rigorous, encouraging and age-appropriate. Detect the likely subject and O-Level/CSEE or A-Level/ACSEE level from the conversation and learner profile. Explain concepts step by step. For maths/science show formulas, substitutions, units and final answers. For History, Civics, Economics and Geography use structured points with explanations. If the learner asks to mark work, give transparent marking guidance and identify errors. If syllabus details may vary by current version, say so instead of inventing them. Never claim to have used a source or tool you did not use. Answer in English or Kiswahili according to the learner's language.`;
  }

  async function send(text, image) {
    ensureChat();
    const c=current();
    c.messages.push({role:"user",content:text || "Please analyse the attached study image."});
    if(c.title === "New chat") c.title = (text || "Study image").slice(0, 48);
    save(); renderHistory(); renderMessages();
    generating=true; document.querySelector("#vanes-stop").hidden=false; document.querySelector("#vanes-status").textContent="VANES is thinking…";
    controller=new AbortController();
    const userContent = image ? [{type:"text",text:text || "Analyse this study image carefully."},{type:"image_url",image_url:{url:image}}] : text;
    const apiMessages=[{role:"system",content:systemPrompt()},...c.messages.slice(-18).map(m=>({role:m.role,content:m.content}))];
    if(image) apiMessages[apiMessages.length-1].content=userContent;
    try {
      const res=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,messages:apiMessages,max_tokens:1536}),signal:controller.signal});
      if(!res.ok){let detail=await res.text();throw new Error(detail.slice(0,500)||`HTTP ${res.status}`);}
      let answer="";
      const reader=res.body?.getReader();
      const decoder=new TextDecoder();
      if(reader){
        const assistant={role:"assistant",content:""}; c.messages.push(assistant); renderMessages();
        const bubble=messagesEl.lastElementChild?.querySelector(".vanes-content");
        let buffer="";
        while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const parts=buffer.split("\n");buffer=parts.pop()||"";for(const line of parts){if(!line.startsWith("data:"))continue;const data=line.slice(5).trim();if(data==="[DONE]")continue;try{const j=JSON.parse(data);const delta=j.choices?.[0]?.delta?.content||"";answer+=delta;assistant.content=answer;if(bubble)bubble.innerHTML=markdown(answer);messagesEl.scrollTop=messagesEl.scrollHeight;}catch(_){}}}
        if(!answer) throw new Error("The AI returned an empty response.");
      } else { const data=await res.json(); answer=data.choices?.[0]?.message?.content||""; if(!answer)throw new Error("The AI returned an empty response."); c.messages.push({role:"assistant",content:answer}); }
      save(); renderHistory(); renderMessages();
    } catch(err) {
      if(err.name !== "AbortError"){ c.messages.push({role:"assistant",content:`I couldn't reach the VANES AI service. ${err.message}`}); save(); renderMessages(); }
    } finally { generating=false; controller=null; document.querySelector("#vanes-stop").hidden=true; document.querySelector("#vanes-status").textContent="Ready"; }
  }

  async function regenerate(index){
    if(generating)return;
    const c=current(); const target=c.messages[index]; if(!target||target.role!=="assistant")return;
    const previous=c.messages[index-1]; if(!previous||previous.role!=="user")return;
    c.messages.splice(index,1); save(); renderMessages(); await send(previous.content,null);
  }

  form.addEventListener("submit", async e=>{
    e.preventDefault(); e.stopImmediatePropagation();
    if(generating)return;
    const text=input.value.trim();
    const preview=document.querySelector("#imagePreview");
    const image=window.VANES_PENDING_IMAGE||null;
    if(!text&&!image)return;
    input.value=""; if(preview){preview.hidden=true;preview.innerHTML="";} window.VANES_PENDING_IMAGE=null;
    await send(text,image);
  }, true);

  // Reuse the existing upload button but keep the selected image in a shared variable.
  const upload=document.querySelector("#uploadButton");
  if(upload){let fileInput=document.querySelector("#imageInput");if(!fileInput){fileInput=document.createElement("input");fileInput.type="file";fileInput.id="imageInput";fileInput.accept="image/*";fileInput.hidden=true;document.body.append(fileInput);}upload.onclick=e=>{e.preventDefault();fileInput.click();};fileInput.onchange=()=>{const f=fileInput.files?.[0];if(!f)return;if(f.size>8*1024*1024){toast("Choose an image smaller than 8 MB.");return;}const r=new FileReader();r.onload=()=>{window.VANES_PENDING_IMAGE=r.result;const p=document.querySelector("#imagePreview");if(p){p.hidden=false;p.innerHTML=`<img src="${escape(r.result)}" alt="Study image preview" style="max-width:100%;max-height:150px;border-radius:8px"><span>Image attached — send a question or instruction.</span>`;}};r.readAsDataURL(f);};}

  function wantsVideo(prompt){return /\b(video|animation|animated|animate|motion|moving|movie|clip|cinematic|film|reel|transition|camera movement|time-lapse|timelapse|visual effect|vfx)\b/i.test(prompt)}

  async function generateImage(){
    const prompt=input.value.trim();
    if(!prompt){input.focus();toast("Describe the visual you want VANES to create.");return;}
    input.value="";
    if(wantsVideo(prompt)){
      const runway=document.querySelector("#vanes-runway-open");
      if(runway){runway.click();const runwayInput=document.querySelector("#vanes-runway-prompt");if(runwayInput){runwayInput.value=prompt;runwayInput.focus();}toast("VANES detected a video request and opened Runway.");return;}
      toast("Runway Creative Studio is still loading. Please try again in a moment.");return;
    }
    ensureChat();const c=current();const user={role:"user",content:"Create this educational visual: "+prompt};c.messages.push(user);save();renderMessages();
    const status=document.querySelector("#vanes-status");status.textContent="Creating image…";
    try{const res=await fetch((window.VANES_IMAGE_ENDPOINT||"/api/image"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});const d=await res.json();if(!res.ok||!d.ok||!Array.isArray(d.images)||!d.images.length)throw new Error(d.error||"The image model did not return an image.");
      const url=d.images[0];c.messages.push({role:"assistant",content:"<VANES_IMAGE>"+url+"</VANES_IMAGE>"});save();renderImageMessage(c.messages.length-1);toast("Image created with "+(d.model||"OpenRouter")+".");
    }catch(e){c.messages.push({role:"assistant",content:"I couldn't create that image. "+(e.message||"Image generation failed.")});save();renderMessages();}
    finally{status.textContent="Ready";}
  }

  function renderImageMessage(index){
    const c=current(),m=c.messages[index];if(!m)return;renderMessages();
    const nodes=[...messagesEl.querySelectorAll(".coach-message")];const el=nodes[nodes.length-1];if(!el)return;
    const bubble=el.querySelector(".vanes-content");if(!bubble)return;const match=String(m.content).match(/^<VANES_IMAGE>([\\s\\S]+)<\\/VANES_IMAGE>$/);if(match)bubble.innerHTML='<div>✦ Image created by VANES AI</div><img src="'+escape(match[1])+'" alt="AI-generated educational visual" style="display:block;max-width:100%;max-height:520px;margin-top:10px;border-radius:12px"><div class="vanes-actions"><button type="button" data-copy-image="1">Copy image URL</button></div>';const copy=el.querySelector("[data-copy-image]");if(copy)copy.onclick=()=>navigator.clipboard?.writeText(match[1]).then(()=>toast("Image URL copied"));
  }

  const generate=document.querySelector("#generateButton");
  if(generate)generate.addEventListener("click",generateImage);

  if(!activeId || !current()) newChat(); else {renderHistory();renderMessages();}
  setupUI();
})();
