/* VANES notes persistence compatibility fix. */
(function(){
'use strict';
const keyFromView=()=>{const label=document.querySelector('#workspaceLabel')?.textContent||'';const title=document.querySelector('#workspaceTitle')?.textContent||'';const level=label.includes(' · ')?label.split(' · ')[1]:'';return level&&title?`vanes-notes-${level}::${title}`:`vanes-notes-${title||'current'}`};
const oldKey=()=>`vanes-notes-${document.querySelector('#workspaceTitle')?.textContent||'current'}`;
function boot(){const n=document.querySelector('#notes'),s=document.querySelector('#saveStatus');if(!n)return;n.addEventListener('input',()=>{const value=n.value;localStorage.setItem(keyFromView(),value);localStorage.setItem(oldKey(),value);if(s)s.textContent='Saved locally';});document.querySelector('#clearNotes')?.addEventListener('click',()=>{localStorage.removeItem(keyFromView());localStorage.removeItem(oldKey());});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
