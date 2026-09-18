/* VANES responsive mobile navigation and layout helper. */
(function(){
  'use strict';
  function boot(){
    const sidebar=document.querySelector('.sidebar');
    const menu=document.querySelector('#mobileMenu');
    if(!sidebar||!menu||window.__vanesMobileReady)return;
    window.__vanesMobileReady=true;
    let backdrop=document.querySelector('.vanes-sidebar-backdrop');
    if(!backdrop){
      backdrop=document.createElement('button');
      backdrop.type='button';
      backdrop.className='vanes-sidebar-backdrop';
      backdrop.setAttribute('aria-label','Close navigation');
      document.body.appendChild(backdrop);
    }
    const close=()=>{sidebar.classList.remove('open');document.body.classList.remove('vanes-nav-open');menu.setAttribute('aria-expanded','false')};
    const open=()=>{sidebar.classList.add('open');document.body.classList.add('vanes-nav-open');menu.setAttribute('aria-expanded','true')};
    menu.setAttribute('aria-expanded','false');
    menu.addEventListener('click',()=>sidebar.classList.contains('open')?close():open());
    backdrop.addEventListener('click',close);
    sidebar.querySelectorAll('.nav-link').forEach(link=>link.addEventListener('click',close));
    window.addEventListener('resize',()=>{if(window.innerWidth>760)close()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();