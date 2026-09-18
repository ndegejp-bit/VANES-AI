/* VANES device notifications and study reminders. */
(function(){
'use strict';
const KEY='vanes-notification-settings-v1';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{enabled:false,minutes:60}}catch{return{enabled:false,minutes:60}}};
const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
async function permission(){if(!('Notification'in window))return false;const p=Notification.permission==='granted'?true:await Notification.requestPermission()==='granted';return p}
async function notify(title,body){if(!await permission())return;const reg=await navigator.serviceWorker?.ready.catch(()=>null);if(reg?.showNotification)reg.showNotification(title,{body,icon:'assets/vanes-logo.svg',badge:'assets/vanes-logo.svg',tag:'vanes-study-reminder'});else new Notification(title,{body,icon:'assets/vanes-logo.svg'})}
function schedule(){const x=read();if(!x.enabled)return;const delay=Math.max(15,Number(x.minutes)||60)*60000;clearTimeout(window.__vanesNotifyTimer);window.__vanesNotifyTimer=setTimeout(async()=>{await notify('Time to study with VANES AI','Keep your learning streak going. Open VANES for your next focused session.');schedule()},delay)}
function boot(){if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});schedule();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
