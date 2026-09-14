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
 const s=document.createElement('style');s.id='vanes-image-styles';s.textContent='.vanes-generated-image{display:block;width:min(100%,760px);height:auto;border-radius:16px;margin:10px 0;border:1px solid rgba(127,127,127,.25);box-shadow:0 10px 30px rgba(0,0,0,.18)}.vanes-image-result{margin-top:12px}.vanes-image-loading{padding:16px;border-radius:14px;background:rgba(127,127,127,.10);display:flex;align-items:center;gap:10px}.vanes-image-spinner{width:18px;height:18px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:vanes-spin .7s linear infinite;flex:0 0 auto}@keyframes vanes-spin{to{transform:rotate(360deg)}}';document.head.appendChild(s);
}
function imageUrl(value){
 if(typeof value==='string')return /^(https?:\/\/|data:image\/)/i.test(value)?value:null;
 if(!value||typeof value!=='object')return null;
 return imageUrl(value.url)||imageUrl(value.image_url)||imageUrl(value.image);
}
function collectImages(value,out=[]){
 if(Array.isArray(value)){value.forEach(v=>collectImages(v,out));return out;}
 const url=imageUrl(value);if(url)out.push(url);
 return out;
}
function readableError(value){
 if(typeof value==='string'&&value.trim())return value.trim();
 if(value&&typeof value==='object'){
  const nested=value.message||value.error||value.detail||value.reason;
  if(typeof nested==='string'&&nested.trim())return nested.trim();
  if(nested&&typeof nested==='object')return readableError(nested);
  try{const text=JSON.stringify(value);if(text&&text!=='{}')return text;}catch{}
 }
 return 'Image generation failed. Please try again.';
}
async function generateImage(){
 const input=document.querySelector('#chatInput');if(!input)return;
 const prompt=input.value.trim()||'an accurate labelled diagram of the current study topic';
 const button=document.querySelector('#generateButton');
 if(button){button.disabled=true;button.textContent='…';}
 injectImageStyles();
 const started=Date.now();
 status('VANES is creating your study image…');
 let box=document.querySelector('#messages');
 let loading=null;
 if(box){loading=document.createElement('div');loading.className='message assistant vanes-image-result';loading.dataset.imageLoading='1';loading.innerHTML='<div class="vanes-image-loading"><span class="vanes-image-spinner" aria-hidden="true"></span><span>Creating your image… this can take a little while.</span></div>';box.appendChild(loading);box.scrollTop=box.scrollHeight;}
 try{
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),120000);
   let res;
   try{res=await fetch('/api/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt}),signal:controller.signal});}
   finally{clearTimeout(timeout);}
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw new Error(readableError(data?.error||data,`Image generation failed (${res.status}).`));
   const urls=collectImages(data.images||[]);
   if(!urls.length)throw new Error(readableError(data?.text||data?.error,'No image was returned.'));
   if(loading)loading.remove();
   [...new Set(urls)].forEach(url=>{
     const msg=document.createElement('div');msg.className='message assistant vanes-image-result';
     const img=document.createElement('img');img.className='vanes-generated-image';img.src=url;img.alt=prompt;img.loading='lazy';
     const label=document.createElement('div');label.className='message-meta';label.textContent='VANES AI · Generated study image';
     msg.append(img,label);box?.appendChild(msg);
   });
   input.value='';
   const seconds=Math.round((Date.now()-started)/1000);
   status(`Image created successfully${seconds?` in ${seconds}s`:''}.`);
   if(box)box.scrollTop=box.scrollHeight;
 }catch(err){
   const message=err?.name==='AbortError'?'The image service took too long to respond. Please try again.':readableError(err?.message||err);
   if(loading)loading.innerHTML='<div class="vanes-image-loading">⚠ '+message.replace(/[<>]/g,'')+'</div>';
   status('Image generation failed.');
 }finally{if(button){button.disabled=false;button.textContent='✧';}}
}
document.addEventListener('click',e=>{
 const r=e.target.closest('[data-regenerate]');if(r){e.preventDefault();e.stopImmediatePropagation();regenerate(Number(r.dataset.regenerate));return;}
 const g=e.target.closest('#generateButton');if(g){e.preventDefault();e.stopImmediatePropagation();generateImage();return;}
},true);
})();
