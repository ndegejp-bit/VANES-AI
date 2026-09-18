/* VANES AI — frontend hardening only.
   Chat rendering, sending, regeneration, and image/video generation are owned by
   full-chat.js so there is only one event path for the chat UI.
*/
(function(){
'use strict';
const status=t=>{
  const e=document.querySelector('#vanes-status');
  if(e)e.textContent=t;
};

function markActionReady(e){
  const b=e.target.closest?.('#uploadButton,#generateButton,#settingsNotifyButton,#donateButton,#familyButton,#fieldButton,#feedbackButton,#saveAiSettings,#settingsEditProfile,#settingsOpenProfile,#settingsOpenNotifications,#clearLocalData');
  if(b)b.setAttribute('data-vanes-action-ready','true');
}

document.addEventListener('click',markActionReady,true);
window.VANES_SET_STATUS=status;
})();