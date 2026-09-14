/* Small post-boot compatibility patch for the stable VANES runtime. */
(function(){
  function boot(){
    const box=document.querySelector('#dashboardSubjects');
    if(box){
      const cards=[['Kiswahili','O-Level','Sarufi na matumizi ya lugha'],['English Language','O-Level','Comprehension and communication'],['Basic Mathematics','O-Level','Algebra and problem solving'],['Advanced Mathematics','A-Level','Calculus and functions'],['History','O-Level','Tanzania and world history'],['Geography','O-Level','Physical and human geography'],['Chemistry','O-Level','Atoms, bonding and reactions'],['Physics','O-Level','Mechanics and energy']];
      box.innerHTML=cards.map(s=>`<article class="topic" data-patch-subject="${s[1]}:${s[0]}"><span class="topic-icon">✦</span><div><strong>${s[0]}</strong><p>${s[1]} · ${s[2]}</p></div><span class="topic-arrow">→</span></article>`).join('');
      box.querySelectorAll('[data-patch-subject]').forEach(el=>el.addEventListener('click',()=>window.VANES_SWITCH_VIEW?.('subjects')));
    }
    document.querySelectorAll('[data-prompt]').forEach(btn=>btn.onclick=()=>{const input=document.querySelector('#chatInput');if(input){input.value=btn.dataset.prompt;input.focus();}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
