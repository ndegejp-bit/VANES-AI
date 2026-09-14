/* VANES AI runtime: single stable UI layer for the Cloudflare Worker deployment. */
(function () {
  "use strict";

  const subjects = [
    ["Kiswahili","O-Level","Sarufi na matumizi ya lugha"],["English Language","O-Level","Comprehension and communication"],["Basic Mathematics","O-Level","Algebra and problem solving"],["Basic Applied Mathematics","O-Level","Applied mathematical problems"],["Advanced Mathematics","A-Level","Calculus and functions"],
    ["History","O-Level","Tanzania and world history"],["Geography","O-Level","Physical and human geography"],["Chemistry","O-Level","Atoms, bonding and reactions"],["Physics","O-Level","Mechanics and energy"],["Biology","O-Level","Cells and life processes"],["Civics","O-Level","Citizenship and government"],["Information and Computer Studies","O-Level","Computer systems and information"],["Commerce","O-Level","Trade and business"],["Bookkeeping","O-Level","Double-entry bookkeeping"],["Agriculture","O-Level","Crop and livestock production"],["Food and Nutrition","O-Level","Nutrition and food preparation"],["Fine Art","O-Level","Drawing and visual expression"],["Music","O-Level","Theory and performance"],["French","O-Level","Communication en français"],["Arabic","O-Level","Arabic language and communication"],["Bible Knowledge","O-Level","Biblical studies"],["Islamic Knowledge","O-Level","Qur'an, Hadith and Islamic studies"],["Physical Education","O-Level","Health, fitness and sport"],
    ["Economics","O-Level","Economic principles"],["History","A-Level","Advanced historical analysis"],["Geography","A-Level","Advanced physical and human geography"],["Physics","A-Level","Mechanics, electricity and waves"],["Chemistry","A-Level","Physical, inorganic and organic chemistry"],["Biology","A-Level","Advanced biological processes"],["Economics","A-Level","Microeconomics and macroeconomics"],["General Studies","A-Level","Critical thinking and current issues"],["Computer Science","A-Level","Algorithms and programming"],["Accountancy","A-Level","Financial accounting"],["Commerce","A-Level","Business and commercial systems"],["Business Studies","O-Level","Entrepreneurship and business"],["Business Studies","A-Level","Management, marketing and finance"],["Computer Applications","O-Level","Office applications and data management"],["Computer Applications","A-Level","Advanced digital productivity and information management"]
  ].map(([name,level,lesson]) => ({name,level,lesson,progress:0,description:`${lesson}. Study with step-by-step explanations, practice and revision support.`}));

  const topics = {
    "Kiswahili":["Sarufi","Fasihi simulizi","Fasihi andishi","Ufahamu","Uandishi","Mawasiliano","Msamiati","Matumizi ya lugha"],
    "English Language":["Grammar","Comprehension","Vocabulary","Writing","Oral communication","Literature","Summary writing","Functional writing"],
    "Basic Mathematics":["Numbers","Algebra","Equations","Geometry","Mensuration","Trigonometry","Statistics","Probability","Sets","Relations and functions","Sequences","Vectors","Coordinate geometry","Financial mathematics"],
    "Basic Applied Mathematics":["Commercial arithmetic","Ratio and proportion","Percentages","Rates","Graphs","Statistics","Measurement","Financial mathematics","Matrices","Linear programming","Applications of algebra"],
    "Advanced Mathematics":["Algebra","Functions","Polynomials","Sequences and series","Trigonometry","Coordinate geometry","Vectors","Matrices","Differentiation","Integration","Differential equations","Probability","Statistics","Numerical methods"],
    "History":["Pre-colonial African societies","Slave trade","Colonialism","Nationalism","African independence","Tanzania and Tanganyika","World Wars","Cold War","Post-independence Africa","Political and economic change"],
    "Geography":["Map reading","Earth and solar system","Weather and climate","Geomorphology","Soils","Vegetation","Water resources","Population","Settlement","Agriculture","Industry","Transport","Tourism","Environment","Fieldwork","Development"],
    "Chemistry":["Matter","Atomic structure","Periodic table","Chemical bonding","Formulae and equations","Mole concept","Chemical reactions","Acids, bases and salts","Organic chemistry","Metals","Rates of reaction","Energy changes","Electrochemistry","Qualitative analysis","Laboratory techniques"],
    "Physics":["Measurement","Mechanics","Motion","Forces","Work, energy and power","Pressure","Heat","Waves","Light","Sound","Electricity","Magnetism","Electromagnetism","Atomic physics","Electronics","Practical physics"],
    "Biology":["Cells","Nutrition","Transport","Respiration","Excretion","Coordination","Reproduction","Genetics","Evolution","Ecology","Microorganisms","Health and diseases","Classification","Practical biology"],
    "Civics":["Citizenship","Democracy","Human rights","Government","Constitution","Rule of law","Good governance","National identity","Gender","Culture","Globalisation","Environment","Economic development"],
    "Economics":["Basic economic concepts","Demand and supply","Elasticity","Production","Market structures","National income","Money and banking","Inflation","Unemployment","Public finance","International trade","Economic development","Tanzania's economy"],
    "Commerce":["Trade","Business units","Entrepreneurship","Banking","Insurance","Warehousing","Transport","Communication","Marketing","Consumer protection"],
    "Bookkeeping":["Accounting concepts","Source documents","Double entry","Journals","Ledgers","Cash book","Trial balance","Bank reconciliation","Depreciation","Errors","Final accounts"],
    "Agriculture":["Soils","Crop production","Crop pests and diseases","Livestock production","Animal nutrition","Farm tools","Farm management","Agricultural economics","Irrigation","Sustainable agriculture"],
    "Computer Science":["Algorithms","Programming","Data structures","Databases","Computer architecture","Operating systems","Networks","Cybersecurity","Software engineering","Web technology"],
    "Accountancy":["Accounting principles","Books of original entry","Ledgers","Trial balance","Final accounts","Partnership","Company accounts","Cost accounting","Financial analysis","Budgeting","Auditing"],
    "Business Studies":["Entrepreneurship","Business environment","Management","Marketing","Finance","Human resources","Production","Trade","Business law","Business planning"],
    "Computer Applications":["Office applications","Data management","Presentations","Spreadsheets","Word processing","Internet","Digital communication","Information management"]
  };

  const esc = value => String(value).replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const keyOf = s => `${s.level}:${s.name}`;
  const byKey = key => subjects.find(s => keyOf(s) === key) || subjects[0];

  window.showToast = window.showToast || function (message) {
    const el = document.querySelector("#toast");
    if (!el) return;
    el.textContent = message; el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2400);
  };

  function switchView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === id));
    document.querySelectorAll(".nav-link").forEach(n => n.classList.toggle("active", n.dataset.view === id));
    document.querySelector(".sidebar")?.classList.remove("open");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  window.VANES_SWITCH_VIEW = switchView;

  function renderSubjects(filter = "all") {
    const grid = document.querySelector("#subjectGrid");
    if (!grid) return;
    const visible = filter === "all" ? subjects : subjects.filter(s => s.level === filter);
    grid.innerHTML = visible.map(s => `<article class="panel subject-card" data-runtime-subject="${esc(keyOf(s))}"><div class="subject-top"><span class="subject-icon">✦</span><span class="pill">${esc(s.level)}</span></div><h2>${esc(s.name)}</h2><p>${esc(s.lesson)}</p><div class="subject-progress"><div><span style="width:${s.progress}%"></span></div>${s.progress}%</div></article>`).join("");
    grid.querySelectorAll("[data-runtime-subject]").forEach(el => el.addEventListener("click", () => openSubject(el.dataset.runtimeSubject)));
  }

  function renderDashboardSubjects() {
    const box = document.querySelector("#dashboardSubjects"); if (!box) return;
    box.innerHTML = subjects.slice(0, 8).map(s => `<article class="topic" data-runtime-subject="${esc(keyOf(s))"><span class="topic-icon">✦</span><div><strong>${esc(s.name)}</strong><p>${esc(s.level)} · ${esc(s.lesson)}</p></div><span class="topic-arrow">→</span></article>`).join("");
    box.querySelectorAll("[data-runtime-subject]").forEach(el => el.addEventListener("click", () => openSubject(el.dataset.runtimeSubject)));
  }

  function openSubject(key) {
    const s = byKey(key);
    document.querySelector("#workspaceLabel").textContent = `${s.name.toUpperCase()} · ${s.level} · ${s.progress}% COMPLETE`;
    document.querySelector("#workspaceTitle").textContent = s.name;
    document.querySelector("#workspaceDescription").textContent = s.description;
    document.querySelector("#sessionTitle").textContent = s.lesson;
    const map = document.querySelector("#topicMap");
    if (map) map.innerHTML = (topics[s.name] || [s.lesson]).map(t => `<button type="button" class="topic-chip">${esc(t)}</button>`).join("");
    document.querySelector("#sessionSteps").innerHTML = ["Recall the key idea (10 min)","Work through a guided example (15 min)","Try two practice questions (15 min)","Write a one-sentence takeaway (5 min)"].map(x => `<li>${x}</li>`).join("");
    const notes = document.querySelector("#notes"); if (notes) notes.value = localStorage.getItem(`vanes-notes-${key}`) || "";
    switchView("workspace");
  }

  function initNavigation() {
    document.querySelectorAll("[data-view]").forEach(el => el.addEventListener("click", e => { e.preventDefault(); switchView(el.dataset.view); }));
    document.querySelectorAll("[data-view-target]").forEach(el => el.addEventListener("click", () => switchView(el.dataset.viewTarget)));
    document.querySelector("#mobileMenu")?.addEventListener("click", () => document.querySelector(".sidebar")?.classList.toggle("open"));
    document.querySelectorAll(".filter-button").forEach(btn => btn.addEventListener("click", () => { document.querySelectorAll(".filter-button").forEach(b => b.classList.toggle("active", b === btn)); renderSubjects(btn.dataset.filter); }));
    document.querySelector("#changeName")?.addEventListener("click", () => { const m=document.querySelector("#nameModal"); m?.classList.add("show"); m?.setAttribute("aria-hidden","false"); });
    document.querySelector("#nameForm")?.addEventListener("submit", e => { e.preventDefault(); const name=document.querySelector("#nameInput")?.value.trim(); if(!name)return; localStorage.setItem("vanes-user-name",name); document.querySelector("#profileName").textContent=name; document.querySelector("#profileAvatar").textContent=name.charAt(0).toUpperCase(); document.querySelector("#welcomeTitle").textContent=`Make today count, ${name}.`; const m=document.querySelector("#nameModal");m?.classList.remove("show");m?.setAttribute("aria-hidden","true"); });
    const saved=localStorage.getItem("vanes-user-name"); if(saved){document.querySelector("#profileName").textContent=saved;document.querySelector("#profileAvatar").textContent=saved.charAt(0).toUpperCase();document.querySelector("#welcomeTitle").textContent=`Make today count, ${saved}.`;document.querySelector("#nameModal")?.classList.remove("show");} else {document.querySelector("#nameModal")?.classList.add("show");}
  }

  function initPlanner() {
    document.querySelector("#planForm")?.addEventListener("submit", e => {
      e.preventDefault(); const data=new FormData(e.currentTarget); const subject=String(data.get("subject")||"Study"); const time=Number(data.get("time")||45); const goal=String(data.get("goal")||"Learn");
      const warm=Math.max(5,Math.round(time*.2)), deep=Math.max(10,Math.round(time*.5)), review=Math.max(5,time-warm-deep);
      const result=document.querySelector("#planResult"); if(!result)return;
      result.classList.add("generated"); result.innerHTML=`<p class="eyebrow">${time}-MINUTE FOCUS SESSION</p><h2>${esc(subject)}</h2><p>Goal: ${esc(goal.toLowerCase())}.</p><ul><li><strong>${warm} min — Recall:</strong> list what you already know.</li><li><strong>${deep} min — Deep work:</strong> learn and practise the core idea.</li><li><strong>${review} min — Review:</strong> summarise without looking at your notes.</li></ul><button class="primary-button" id="startPlan">Start this session →</button>`;
      document.querySelector("#startPlan")?.addEventListener("click",()=>{const match=subjects.find(s=>s.name.toLowerCase()===subject.toLowerCase());if(match)openSubject(keyOf(match));else switchView("coach");});
    });
  }

  function initNotes() {
    const notes=document.querySelector("#notes"), status=document.querySelector("#saveStatus");
    notes?.addEventListener("input",()=>{localStorage.setItem("vanes-notes-current",notes.value);if(status)status.textContent="Saved locally";});
    document.querySelector("#clearNotes")?.addEventListener("click",()=>{if(notes){notes.value="";localStorage.removeItem("vanes-notes-current");}if(status)status.textContent="Notes cleared";});
  }

  function initTheme() {
    const btn=document.querySelector("#themeToggle"); const apply=mode=>{document.body.classList.toggle("dark",mode==="dark");localStorage.setItem("vanes-theme",mode);if(btn){const label=btn.querySelector("span");if(label)label.textContent=mode==="dark"?"Light mode":"Dark mode";}};
    apply(localStorage.getItem("vanes-theme")==="dark"?"dark":"light"); btn?.addEventListener("click",()=>apply(document.body.classList.contains("dark")?"light":"dark"));
  }

  function boot() {
    renderSubjects(); renderDashboardSubjects(); initNavigation(); initPlanner(); initNotes(); initTheme();
    document.querySelectorAll("[data-prompt]").forEach(btn=>btn.addEventListener("click",()=>{const input=document.querySelector("#chatInput"); if(input){input.value=btn.dataset.prompt;input.focus();}}));
    const sendCoach=()=>switchView("coach"); document.querySelectorAll("[data-view-target='coach']").forEach(x=>x.addEventListener("click",sendCoach));
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
