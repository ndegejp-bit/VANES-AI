/* VANES AI — stable chat UI and conversation engine. */
(function(){
'use strict';

function boot(){
  const panel=document.querySelector('#coach .chat-panel');
  const messages=document.querySelector('#messages');
  const form=document.querySelector('#chatForm');
  const input=document.querySelector('#chatInput');
  if(!panel||!messages||!form||!input){return;}

  const KEY='vanes-chat-conversations-v1';
  const ACTIVE='vanes-chat-active-v1';
  const CHAT_API=window.VANES_CHAT_ENDPOINT||'/api/chat';
  const IMAGE_API=window.VANES_IMAGE_ENDPOINT||'/api/image';
  let chats=read(KEY,[]);
  let active=localStorage.getItem(ACTIVE)||'';
  let busy=false;
  let aborter=null;

  function read(k,f){try{return JSON.parse(localStorage.getItem(k))||f}catch(e){return f}}
  function save(){localStorage.setItem(KEY,JSON.stringify(chats.slice(0,30)));}
  function id(){return 'chat-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
  function current(){return chats.find(c=>c.id===active)}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function md(v){
    let s=esc(v);
    s=s.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g,function(_,x){return '<pre><code>'+x.trim()+'</code></pre>'});
    s=s.replace(/\`([^\`]+)\`/g,'<code>$1</code>');
    s=s.replace(/^### (.*)$/gm,'<h4>$1</h4>').replace(/^## (.*)$/gm,'<h3>$1</h3>').replace(/^# (.*)$/gm,'<h2>$1</h2>');
    s=s.replace(/^[-*] (.*)$/gm,'<li>$1</li>').replace(/(?:<li>.*<\\/li>\\n?)+/g,function(x){return '<ul>'+x+'</ul>'});
    s=s.replace(/\\*\\*(.*?)\\*\\*/g,'<strong>$1</strong>');
    return s.replace(/\\n/g,'<br>');
  }
  function toast(t){if(window.showToast)window.showToast(t)}
  function ensure(){
    if(!current()){
      active=id();
      chats.unshift({id:active,title:'New chat',messages:[]});
      localStorage.setItem(ACTIVE,active);save();
    }
  }
  function renderTools(){
    let tools=panel.querySelector('.vanes-chat-tools');
    if(!tools){
      tools=document.createElement('div');
      tools.className='vanes-chat-tools';
      tools.innerHTML='<button type="button" class="primary" id="vanes-new-chat">＋ New chat</button><button type="button" id="vanes-history-toggle">☰ History</button><button type="button" id="vanes-clear-history">Clear history</button><span id="vanes-status">Ready</span>';
      panel.insertBefore(tools,messages);
    }
    let history=panel.querySelector('#vanes-chat-history');
    if(!history){
      history=document.createElement('div');history.id='vanes-chat-history';history.className='vanes-chat-history';panel.insertBefore(history,messages);
    }
    tools.querySelector('#vanes-new-chat').onclick=function(){active=id();chats.unshift({id:active,title:'New chat',messages:[]});localStorage.setItem(ACTIVE,active);save();render()};
    tools.querySelector('#vanes-history-toggle').onclick=function(){history.classList.toggle('open');renderHistory()};
    tools.querySelector('#vanes-clear-history').onclick=function(){if(confirm('Delete all saved VANES chats from this browser?')){chats=[];active='';localStorage.removeItem(ACTIVE);ensure();save();render()}};
    renderHistory();
  }
  function renderHistory(){
    const h=panel.querySelector('#vanes-chat-history');if(!h)return;
    h.innerHTML=chats.slice(0,12).map(function(c){return '<button type="button" class="vanes-history-item '+(c.id===active?'active':'')+'" data-chat-id="'+esc(c.id)+'"><strong>'+esc(c.title||'New chat')+'</strong><small>'+c.messages.filter(function(m){return m.role!=='system'}).length+' messages</small></button>'}).join('')||'<p class="vanes-history-empty">No saved chats yet.</p>';
    h.querySelectorAll('[data-chat-id]').forEach(function(b){b.onclick=function(){active=b.getAttribute('data-chat-id');localStorage.setItem(ACTIVE,active);render()}})
  }
  function imageMarkup(content){
    const m=String(content||'').match(/^<VANES_IMAGE>([\\s\\S]+)<\\/VANES_IMAGE>$/);
    if(!m)return null;
    return '<div>✦ Image created by VANES AI</div><img class="vanes-generated-image" src="'+esc(m[1])+'" alt="AI-generated educational visual">';
  }
  function render(){
    ensure();renderHistory();messages.innerHTML='';
    const c=current();
    if(!c.messages.length){
      messages.innerHTML='<div class="message coach-message"><span>✦</span><div class="vanes-bubble"><div class="vanes-content">Hi! I\'m VANES AI. Ask me anything in English or Kiswahili. I can explain, analyse, practise, mark, plan, summarise, translate and work with study images.</div></div></div>';
      return;
    }
    c.messages.forEach(function(m,i){
      if(m.role==='system')return;
      const el=document.createElement('div');el.className='message '+(m.role==='user'?'user-message':'coach-message');
      if(m.role==='assistant'){
        const im=imageMarkup(m.content);
        el.innerHTML='<span>✦</span><div class="vanes-bubble"><div class="vanes-content">'+(im||md(m.content))+'</div><div class="vanes-actions"><button type="button" data-copy="'+i+'">Copy</button><button type="button" data-regenerate="'+i+'">Regenerate</button></div></div>';
      }else{
        el.innerHTML='<div class="vanes-bubble"><div class="vanes-content">'+md(m.content)+'</div><div class="vanes-actions"><button type="button" data-edit="'+i+'">Edit</button></div></div>';
      }
      messages.appendChild(el);
    });
    messages.querySelectorAll('[data-copy]').forEach(function(b){b.onclick=function(){navigator.clipboard?.writeText(c.messages[+b.dataset.copy].content);toast('Copied')}});
    messages.querySelectorAll('[data-edit]').forEach(function(b){b.onclick=function(){input.value=c.messages[+b.dataset.edit].content;input.focus()}});
    messages.querySelectorAll('[data-regenerate]').forEach(function(b){b.onclick=function(){regenerate(+b.dataset.regenerate)}});
    messages.scrollTop=messages.scrollHeight;
  }
  function setStatus(t){const s=panel.querySelector('#vanes-status');if(s)s.textContent=t}
  function system(){
    return 'You are VANES AI — Versatile Adaptive Neuro Emergent System — created by OB Technologies / OB Tech-Labs. You are an adaptive AI study assistant for the Tanzanian secondary-school curriculum. Detect subject and O-Level/CSEE or A-Level/ACSEE context from the learner profile and question. Explain step by step, show working for maths/science, mark work transparently, and answer in the learner\'s language. Never invent facts about OB Technologies or syllabus details that you cannot verify.';
  }
  async function send(text,image){
    ensure();const c=current();
    c.messages.push({role:'user',content:text||'Please analyse the attached study image.'});
    if(c.title==='New chat')c.title=(text||'Study image').slice(0,48);
    save();render();busy=true;aborter=new AbortController();setStatus('VANES is thinking…');
    const body={model:window.VANES_CHAT_MODEL||'openai/gpt-4o-mini',messages:[{role:'system',content:system()}].concat(c.messages.slice(-18).map(function(m){return {role:m.role,content:m.content}})),max_tokens:1200};
    if(image)body.messages[body.messages.length-1].content=[{type:'text',text:text||'Analyse this study image carefully.'},{type:'image_url',image_url:{url:image}}];
    try{
      const res=await fetch(CHAT_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:aborter.signal});
      if(!res.ok)throw new Error((await res.text()).slice(0,500)||('HTTP '+res.status));
      const a={role:'assistant',content:''};c.messages.push(a);render();
      const reader=res.body&&res.body.getReader();
      if(reader){
        const dec=new TextDecoder();let buf='';
        while(true){
          const q=await reader.read();if(q.done)break;buf+=dec.decode(q.value,{stream:true});
          const lines=buf.split('\\n');buf=lines.pop()||'';
          lines.forEach(function(line){if(!line.startsWith('data:'))return;const d=line.slice(5).trim();if(!d||d==='[DONE]')return;try{const j=JSON.parse(d),x=j.choices?.[0]?.delta?.content||'';a.content+=x;const node=messages.lastElementChild?.querySelector('.vanes-content');if(node)node.innerHTML=md(a.content);messages.scrollTop=messages.scrollHeight}catch(e){}});
        }
      }else{
        const d=await res.json();a.content=d.choices?.[0]?.message?.content||'';
      }
      if(!a.content)throw new Error('VANES returned an empty response.');
      save();render();setStatus('Ready');
    }catch(e){
      if(e.name!=='AbortError'){c.messages.push({role:'assistant',content:'I could not reach VANES AI. '+(e.message||'Please try again.')});save();render();setStatus('Connection error')}
    }finally{busy=false;aborter=null}
  }
  async function regenerate(i){
    if(busy)return;const c=current(),a=c?.messages[i],u=c?.messages[i-1];if(!a||a.role!=='assistant'||!u||u.role!=='user')return;
    c.messages.splice(i,1);save();await send(u.content,null);
  }
  function videoIntent(s){return /\\b(video|animation|animated|animate|motion|moving|movie|clip|cinematic|film|reel|camera movement|time-lapse|timelapse|vfx)\\b/i.test(s)}
  async function generate(){
    const p=input.value.trim();if(!p){input.focus();toast('Describe what you want VANES to create.');return}
    if(videoIntent(p)){
      const b=document.querySelector('#vanes-runway-open');
      if(b){b.click();const x=document.querySelector('#vanes-runway-prompt');if(x)x.value=p;toast('Video request opened in VANES Creative Studio.');}
      else toast('Creative Studio is still loading.');
      return;
    }
    ensure();const c=current();c.messages.push({role:'user',content:'Create this educational visual: '+p});save();render();input.value='';setStatus('Creating image…');
    try{
      const res=await fetch(IMAGE_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:p})});
      const d=await res.json().catch(function(){return{}});
      if(!res.ok||!d.ok||!Array.isArray(d.images)||!d.images.length)throw new Error(d.error||'The image service returned no image.');
      c.messages.push({role:'assistant',content:'<VANES_IMAGE>'+d.images[0]+'</VANES_IMAGE>'});save();render();toast('Image created.');
    }catch(e){c.messages.push({role:'assistant',content:'I could not create that image. '+(e.message||'Please try again.')});save();render()}
    finally{setStatus('Ready')}
  }
  form.addEventListener('submit',function(e){e.preventDefault();if(busy)return;const t=input.value.trim(),im=window.VANES_PENDING_IMAGE||null;if(!t&&!im)return;input.value='';window.VANES_PENDING_IMAGE=null;const p=document.querySelector('#imagePreview');if(p){p.hidden=true;p.innerHTML=''}send(t,im)});
  input.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))}});
  const upload=document.querySelector('#uploadButton');
  if(upload){
    let fi=document.querySelector('#imageInput');if(!fi){fi=document.createElement('input');fi.type='file';fi.id='imageInput';fi.accept='image/*';fi.hidden=true;document.body.appendChild(fi)}
    upload.onclick=function(e){e.preventDefault();fi.click()};
    fi.onchange=function(){const f=fi.files&&fi.files[0];if(!f)return;if(f.size>8*1024*1024){toast('Choose an image smaller than 8 MB.');return}const r=new FileReader();r.onload=function(){window.VANES_PENDING_IMAGE=r.result;const p=document.querySelector('#imagePreview');if(p){p.hidden=false;p.innerHTML='<img src="'+esc(r.result)+'" alt="Study image preview" style="max-width:100%;max-height:150px;border-radius:8px"><span>Image attached — send a question or instruction.</span>'}};r.readAsDataURL(f)}
  }
  const gen=document.querySelector('#generateButton');if(gen)gen.onclick=function(e){e.preventDefault();if(!busy)generate()};
  let stop=document.querySelector('#vanes-stop');if(!stop){stop=document.createElement('button');stop.type='button';stop.id='vanes-stop';stop.className='vanes-stop';stop.textContent='■';stop.hidden=true;form.insertBefore(stop,form.lastElementChild)}
  stop.onclick=function(){if(aborter)aborter.abort()};
  const oldStop=new MutationObserver(function(){stop.hidden=!busy});oldStop.observe(stop,{attributes:true});
  renderTools();ensure();render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();