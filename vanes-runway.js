/* VANES AI — Creative Studio launcher and Runway video UI. */
(function () {
  'use strict';

  var API = '/api/video';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function styles() {
    if (document.getElementById('vanes-runway-styles')) return;
    var s = document.createElement('style');
    s.id = 'vanes-runway-styles';
    s.textContent =
      '.vanes-runway-btn{border:1px solid #9b8cff!important;background:linear-gradient(135deg,#5b5cf6,#c03cff)!important;color:#fff!important;border-radius:10px;padding:8px 11px;font:700 11px inherit;cursor:pointer}' +
      '.vanes-runway-modal{position:fixed;inset:0;z-index:99999;background:rgba(2,6,14,.82);backdrop-filter:blur(8px);display:none;place-items:center;padding:18px}' +
      '.vanes-runway-modal.open{display:grid}' +
      '.vanes-runway-card{width:min(620px,100%);max-height:94vh;overflow:auto;background:#081321;border:1px solid #31537a;border-radius:18px;padding:22px;box-shadow:0 25px 90px rgba(0,0,0,.6)}' +
      '.vanes-runway-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.vanes-runway-head h2{margin:0;color:#f5f8ff;font-size:21px}' +
      '.vanes-runway-close{border:0;background:#182333;color:#cbd8e7;border-radius:9px;padding:7px 10px;cursor:pointer}' +
      '.vanes-runway-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}.vanes-runway-tabs button{border:1px solid #29415e;background:#0e1a2a;color:#b9cbe0;border-radius:9px;padding:10px;cursor:pointer;font-weight:700}.vanes-runway-tabs button.active{background:linear-gradient(135deg,#1c67ff,#8b4dff);color:#fff}' +
      '.vanes-runway-card label{display:block;color:#b9cbe0;font-size:11px;font-weight:800;margin:12px 0}.vanes-runway-card textarea,.vanes-runway-card select{box-sizing:border-box;width:100%;margin-top:7px;background:#081423!important;color:#eef7ff!important;border:1px solid #294b6d!important;border-radius:10px;padding:11px;font:400 13px inherit}' +
      '.vanes-runway-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.vanes-runway-start{width:100%;margin-top:15px;border:1px solid #00dfff;background:linear-gradient(135deg,#126cff,#9a35ff);color:#fff;border-radius:11px;padding:12px;font-weight:800;cursor:pointer}.vanes-runway-start:disabled{opacity:.55;cursor:wait}' +
      '.vanes-runway-note{font-size:10px;color:#8098af;line-height:1.5}.vanes-runway-status{margin-top:15px;padding:12px;border:1px solid #29415e;border-radius:11px;background:#081321;color:#cfe0ef;font-size:12px}.vanes-runway-video{width:100%;margin-top:12px;border-radius:12px;background:#000}';
    document.head.appendChild(s);
  }

  function ensureButton() {
    var button = document.getElementById('vanes-runway-open');
    if (button) return button;
    button = document.createElement('button');
    button.id = 'vanes-runway-open';
    button.type = 'button';
    button.className = 'vanes-runway-btn';
    button.textContent = '✦ Runway Create';
    var panel = document.querySelector('#coach .chat-panel');
    var tools = panel && panel.querySelector('.vanes-chat-tools');
    var status = tools && tools.querySelector('#vanes-status');
    if (tools) tools.insertBefore(button, status || null);
    else {
      button.style.position = 'fixed';
      button.style.right = '18px';
      button.style.bottom = '18px';
      button.style.zIndex = '9990';
      document.body.appendChild(button);
    }
    return button;
  }

  function ensureModal() {
    var existing = document.getElementById('vanes-runway-modal');
    if (existing) return existing;

    var modal = document.createElement('div');
    modal.id = 'vanes-runway-modal';
    modal.className = 'vanes-runway-modal';
    modal.innerHTML =
      '<div class="vanes-runway-card">' +
        '<div class="vanes-runway-head"><h2>✦ VANES Creative Studio</h2><button type="button" class="vanes-runway-close">Close</button></div>' +
        '<p class="vanes-runway-note">Create educational motion visuals and study animations with Runway.</p>' +
        '<div class="vanes-runway-tabs"><button type="button" data-mode="text" class="active">Lesson → Video</button><button type="button" data-mode="image">Image → Video</button><button type="button" data-mode="effect">Study Effect</button></div>' +
        '<label>Describe what you want<textarea id="vanes-runway-prompt" rows="5" placeholder="Example: Show the water cycle clearly for a secondary-school learner."></textarea></label>' +
        '<div class="vanes-runway-row"><label>Duration<select id="vanes-runway-duration"><option value="5">5 seconds</option><option value="10">10 seconds</option></select></label><label>Format<select id="vanes-runway-ratio"><option value="1280:720">Landscape 16:9</option><option value="720:1280">Portrait 9:16</option><option value="960:960">Square</option><option value="1104:832">Landscape 4:3</option><option value="832:1104">Portrait 3:4</option></select></label></div>' +
        '<button type="button" class="vanes-runway-start" id="vanes-runway-start">Create with Runway ✦</button>' +
        '<div class="vanes-runway-status" id="vanes-runway-status">Ready.</div>' +
      '</div>';

    document.body.appendChild(modal);

    var close = modal.querySelector('.vanes-runway-close');
    var start = modal.querySelector('#vanes-runway-start');
    var mode = 'text';

    close.onclick = function () { modal.classList.remove('open'); };
    modal.onclick = function (event) { if (event.target === modal) modal.classList.remove('open'); };

    modal.querySelectorAll('[data-mode]').forEach(function (tab) {
      tab.onclick = function () {
        mode = tab.getAttribute('data-mode');
        modal.querySelectorAll('[data-mode]').forEach(function (x) {
          x.classList.toggle('active', x === tab);
        });
      };
    });

    start.onclick = async function () {
      var prompt = modal.querySelector('#vanes-runway-prompt').value.trim();
      var status = modal.querySelector('#vanes-runway-status');
      if (!prompt) { status.textContent = 'Describe the video first.'; return; }

      var image = window.VANES_PENDING_IMAGE || null;
      if (mode === 'image' && !image) {
        status.textContent = 'Attach an image in VANES chat first.';
        return;
      }

      start.disabled = true;
      status.innerHTML = '<b>Connecting to Runway…</b><br><small>Submitting your educational video request.</small>';

      try {
        var response = await fetch(API, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            prompt: 'VANES AI educational visual for a Tanzanian secondary-school learner. Preserve factual meaning and make the visual clear and classroom useful. User request: ' + prompt,
            image: mode === 'image' ? image : null,
            duration: Number(modal.querySelector('#vanes-runway-duration').value),
            ratio: modal.querySelector('#vanes-runway-ratio').value
          })
        });
        var data = await response.json().catch(function () { return {}; });
        if (!response.ok || !data.taskId) throw new Error(data.error || 'Runway could not start the video.');

        for (var i = 0; i < 45; i++) {
          await new Promise(function (resolve) { setTimeout(resolve, 4000); });
          var poll = await fetch(API + '?task=' + encodeURIComponent(data.taskId));
          var task = await poll.json().catch(function () { return {}; });
          status.innerHTML = '<b>Runway is rendering…</b><br><small>' + esc(task.status || 'PROCESSING') + '</small>';
          if (task.status === 'SUCCEEDED') {
            var outputs = Array.isArray(task.output) ? task.output : (Array.isArray(task.outputs) ? task.outputs : []);
            if (!outputs.length) throw new Error('Runway finished but returned no video URL.');
            status.innerHTML = '<b>Video created ✦</b><video class="vanes-runway-video" controls playsinline src="' + esc(outputs[0]) + '"></video>';
            window.dispatchEvent(new CustomEvent('vanes:runway-result', {detail:{url:outputs[0],prompt:prompt}}));
            return;
          }
          if (task.status === 'FAILED' || task.status === 'CANCELLED') throw new Error(task.failure || 'Runway stopped the render.');
        }
        throw new Error('Runway is taking longer than expected. Check again shortly.');
      } catch (error) {
        status.innerHTML = '<b>Runway could not create the video.</b><br><small>' + esc(error.message || 'Generation failed.') + '</small>';
      } finally {
        start.disabled = false;
      }
    };

    return modal;
  }

  function open(prompt) {
    styles();
    ensureButton();
    var modal = ensureModal();
    var input = modal.querySelector('#vanes-runway-prompt');
    if (prompt && input) input.value = prompt;
    modal.classList.add('open');
    window.VANES_RUNWAY_READY = true;
  }

  window.VANES_RUNWAY_ENDPOINT = API;
  window.VANES_OPEN_RUNWAY = open;

  function boot() {
    styles();
    ensureButton();
    ensureModal();
    window.VANES_RUNWAY_READY = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();