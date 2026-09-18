/* VANES AI — learner-profile compatibility bridge.
 * The primary profile module owns chat context injection. This file only keeps
 * the v1/v2 profile records synchronized and intentionally does not wrap fetch,
 * preventing duplicate learner-context system prompts.
 */
(function(){
'use strict';
const V2='vanes-learner-profile-v2';
const V1='vanes-learner-profile-v1';
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function sync(){
  const v2=read(V2),v1=read(V1);
  const profile=v2||v1;
  if(!profile)return;
  try{
    const value=JSON.stringify(profile);
    localStorage.setItem(V2,value);
    localStorage.setItem(V1,value);
  }catch(_){/* localStorage may be unavailable */}
}
sync();
window.addEventListener('storage',function(event){
  if(event.key===V1||event.key===V2)sync();
});
})();
