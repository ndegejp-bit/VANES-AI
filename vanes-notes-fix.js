/* VANES notes persistence + real study tracking, curriculum corrections, summaries and inline session AI. */
(function(){
'use strict';
const keyFromView=()=>{const label=document.querySelector('#workspaceLabel')?.textContent||'';const title=document.querySelector('#workspaceTitle')?.textContent||'';const level=label.includes(' · ')?label.split(' · ')[1]:'';return level&&title?`vanes-notes-${level}::${title}`:`vanes-notes-${title||'current'}`};
const oldKey=()=>`vanes-notes-${document.querySelector('#workspaceTitle')?.textContent||'current'}`;
const TRACK='vanes-study-tracking-v2',SUM='vanes-study-summaries-v1',STREAK='vanes-daily-streak-v2';
const custom={
 'Kiswahili':{level:'A-Level',description:'Kiswahili for Advanced Secondary students, including the H-K-L combination: lugha, fasihi, uchambuzi na mawasiliano ya kitaaluma.',topics:['Sarufi na matumizi ya lugha','Fasihi simulizi','Fasihi andishi','Ushairi','Riwaya','Tamthilia','Uhakiki wa fasihi','Historia na maendeleo ya Kiswahili','Isimu','Uandishi na mawasiliano']},
 'Historia ya Tanzania':{level:'A-Level',description:'Tanzania-focused history: colonial rule, nationalism, independence, union and post-independence development.',topics:['Pre-colonial societies of Tanzania','German colonial rule','British colonial rule','Nationalism and independence','Tanganyika independence','Union of Tanganyika and Zanzibar','Tanzania after independence','Political and economic development']},
 'Academic Communication':{level:'A-Level',description:'Academic reading, writing, study skills, note taking, summaries, referencing and presentations.',topics:['Academic reading','Academic writing','Study skills','Note taking','Summarising','Referencing','Presentation skills','Academic vocabulary']}
};
function read(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
function write(k,v){localStorage.setItem(k,JSON.stringify(v))}
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function subject(){const label=document.querySelector('#workspaceLabel')?.textContent||'',name=document.querySelector('#workspaceTitle')?.textContent||'Study session',level=label.includes(' · ')?label.split(' · ')[1]:'O-Level';return {name,level,key:`${level}::${name}`}}
function day(){return new Date().toISOString().slice(0,10)}
function refresh(){const t=read(TRACK,{subjects:{},minutes:0}),entries=Object.values(t.subjects),done=entries.reduce((n,x)=>n+(x.done||[]).length,0),total=entries.reduce((n,x)=>n+(x.total||0),0),pct=total?Math.min(100,Math.round(done/total*100)):0;const p=document.querySelector('#progressStat'),b=document.querySelector('#progressBar');if(p)p.textContent=`${pct}%`;if(b)b.style.width=`${pct}%`;const s=read(STREAK,{count:0,last:null}),se=document.querySelector('.stats-grid article:nth-child(2) strong');if(se)se.textContent=`${s.count} ${s.count===1?'day':'days'}`;const m=document.querySelector('#minutesStat');if(m)m.textContent=`${t.minutes||0} min`;document.querySelectorAll('.subject-card').forEach(c=>{const n=c.querySelector('h2')?.textContent.trim(),l=c.querySelector('.pill')?.textContent.trim(),e=t.subjects[`${l}::${n}`];if(!e)return;const q=e.total?Math.round(e.done.length/e.total*100):0,v=c.querySelector('.subject-progress');if(v){v.querySelector('span')?.style.setProperty('width',q+'%');v.lastChild.textContent=q+'%'}})}
function openSession(name,level,description,topics){const w=document.querySelector('#workspace');if(!w)return;document.querySelector('#workspaceLabel').textContent=`${name.toUpperCase()} · ${level}`;document.querySelector('#workspaceTitle').textContent=name;document.querySelector('#workspaceDescription').textContent=description;document.querySelector('#sessionTitle').textContent=`Start with ${topics[0]||name}`;const map=document.querySelector('#topicMap');map.innerHTML=topics.map(x=>`<button class="topic-chip" type="button">${x}</button>`).join('');map.querySelectorAll('.topic-chip').forEach(x=>x.addEventListener('click',()=>x.classList.toggle('active')));document.querySelector('#notes').value=localStorage.getItem(`vanes-notes-${level}::${name}`)||'';const sums=read(SUM,{});const sm=document.querySelector('#sessionSummary');if(sm)sm.value=sums[`${level}::${name}`]||'';w.dataset.sessionStarted=Date.now();window.VANES_SWITCH_VIEW?.('workspace');refresh()}
function removeGeneralAddCorrect(){const grid=document.querySelector('#subjectGrid');if(!grid)return;grid.querySelectorAll('.subject-card').forEach(c=>{if(c.querySelector('h2')?.textContent.trim()==='General Studies')c.remove()});const active=document.querySelector('.filter-button.active')?.dataset.filter;if(active==='O-Level')return;Object.entries(custom).forEach(([n,x])=>{if([...grid.querySelectorAll('h2')].some(h=>h.textContent.trim()===n))return;const c=document.createElement('article');c.className='panel subject-card';c.innerHTML=`<div class="subject-top"><span class="subject-icon">✦</span><span class="pill">${x.level}</span></div><h2>${n}</h2><p>${x.description}</p><div class="subject-progress"><div><span style="width:0%"></span></div>0%</div>`;c.addEventListener('click',()=>openSession(n,x.level,x.description,x.topics));grid.appendChild(c)});refresh()}
function planner(){
const SHELF='vanes-study-shelf-v1';
function shelfRead(){return read(SHELF,[])}
function shelfWrite(v){write(SHELF,v)}
function shelfRender(){
 const r=document.querySelector('#planResult'); if(!r)return;
 const items=shelfRead().sort((a,b)=>b.updatedAt-a.updatedAt);
 r.classList.add('generated','session-shelf');
 r.innerHTML='<div class="shelf-head"><div><p class="eyebrow">YOUR STUDY SHELF</p><h2>Saved study sessions</h2><p class="support-copy">Sessions stay here until you choose to delete them.</p></div><span class="shelf-count">'+items.length+'</span></div>'+
 (items.length?'<div class="shelf-list">'+items.map(x=>'<article class="shelf-item" data-shelf-id="'+esc(x.id)+'"><div class="shelf-icon">✦</div><div class="shelf-main"><strong>'+esc(x.subject)+'</strong><span>'+esc(x.level)+' · '+esc(x.time+' minutes')+'</span><small>'+esc(x.goal)+'</small><span class="shelf-time">Studied: '+formatClock(x.elapsedSeconds||0)+(x.completedSessions?' · '+x.completedSessions+' completed':'')+'</span><span class="shelf-status">'+esc(x.status||'Ready')+'</span></div><button type="button" class="shelf-open" data-shelf-open="'+esc(x.id)+'">Study again →</button><button type="button" class="shelf-delete" aria-label="Delete '+esc(x.subject)+' session" data-shelf-delete="'+esc(x.id)+'">Delete</button></article>').join('')+'</div>':'<div class="shelf-empty"><div class="empty-illustration">✦</div><h2>Your study shelf is empty.</h2><p>Create a study plan and start it. Saved sessions will appear here so you can return to them anytime.</p></div>');
}
function saveShelfSession(subject,level,goal,time,raw){
 const now=Date.now(),items=shelfRead();
 const item={id:'session-'+now+'-'+Math.random().toString(36).slice(2,8),subject,level,goal,time,raw,updatedAt:now};
 items.unshift(item);shelfWrite(items);shelfRender();return item;
}
function openShelfSession(item){
 if(!item)return;
 const topicList=(custom[item.subject]?.topics)||['Recall','Learn the core idea','Practice questions','Review and self-test'];
 openSession(item.subject,item.level,item.raw||item.subject+' · '+item.goal,topicList); startSessionTimer(item.id);
 const all=shelfRead().map(x=>x.id===item.id?{...x,updatedAt:Date.now()}:x);shelfWrite(all);
}
document.addEventListener('click',e=>{
 const del=e.target.closest('[data-shelf-delete]');
 if(del){e.preventDefault();e.stopImmediatePropagation();const id=del.dataset.shelfDelete;if(confirm('Delete this saved study session? This cannot be undone.')){shelfWrite(shelfRead().filter(x=>x.id!==id));shelfRender();window.showToast?.('Study session deleted');}return;}
 const open=e.target.closest('[data-shelf-open]');
 if(open){e.preventDefault();e.stopImmediatePropagation();openShelfSession(shelfRead().find(x=>x.id===open.dataset.shelfOpen));}
},true);
document.addEventListener('click',e=>{
 const card=e.target.closest('.shelf-item');if(!card||e.target.closest('button'))return;
 openShelfSession(shelfRead().find(x=>x.id===card.dataset.shelfId));
});
window.VANES_RENDER_SHELF=shelfRender;
window.VANES_START_STUDY_SESSION=(id)=>startSessionTimer(id);
try{shelfRender()}catch(err){console.error('VANES study shelf render failed',err)}
document.addEventListener('click',e=>{
 const btn=e.target.closest('#startPlan[data-study-start]');
 if(!btn)return;
 e.preventDefault();e.stopImmediatePropagation();
 const raw=btn.dataset.studyStart||'Study',goal=btn.dataset.studyGoal||'Study',time=Number(btn.dataset.studyTime||45);
 const base=raw.split(/\s+[—–-]\s+/)[0].trim();
 const match=Object.keys(custom).find(n=>n.toLowerCase()===base.toLowerCase());
 const card=[...document.querySelectorAll('#subjectGrid .subject-card')].find(c=>c.querySelector('h2')?.textContent.trim().toLowerCase()===base.toLowerCase());
 const level=match?custom[match].level:(card?.querySelector('.pill')?.textContent.trim()||'O-Level');
 const name=match||base;
 const item=saveShelfSession(name,level,goal,time,raw);
 const topicList=(custom[name]?.topics)||['Recall','Learn the core idea','Practice questions','Review and self-test'];
 startSessionTimer(item.id);
 openSession(name,level,raw+' · '+goal,topicList);
 updateClock();
 window.showToast?.('Study session started ✓ · Timer is running');
},true);

document.addEventListener('submit',e=>{
 const form=e.target.closest('#planForm');if(!form)return;
 e.preventDefault();e.stopImmediatePropagation();
 const f=new FormData(form),raw=String(f.get('subject')||'Study'),base=raw.split(/\s+[—–-]\s+/)[0].trim(),goal=String(f.get('goal')||'Study'),time=Number(f.get('time')||45);
 const match=Object.keys(custom).find(n=>n.toLowerCase()===base.toLowerCase());
 const level=match?custom[match].level:(([...document.querySelectorAll('#subjectGrid .subject-card')].find(c=>c.querySelector('h2')?.textContent.trim().toLowerCase()===base.toLowerCase())?.querySelector('.pill')?.textContent.trim())||'O-Level');
 const name=match||base;
 const item=saveShelfSession(name,level,goal,time,raw);
 const topicList=(custom[name]?.topics)||['Recall','Learn the core idea','Practice questions','Review and self-test'];
 openSession(name,level,raw+' · '+goal,topicList); startSessionTimer(item.id);
 window.showToast?.('Study session saved to your shelf');
},true);
}function support(){const grid=document.querySelector('.workspace-grid');if(!grid||document.querySelector('.session-support'))return;const p=document.createElement('article');p.className='panel session-support';p.innerHTML=`<div><p class="eyebrow">STUDY SUMMARY</p><h2>Your session summary</h2><p class="support-copy">Keep the key ideas, formulas, examples and questions you want to remember.</p><textarea id="sessionSummary" placeholder="Write your summary here…"></textarea><div class="note-footer"><span id="summaryStatus">Saved locally</span><span id="summaryCount">0 words</span></div></div><div><p class="eyebrow">LIVE AI ASSISTANCE</p><h2>Ask while you study</h2><p class="support-copy">Get AI help without leaving this study session.</p><div class="ai-quick"><button type="button" data-aiq="Explain this topic simply">Explain this</button><button type="button" data-aiq="Give me one practice question and wait for my answer">Practice me</button><button type="button" data-aiq="Check my notes and tell me what I should improve">Check my notes</button></div><form id="sessionAiForm"><input id="sessionAiInput" placeholder="Ask about this lesson…"><button class="primary-button" type="submit">Ask AI</button></form><div id="sessionAiAnswer" class="session-ai-answer">Your AI help will appear here.</div></div>`;grid.appendChild(p);p.querySelector('#sessionSummary').addEventListener('input',e=>{const s=subject(),all=read(SUM,{});all[s.key]=e.target.value;write(SUM,all);p.querySelector('#summaryStatus').textContent='Saved just now';p.querySelector('#summaryCount').textContent=`${e.target.value.trim()?e.target.value.trim().split(/\s+/).length:0} words`});p.querySelectorAll('[data-aiq]').forEach(b=>b.onclick=()=>{p.querySelector('#sessionAiInput').value=b.dataset.aiq;p.querySelector('#sessionAiInput').focus()});p.querySelector('#sessionAiForm').addEventListener('submit',askAI)}
async function askAI(e){e.preventDefault();const input=document.querySelector('#sessionAiInput'),out=document.querySelector('#sessionAiAnswer');if(!input?.value.trim())return;const s=subject(),notes=document.querySelector('#sessionSummary')?.value||document.querySelector('#notes')?.value||'';out.textContent='VANES is thinking…';try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:`You are VANES AI inline study assistance. Never redirect the student to the AI study coach or another page. Current subject: ${s.name}, level: ${s.level}. Follow Tanzanian curriculum context and answer concisely.`},{role:'user',content:`Notes:\n${notes.slice(-6000)}\n\nQuestion: ${input.value.trim()}`} ]})});if(!r.ok)throw 0;const rd=r.body.getReader(),dec=new TextDecoder();let buf='',answer='';while(true){const {value,done}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});const ls=buf.split('\n');buf=ls.pop()||'';for(const line of ls){if(!line.startsWith('data:'))continue;const x=line.slice(5).trim();if(!x||x==='[DONE]')continue;try{const j=JSON.parse(x),d=j.choices?.[0]?.delta?.content;if(d){answer+=d;out.textContent=answer}}catch{}}}}catch{out.textContent='AI assistance is temporarily unavailable. Please try again.'}input.value=''}
function formatClock(sec){
 const s=Math.max(0,Math.floor(sec)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=s%60;
 return [h,m,x].map(v=>String(v).padStart(2,'0')).join(':');
}
const ACTIVE_SESSION='vanes-active-study-session-v1',SHELF='vanes-study-shelf-v1';
function activeSession(){return read(ACTIVE_SESSION,null)}
function startSessionTimer(shelfId){
 const items=read(SHELF,[]);
 const existing=items.find(x=>x.id===shelfId);
 const now=Date.now();
 const state={shelfId:shelfId||null,startedAt:now,baseSeconds:Number(existing?.elapsedSeconds)||0};
 write(ACTIVE_SESSION,state);
 if(shelfId&&existing){
   sessionShelfUpdate(shelfId,{status:'In progress',lastStartedAt:now});
 }
 const w=document.querySelector('#workspace');if(w)w.dataset.sessionStarted=String(now);
 const clock=document.querySelector('#liveSessionClock');clock?.classList.add('active');
 updateClock();
}
function elapsedSession(){
 const s=activeSession();if(!s)return 0;
 return Math.max(0,Math.floor((Date.now()-Number(s.startedAt||Date.now()))/1000));
}
function updateClock(){
 const el=document.querySelector('#sessionClock');if(!el)return;
 const s=activeSession();
 el.textContent=formatClock(s?elapsedSession():0);
 const panel=document.querySelector('#liveSessionClock');
 if(panel)panel.classList.toggle('active',!!s);
}
function sessionShelfUpdate(id,patch){
 if(!id)return;
 const items=read(SHELF,[]);
 const i=items.findIndex(x=>x.id===id);
 if(i<0)return;
 items[i]={...items[i],...patch,updatedAt:Date.now()};
 write(SHELF,items);
}
function complete(){
 const s=subject(),t=read(TRACK,{subjects:{},minutes:0}),chips=[...document.querySelectorAll('#topicMap .topic-chip.active')].map(x=>x.textContent.trim()),all=[...document.querySelectorAll('#topicMap .topic-chip')].map(x=>x.textContent.trim()),e=t.subjects[s.key]||{done:[],total:all.length||1,sessions:0};
 e.total=all.length||e.total||1;
 chips.forEach(x=>{if(!e.done.includes(x))e.done.push(x)});
 if(!chips.length&&all[0]&&!e.done.includes(all[0]))e.done.push(all[0]);
 e.sessions=(e.sessions||0)+1;
 const seconds=elapsedSession(),minutes=Math.floor(seconds/60);
 t.subjects[s.key]=e;t.minutes+=(minutes>0?minutes:0);
 const d=day(),st=read(STREAK,{count:0,last:null});
 if(st.last!==d)st.count=st.last===new Date(Date.now()-86400000).toISOString().slice(0,10)?st.count+1:1;
 st.last=d;write(STREAK,st);
 const active=activeSession();
 if(active?.shelfId){
   const items=read(SHELF,[]);
   const item=items.find(x=>x.id===active.shelfId);
   if(item)sessionShelfUpdate(active.shelfId,{
     elapsedSeconds:(Number(item.elapsedSeconds)||0)+seconds,
     completedSessions:(Number(item.completedSessions)||0)+1,
     lastCompletedAt:Date.now(),
     status:'Completed'
   });
 }
 write(TRACK,t);
 localStorage.removeItem(ACTIVE_SESSION);
 const clock=document.querySelector('#sessionClock');if(clock)clock.textContent='00:00:00';
 refresh();
 window.showToast?.(`Session saved ✓ · ${formatClock(seconds)} studied · ${s.name} is ready on your shelf`);
 setTimeout(()=>{window.VANES_RENDER_SHELF?.();window.VANES_SWITCH_VIEW?.('planner');window.VANES_RENDER_SHELF?.()},650);
}
function boot(){
setInterval(updateClock,250);
updateClock();
const n=document.querySelector('#notes'),s=document.querySelector('#saveStatus');n?.addEventListener('input',()=>{localStorage.setItem(keyFromView(),n.value);localStorage.setItem(oldKey(),n.value);if(s)s.textContent='Saved locally'});document.querySelector('#clearNotes')?.addEventListener('click',()=>{localStorage.removeItem(keyFromView());localStorage.removeItem(oldKey())});support();planner();document.addEventListener('click',e=>{if(e.target.closest('#completeSession')){e.preventDefault();e.stopImmediatePropagation();complete()}},true);new MutationObserver(removeGeneralAddCorrect).observe(document.querySelector('#subjectGrid')||document.body,{childList:true,subtree:true});setTimeout(removeGeneralAddCorrect,100);setInterval(refresh,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
