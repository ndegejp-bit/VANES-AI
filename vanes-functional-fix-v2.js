/* VANES AI final frontend hardening. Loaded after full-chat.js. */
(function(){
'use strict';
const KEY='vanes-chat-conversations-v1',ACTIVE='vanes-chat-active-v1';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}};
const write=v=>localStorage.setItem(KEY,JSON.stringify(v.slice(0,30)));
const status=t=>{const e=document.querySelector('#vanes-status');if(e)e.textContent=t};
function regenerate(index){
 const chats=read(),id=localStorage.getItem(ACTIVE),chat=chats.find(c=>c.id===id);
 if(!chat||chat.messages[index]?.role!=='assistant'||chat.messages[index-1]?.role!=='user')return;
 const prompt=chat.messages[index-1].content;chat.messages.splice(index-1,2);write(chats);
 const input=document.querySelector('#chatInput'),form=document.querySelector('#chatForm');if(input&&form){input.value=prompt;form.requestSubmit();}
}
document.addEventListener('click',e=>{
 const r=e.target.closest('[data-regenerate]');if(r){e.preventDefault();e.stopImmediatePropagation();regenerate(Number(r.dataset.regenerate));return;}
 const g=e.target.closest('#generateButton');if(g){e.preventDefault();e.stopImmediatePropagation();const i=document.querySelector('#chatInput');if(i){i.value='Create a clear educational study illustration for: '+(i.value.trim()||'the current study topic')+'. Include useful labels and keep it accurate for a Tanzanian secondary-school learner.';i.focus();status('Image prompt prepared — press Send.');}}
},true);
})();
