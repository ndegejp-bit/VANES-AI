/* VANES AI final frontend hardening + real image generation. */
(function(){
'use strict';
const KEY='vanes-chat-conversations-v1',ACTIVE='vanes-chat-active-v1';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}};
const write=v=>localStorage.setItem(KEY,JSON.stringify(v.slice(0,30)));
const status=t=>{const e=document.querySelector('#vanes-status');if(e)e.textContent=t;else{const c=document.querySelector('.chat-hint');if(c)c.textContent=t;}};
function regenerate(index){
 const chats=read(),id=localStorage.getItem(ACTIVE),chat=chats.find(c=>c.id===id);
 if(!chat||chat.messages[index]?.role!=='assistant'||chat.messages[index-1]?.role!=='user')return;
 const prompt=chat.messages[index-1].content;chat.messages.splice(index-1,2);write(chats);
 const input=document.querySelector('#chatInput'),form=document.querySelector('#chatForm');if(input&&form){input.value=prompt;form.requestSubmit();}
}
function injectImageStyles(){
 if(document.getElementById('vanes-image-styles'))return;
 const s=document.createElement('style');s.id='vanes-image-styles';s.textContent='.vanes-generated-image{display:block;width:min(100%,760px);height:auto;border-radius:16px;margin:10px 0;border:1px solid rgba(127,127,127,.25);box-shadow:0 10px 30px rgba(0,0,0,.18)}.vanes-image-result{margin-top:12px}.vanes-image-loading{padding:14px;border-radius:14px;background:rgba(127,127,127,.10)}';document.head.appendChild(s);
}
async function generateImage(){
 const input=document.querySelector('#chatInput');if(!input)return;
 const prompt=input.value.trim()||'an accurate labelled diagram of the current study topic';
 const button=document.querySelector('#generateButton');
 if(button){button.disabled=true;button.textContent='…';}
 injectImageStyles();status('VANES is creating your study image…');
 let box=document.querySelector('#messages');
 if(box){const loading=document.createElement('div');loading.className='message assistant vanes-image-result';loading.dataset.imageLoading='1';loading.innerHTML='<div class="vanes-image-loading">✦ Generating educational image…</div>';box.appendChild(loading);box.scrollTop=box.scrollHeight;}
 try{
   const res=await fetch('/api/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw new Error(data.error||'Image generation failed.');
   const urls=Array.isArray(data.images)?data.images:[];
   if(!urls.length)throw new Error('No image was returned.');
   const loading=box?.querySelector('[data-image-loading]');
   if(loading)loading.remove();
   urls.forEach((url,i)=>{
     const msg=document.createElement('div');msg.className='message assistant vanes-image-result';
     const img=document.createElement('img');img.className='vanes-generated-image';img.src=url;img.alt=prompt;img.loading='lazy';
     const label=document.createElement('div');label.className='message-meta';label.textContent='VANES AI · Generated study image';
     msg.append(img,label);box?.appendChild(msg);
   });
   input.value='';
   status('Image created successfully.');
   if(box)box.scrollTop=box.scrollHeight;
 }catch(err){
   const loading=box?.querySelector('[data-image-loading]');if(loading)loading.innerHTML='<div class="vanes-image-loading">⚠ '+String(err.message||err)+'</div>';
   status('Image generation failed.');
 }finally{if(button){button.disabled=false;button.textContent='✧';}}
}
document.addEventListener('click',e=>{
 const r=e.target.closest('[data-regenerate]');if(r){e.preventDefault();e.stopImmediatePropagation();regenerate(Number(r.dataset.regenerate));return;}
 const g=e.target.closest('#generateButton');if(g){e.preventDefault();e.stopImmediatePropagation();generateImage();return;}
},true);
})();
