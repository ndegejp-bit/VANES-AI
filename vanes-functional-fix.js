/* VANES AI functional hardening layer. Runs after the main chat runtime. */
(function(){
  'use strict';
  const STORAGE='vanes-chat-conversations-v1';
  const ACTIVE='vanes-chat-active-v1';
  const load=()=>{try{return JSON.parse(localStorage.getItem(STORAGE))||[]}catch{return[]}};
  const save=v=>localStorage.setItem(STORAGE,JSON.stringify(v.slice(0,30)));
  const esc=s=>String(s||'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  function status(t){document.querySelector('#vanes-status')?.replaceChildren(document.createTextNode(t));}
  function regenerate(index){
    const chats=load(), id=localStorage.getItem(ACTIVE), chat=chats.find(c=>c.id===id);
    if(!chat||!chat.messages[index]||chat.messages[index].role!=='assistant')return;
    const user=chat.messages[index-1]; if(!user||user.role!=='user')return;
    chat.messages.splice(index,1); save(chats);
    const input=document.querySelector('#chatInput'); if(input){input.value=user.content;document.querySelector('#chatForm')?.requestSubmit();}
  }
  document.addEventListener('click',e=>{
    const regen=e.target.closest('[data-regenerate]');
    if(regen){e.preventDefault();e.stopImmediatePropagation();regenerate(Number(regen.dataset.regenerate));return;}
    const generate=e.target.closest('#generateButton');
    if(generate){e.preventDefault();e.stopImmediatePropagation();const input=document.querySelector('#chatInput');if(input){input.value='Create an educational study illustration for this request. Make it clear, labelled, accurate and suitable for a Tanzanian secondary-school learner. '+(input.value||'Explain the concept visually.');input.focus();status('Image request ready — send it to VANES.');}}
  },true);
  const style=document.createElement('style');style.textContent='.vanes-chat-tools{position:relative;z-index:1}.vanes-stop{background:#b42318!important;color:#fff!important}.vanes-content img{max-width:100%;border-radius:10px}.topic-chip{cursor:pointer}';document.head.append(style);
})();
