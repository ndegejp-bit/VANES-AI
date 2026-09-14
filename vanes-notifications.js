/* VANES device notifications and study reminders. */
(function(){
'use strict';
const KEY='vanes-notification-settings-v1';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{enabled:false,minutes:60}}catch{return{enabled:false,minutes:60}}};
const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
async function permission(){if(!('Notification'in window))return false;const p=Notification.permission==='granted'?true:await Notification.requestPermission()==='granted';return p}
async function notify(title,body){if(!await permission())return;const reg=await navigator.serviceWorker?.ready.catch(()=>null);if(reg?.showNotification)reg.showNotification(title,{body,icon:'/assets/vanes-logo.svg',badge:'/assets/vanes-logo.svg',tag:'vanes-study-reminder'});else new Notification(title,{body,icon:'/assets/vanes-logo.svg'})}
function panel(){const host=document.querySelector('.sidebar-bottom');if(!host||document.querySelector('.vanes-notify-panel'))return;const p=document.createElement('div');p.className='vanes-notify-panel';p.innerHTML=`<button type="button" id="vanesNotifyButton" class="theme-button">🔔 <span>Study notifications</span></button><div id="vanesNotifyStatus" class="profile-context-badge"></div>`;host.insertBefore(p,host.firstChild);const b=p.querySelector('#vanesNotifyButton'),s=p.querySelector('#vanesNotifyStatus');const update=()=>{const x=read();s.textContent=x.enabled?'Enabled on this device':'Tap to enable reminders';b.querySelector('span').textContent=x.enabled?'Notifications on':'Study notifications'};b.addEventListener('click',async()=>{const ok=await permission();if(!ok){s.textContent='Notification permission was not granted.';return}const x=read();x.enabled=!x.enabled;write(x);if(x.enabled){await notify('VANES AI notifications enabled','You will receive study reminders on this device.');}update()});update()}
function schedule(){const x=read();if(!x.enabled)return;const delay=Math.max(15,Number(x.minutes)||60)*60000;clearTimeout(window.__vanesNotifyTimer);window.__vanesNotifyTimer=setTimeout(async()=>{await notify('Time to study with VANES AI','Keep your learning streak going. Open VANES for your next focused session.');schedule()},delay)}
function boot(){if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});panel();schedule();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
