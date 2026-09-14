/* VANES AI identity, onboarding and accessibility layer. */
(function(){
  const logo='/assets/vanes-logo.svg';
  const obLogo='/assets/ob-technologies-lab.svg';
  document.querySelectorAll('.brand-mark').forEach(mark=>{mark.textContent='';const img=document.createElement('img');img.src=logo;img.alt='VANES AI';mark.appendChild(img);});
  const sidebar=document.querySelector('.sidebar');
  if(sidebar&&!sidebar.querySelector('.ob-brand')){const footer=document.createElement('div');footer.className='ob-brand';footer.innerHTML=`<span>Made by</span><img src="${obLogo}" alt="OB Technologies Lab">`;sidebar.appendChild(footer);}
  const modal=document.querySelector('#nameModal');
  if(modal){const card=modal.querySelector('.name-card');if(card){const oldP=card.querySelector('p:not(.eyebrow)');if(oldP)oldP.textContent='Tell VANES your name so your study dashboard feels personal. Your learner profile stays on this device.';if(!card.querySelector('.first-launch-note')){const note=document.createElement('div');note.className='first-launch-note';note.innerHTML='<strong>VANES = Verseversatile Adaptive Neuro Emergent System</strong><br>Ask questions, analyse work, practise, plan, study from images, and explore the Tanzanian curriculum.';card.appendChild(note);}}}
  const hero=document.querySelector('.hero-copy');
  if(hero&&!hero.querySelector('.vanes-definition')){const p=document.createElement('p');p.className='vanes-definition subtle';p.textContent='Verseversatile Adaptive Neuro Emergent System — adaptive learning that changes with the learner.';hero.insertBefore(p,hero.querySelector('.hero-meta'));}
  if(typeof uniqueSubjects!=='undefined'&&typeof renderSubjects==='function'){
    const extras=[
      {name:'Business Studies',level:'A-Level',lesson:'Business, management and entrepreneurship',progress:0,icon:'◇',tone:'#fff4c9',description:'Entrepreneurship, business environment, management, marketing, finance and business planning.'},
      {name:'Computer Applications',level:'A-Level',lesson:'Digital productivity and information management',progress:0,icon:'⌘',tone:'#e7f0ff',description:'Office applications, spreadsheets, presentations, data management, internet and digital communication.'}
    ];
    extras.forEach(item=>{if(!uniqueSubjects.some(s=>s.level===item.level&&s.name===item.name))uniqueSubjects.push(item);});
    renderSubjects();
  }
  const theme=document.querySelector('#themeToggle');
  function applyTheme(mode){document.body.classList.toggle('dark',mode==='dark');localStorage.setItem('vanes-theme',mode);if(theme){const label=theme.querySelector('span');if(label)label.textContent=mode==='dark'?'Light mode':'Dark mode';theme.firstChild.textContent=mode==='dark'?'☀ ':'☾ ';}}
  applyTheme(localStorage.getItem('vanes-theme')==='dark'?'dark':'light');
  if(theme&&!theme.dataset.vanesBound){theme.dataset.vanesBound='1';theme.addEventListener('click',e=>{e.preventDefault();applyTheme(document.body.classList.contains('dark')?'light':'dark');});}
})();
