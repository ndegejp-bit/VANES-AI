/* VANES AI Runway creative studio — video and visual effects inside VANES. */
(function(){
'use strict';
const API=window.VANES_RUNWAY_ENDPOINT||'/api/video';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function addStyles(){const s=document.createElement('style');s.textContent=`
.vanes-runway-btn{border:1px solid #9b8cff!important;background:linear-gradient(135deg,#5b5cf6,#c03cff)!important;color:#fff!important;border-radius:10px;padding:8px 11px;font:700 11px inherit;cursor:pointer;box-shadow:0 0 18px rgba(139,92,246,.2)}
.vanes-runway-modal{position:fixed;inset:0;z-index:100;background:rgba(2,6,14,.78);backdrop-filter:blur(8px);display:none;place-items:center;padding:18px}.vanes-runway-modal.open{display:grid}
.vanes-runway-card{width:min(620px,100%);max-height:min(760px,94vh);overflow:auto;background:linear-gradient(145deg,#0b1728,#070e19);border:1px solid #31537a;border-radius:18px;padding:22px;box-shadow:0 25px 90px rgba(0,0,0,.5)}
.vanes-runway-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.vanes-runway-head h2{margin:0;color:#f5f8ff;font-size:21px}.vanes-runway-close{border:0;background:#182333;color:#cbd8e7;border-radius:9px;padding:7px 10px;cursor:pointer}
.vanes-runway-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}.vanes-runway-tabs button{border:1px solid #29415e;background:#0e1a2a;color:#b9cbe0;border-radius:9px;padding:10px;cursor:pointer;font-weight:700}.vanes-runway-tabs button.active{background:linear-gradient(135deg,#1c67ff,#8b4dff);color:#fff;border-color:#7cecff}
.vanes-runway-card label{display:block;color:#b9cbe0;font-size:11px;font-weight:800;margin:12px 0}.vanes-runway-card textarea,.vanes-runway-card select{width:100%;margin-top:7px;background:#081423!important;color:#eef7ff!important;border:1px solid #294b6d!important;border-radius:10px;padding:11px;font:400 13px inherit}.vanes-runway-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.vanes-runway-start{width:100%;margin-top:15px;border:1px solid #00dfff;background:linear-gradient(135deg,#126cff,#9a35ff);color:#fff;border-radius:11px;padding:12px;font-weight:800;cursor:pointer}.vanes-runway-note{font-size:10px;color:#8098af;line-height:1.5;margin-top:10px}.vanes-runway-status{margin-top:15px;padding:12px;border:1px solid #29415e;border-radius:11px;background:#081321;color:#cfe0ef;font-size:12px}.vanes-runway-video{width:100%;margin-top:12px;border-radius:12px;border:1px solid #31537a;background:#000}.vanes-runway-image{max-width:100%;border-radius:12px;border:1px solid #31537a;margin-top:12px}` ;document.head.append(s)}
function mount(){
 addStyles();
 const panel=document.querySelector('#coach .chat-panel'); if(!panel)return;
 const tools=panel.querySelector('.vanes-chat-tools'); if(!tools||document.querySelector('#vanes-runway-open'))return;
 const b=document.createElement('button');b.id='vanes-runway-open';b.className='vanes-runway-btn';b.type='button';b.textContent='✦ Runway Create';tools.insertBefore(b,tools.querySelector('#vanes-status'));
 const modal=document.createElement('div');modal.className='vanes-runway-modal';modal.id='vanes-runway-modal';
 modal.innerHTML=`<div class="vanes-runway-card"><div class="vanes-runway-head"><h2>✦ VANES Creative Studio</h2><button type="button" class="vanes-runway-close">Close</button></div><p class="vanes-runway-note">Create motion and cinematic effects inside VANES using Runway. Generation uses your connected Runway account and credits.</p><div class="vanes-runway-tabs"><button type="button" data-mode="text" class="active">Text → Video</button><button type="button" data-mode="image">Image → Video</button><button type="button" data-mode="effect">AI Effect</button></div><label>Describe what you want<textarea id="vanes-runway-prompt" rows="5" placeholder="Example: A futuristic VANES AI logo emerges from a glowing cyan ring, camera slowly pushes in, cinematic lighting, particles and smooth motion."></textarea></label><div class="vanes-runway-row"><label>Duration<select id="vanes-runway-duration"><option value="5">5 seconds</option><option value="10">10 seconds</option></select></label><label>Format<select id="vanes-runway-ratio"><option value="1280:720">Landscape 16:9</option><option value="720:1280">Portrait 9:16</option><option value="960:960">Square</option><option value="1104:832">Landscape 4:3</option><option value="832:1104">Portrait 3:4</option></select></label></div><button type="button" class="vanes-runway-start" id="vanes-runway-start">Create with Runway ✦</button><div class="vanes-runway-status" id="vanes-runway-status">Ready.</div></div>`;
 document.body.append(modal);
 const close=()=>modal.classList.remove('open'); b.onclick=()=>modal.classList.add('open'); modal.querySelector('.vanes-runway-close').onclick=close; modal.addEventListener('click',e=>{if(e.target===modal)close()});
 let mode='text';
 modal.querySelectorAll('[data-mode]').forEach(x=>x.onclick=()=>{mode=x.dataset.mode;modal.querySelectorAll('[data-mode]').forEach(y=>y.classList.toggle('active',y===x));const p=modal.querySelector('#vanes-runway-prompt');p.placeholder=mode==='image'?'Example: Slowly rotate the subject, add cinematic camera movement, glowing particles and subtle depth.':'Example: A futuristic VANES AI logo emerges from a glowing cyan ring, camera slowly pushes in, cinematic lighting, particles and smooth motion.'});
 async function create(){
  const prompt=modal.querySelector('#vanes-runway-prompt').value.trim();const status=modal.querySelector('#vanes-runway-status');const image=window.VANES_PENDING_IMAGE||null;
  if(!prompt){status.textContent='Describe the video or effect first.';return}
  if(mode==='image'&&!image){status.textContent='Attach an image in the VANES chat first, then choose Image → Video.';return}
  const enhanced=mode==='effect'?'Apply a polished cinematic AI visual effect: '+prompt:prompt;
  status.innerHTML='<b>Runway is creating your video…</b><br><small>Submitting the creative task and waiting for the render.</small>';
  modal.querySelector('#vanes-runway-start').disabled=true;
  try{
   const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:enhanced,image:mode==='image'?image:null,duration:Number(modal.querySelector('#vanes-runway-duration').value),ratio:modal.querySelector('#vanes-runway-ratio').value})});
   const d=await res.json();if(!res.ok||!d.taskId)throw new Error(d.error||'Runway did not return a task.');
   let task=null;
   for(let i=0;i<45;i++){await new Promise(r=>setTimeout(r,4000));const q=await fetch(API+'?task='+encodeURIComponent(d.taskId));task=await q.json();const pct=typeof task.progress==='number'?Math.round(task.progress*100):null;status.innerHTML='<b>Runway is rendering…</b><br><small>'+esc(task.status||'PROCESSING')+(pct!==null?' · '+pct+'%':'')+'</small>';if(task.status==='SUCCEEDED'||task.status==='FAILED'||task.status==='CANCELLED')break}
   if(task?.status!=='SUCCEEDED')throw new Error(task?.failure||'Runway render did not complete in time.');
   const outputs=Array.isArray(task.output)?task.output:(Array.isArray(task.outputs)?task.outputs:[]);if(!outputs.length)throw new Error('Runway completed but returned no video URL.');
   status.innerHTML='<b>VANES created your video with Runway ✦</b><video class="vanes-runway-video" controls playsinline src="'+esc(outputs[0])+'"></video><br><small>Runway output is ready inside VANES.</small>';
  }catch(e){status.innerHTML='<b>Runway could not create the video.</b><br><small>'+esc(e.message||'Generation failed.')+'</small><br><small>Make sure the private RUNWAY_API_KEY is configured on the VANES Cloudflare Worker.</small>'}
  finally{modal.querySelector('#vanes-runway-start').disabled=false}
 }
 modal.querySelector('#vanes-runway-start').onclick=create;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,250),{once:true});else setTimeout(mount,250);
window.VANES_RUNWAY_ENDPOINT=window.VANES_RUNWAY_ENDPOINT||'/api/video';
})();