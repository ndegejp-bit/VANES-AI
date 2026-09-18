/* VANES AI — stable chat UI and conversation engine. */
(function () {
  'use strict';

  function boot() {
    const panel = document.querySelector('#coach .chat-panel');
    const messages = document.querySelector('#messages');
    const form = document.querySelector('#chatForm');
    const input = document.querySelector('#chatInput');

    if (!panel || !messages || !form || !input) return;
    if (panel.dataset.vanesChatBooted === '1') return;
    panel.dataset.vanesChatBooted = '1';

    const KEY = 'vanes-chat-conversations-v1';
    const ACTIVE = 'vanes-chat-active-v1';
    const CHAT_API = window.VANES_CHAT_ENDPOINT || '/api/chat';
    const IMAGE_API = window.VANES_IMAGE_ENDPOINT || '/api/image';
    const RUNWAY_API = window.VANES_RUNWAY_ENDPOINT || '/api/video';

    let chats = read(KEY, []);
    let active = localStorage.getItem(ACTIVE) || '';
    let busy = false;
    let aborter = null;

    function read(key, fallback) {
      try {
        const value = JSON.parse(localStorage.getItem(key));
        return value || fallback;
      } catch (_) {
        return fallback;
      }
    }

    function save() {
      localStorage.setItem(KEY, JSON.stringify(chats.slice(0, 30)));
    }

    function makeId() {
      return 'chat-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    }

    function current() {
      return chats.find(function (chat) { return chat.id === active; });
    }

    function esc(value) {
      return String(value ?? '').replace(/[&<>"']/g, function (char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
      });
    }

    function md(value) {
      let text = esc(value);
      text = text.replace(/^### (.*)$/gm, '<h4>$1</h4>');
      text = text.replace(/^## (.*)$/gm, '<h3>$1</h3>');
      text = text.replace(/^# (.*)$/gm, '<h2>$1</h2>');
      text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/\n/g, '<br>');
      return text;
    }

    function toast(message) {
      if (window.showToast) window.showToast(message);
    }

    function ensure() {
      if (!current()) {
        active = makeId();
        chats.unshift({ id: active, title: 'New chat', messages: [] });
        localStorage.setItem(ACTIVE, active);
        save();
      }
    }

    function renderTools() {
      let tools = panel.querySelector('.vanes-chat-tools');

      if (!tools) {
        tools = document.createElement('div');
        tools.className = 'vanes-chat-tools';
        tools.innerHTML =
          '<div class="vanes-chat-title"><strong>VANES AI</strong><span id="vanes-status">Ready</span></div>' +
          '<div class="vanes-chat-actions">' +
          '<button type="button" class="primary" id="vanes-new-chat">＋ New chat</button>' +
          '<button type="button" id="vanes-history-toggle">☰ History</button>' +
          '<button type="button" id="vanes-clear-history">Clear</button>' +
          '</div>';
        panel.insertBefore(tools, messages);
      }

      let history = panel.querySelector('#vanes-chat-history');

      if (!history) {
        history = document.createElement('div');
        history.id = 'vanes-chat-history';
        history.className = 'vanes-chat-history';
        panel.insertBefore(history, messages);
      }

      tools.querySelector('#vanes-new-chat').onclick = function () {
        active = makeId();
        chats.unshift({ id: active, title: 'New chat', messages: [] });
        localStorage.setItem(ACTIVE, active);
        save();
        render();
      };

      tools.querySelector('#vanes-history-toggle').onclick = function () {
        history.classList.toggle('open');
        renderHistory();
      };

      tools.querySelector('#vanes-clear-history').onclick = function () {
        if (!confirm('Delete all saved VANES chats from this browser?')) return;
        chats = [];
        active = '';
        localStorage.removeItem(ACTIVE);
        ensure();
        save();
        render();
      };

      renderHistory();
    }

    function renderHistory() {
      const history = panel.querySelector('#vanes-chat-history');
      if (!history) return;

      history.innerHTML = chats.slice(0, 12).map(function (chat) {
        const count = chat.messages.filter(function (message) {
          return message.role !== 'system';
        }).length;

        return '<button type="button" class="vanes-history-item ' +
          (chat.id === active ? 'active' : '') +
          '" data-chat-id="' + esc(chat.id) + '">' +
          '<strong>' + esc(chat.title || 'New chat') + '</strong>' +
          '<small>' + count + ' messages</small>' +
          '</button>';
      }).join('') || '<p class="vanes-history-empty">No saved chats yet.</p>';

      history.querySelectorAll('[data-chat-id]').forEach(function (button) {
        button.onclick = function () {
          active = button.getAttribute('data-chat-id');
          localStorage.setItem(ACTIVE, active);
          render();
        };
      });
    }

    function imageMarkup(content) {
      const match = String(content || '').match(/^<VANES_IMAGE>([\s\S]+)<\/VANES_IMAGE>$/);
      if (!match) return null;

      return '<div class="vanes-image-label">✦ Image created by VANES AI</div>' +
        '<img class="vanes-generated-image" src="' + esc(match[1]) +
        '" alt="AI-generated educational visual">';
    }

    function videoMarkup(content) {
      const match = String(content || '').match(/^<VANES_VIDEO>([\\s\\S]+)<\\/VANES_VIDEO>$/);
      if (!match) return null;
      return '<div class="vanes-image-label">✦ Video created by Runway</div>' +
        '<video class="vanes-generated-video" controls playsinline preload="metadata" src="' + esc(match[1]) + '"></video>';
    }

    function render() {
      ensure();
      renderTools();
      messages.innerHTML = '';

      const chat = current();

      if (!chat.messages.length) {
        messages.innerHTML =
          '<div class="message coach-message">' +
          '<span>✦</span>' +
          '<div class="vanes-bubble">' +
          '<div class="vanes-content">' +
          '<strong>Hi! I’m VANES AI.</strong><br>' +
          'Ask me anything in English or Kiswahili. I can explain, analyse, practise, mark, plan, summarise, translate and work with study images.' +
          '</div></div></div>';
        return;
      }

      chat.messages.forEach(function (message, index) {
        if (message.role === 'system') return;

        const element = document.createElement('div');
        element.className = 'message ' +
          (message.role === 'user' ? 'user-message' : 'coach-message');

        if (message.role === 'assistant') {
          const image = imageMarkup(message.content);
          const video = videoMarkup(message.content);

          element.innerHTML =
            '<span>✦</span>' +
            '<div class="vanes-bubble">' +
            '<div class="vanes-content">' + (image || video || md(message.content)) + '</div>' +
            '<div class="vanes-actions">' +
            '<button type="button" data-copy="' + index + '">Copy</button>' +
            '<button type="button" data-regenerate="' + index + '">Regenerate</button>' +
            '</div></div>';
        } else {
          element.innerHTML =
            '<div class="vanes-bubble">' +
            '<div class="vanes-content">' + md(message.content) + '</div>' +
            '<div class="vanes-actions">' +
            '<button type="button" data-edit="' + index + '">Edit</button>' +
            '</div></div>';
        }

        messages.appendChild(element);
      });

      messages.querySelectorAll('[data-copy]').forEach(function (button) {
        button.onclick = function () {
          const message = chat.messages[Number(button.dataset.copy)];
          if (!message) return;
          navigator.clipboard?.writeText(message.content);
          toast('Copied');
        };
      });

      messages.querySelectorAll('[data-edit]').forEach(function (button) {
        button.onclick = function () {
          const message = chat.messages[Number(button.dataset.edit)];
          if (!message) return;
          input.value = message.content;
          input.focus();
        };
      });

      messages.querySelectorAll('[data-regenerate]').forEach(function (button) {
        button.onclick = function () {
          regenerate(Number(button.dataset.regenerate));
        };
      });

      messages.scrollTop = messages.scrollHeight;
    }

    function setStatus(text) {
      const status = panel.querySelector('#vanes-status');
      if (status) status.textContent = text;
    }

    function systemPrompt() {
      return [
        'You are VANES AI — Versatile Adaptive Neuro Emergent System — created by OB Technologies / OB Tech-Labs.',
        'You are an adaptive AI study assistant for the Tanzanian secondary-school curriculum.',
        'Detect the subject and O-Level/CSEE or A-Level/ACSEE context from the learner profile and question.',
        'Explain step by step, show working for mathematics and science, mark work transparently, and answer in the learner’s language.',
        'Never invent facts about OB Technologies or syllabus details that you cannot verify.'
      ].join(' ');
    }

    async function send(text, image) {
      ensure();
      const chat = current();

      chat.messages.push({
        role: 'user',
        content: text || 'Please analyse the attached study image.'
      });

      if (chat.title === 'New chat') {
        chat.title = (text || 'Study image').slice(0, 48);
      }

      save();
      render();

      busy = true;
      aborter = new AbortController();
      setStatus('VANES is thinking…');

      const requestMessages = [
        { role: 'system', content: systemPrompt() }
      ].concat(chat.messages.slice(-18).map(function (message) {
        return { role: message.role, content: message.content };
      }));

      if (image) {
        const last = requestMessages[requestMessages.length - 1];
        last.content = [
          { type: 'text', text: text || 'Analyse this study image carefully.' },
          { type: 'image_url', image_url: { url: image } }
        ];
      }

      try {
        const response = await fetch(CHAT_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: window.VANES_CHAT_MODEL || 'openai/gpt-4o-mini',
            messages: requestMessages,
            max_tokens: 600
          }),
          signal: aborter.signal
        });

        if (!response.ok) {
          throw new Error((await response.text()).slice(0, 500) || ('HTTP ' + response.status));
        }

        const assistant = { role: 'assistant', content: '' };
        chat.messages.push(assistant);
        render();

        const reader = response.body && response.body.getReader();

        if (reader) {
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;

            buffer += decoder.decode(chunk.value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            lines.forEach(function (line) {
              if (!line.startsWith('data:')) return;

              const data = line.slice(5).trim();
              if (!data || data === '[DONE]') return;

              try {
                const parsed = JSON.parse(data);
                const piece = parsed.choices?.[0]?.delta?.content || '';
                if (!piece) return;

                assistant.content += piece;
                const lastNode = messages.lastElementChild?.querySelector('.vanes-content');
                if (lastNode) lastNode.innerHTML = md(assistant.content);
                messages.scrollTop = messages.scrollHeight;
              } catch (_) {}
            });
          }
        } else {
          const data = await response.json();
          assistant.content = data.choices?.[0]?.message?.content || data.message || '';
        }

        if (!assistant.content) {
          throw new Error('VANES returned an empty response.');
        }

        save();
        render();
        setStatus('Ready');
      } catch (error) {
        if (error.name !== 'AbortError') {
          chat.messages.push({
            role: 'assistant',
            content: 'I could not reach VANES AI. ' + (error.message || 'Please try again.')
          });
          save();
          render();
          setStatus('Connection error');
        } else {
          save();
          render();
          setStatus('Stopped');
        }
      } finally {
        busy = false;
        aborter = null;
      }
    }

    async function regenerate(index) {
      if (busy) return;

      const chat = current();
      const assistant = chat?.messages[index];
      const user = chat?.messages[index - 1];

      if (!assistant || assistant.role !== 'assistant' || !user || user.role !== 'user') return;

      chat.messages.splice(index, 1);
      save();
      await send(user.content, null);
    }

    function videoIntent(value) {
      return /\b(video|animation|animated|animate|motion|moving|movie|clip|cinematic|film|reel|camera movement|time-lapse|timelapse|vfx)\b/i.test(value);
    }

    function imageIntent(value) {
      return /\b(generate|create|make|draw|render|design|produce|show me)\b.*\b(image|picture|photo|illustration|diagram|drawing|portrait|poster|logo|art)\b/i.test(value) ||
        /\b(image|picture|photo|illustration|diagram|drawing|portrait|poster|logo|art)\b.*\b(generate|create|make|draw|render|design|produce)\b/i.test(value);
    }

    async function generate() {
      const prompt = input.value.trim();

      if (!prompt) {
        input.focus();
        toast('Describe what you want VANES to create.');
        return;
      }

      if (videoIntent(prompt)) {
        input.value = '';
        ensure();
        const chat = current();
        chat.messages.push({role:'user',content:'Create this video with Runway: ' + prompt});
        if (chat.title === 'New chat') chat.title = prompt.slice(0,48);
        save(); render(); setStatus('Opening Creative Studio…');
        const openStudio = function(){
          const button=document.querySelector('#vanes-runway-open');
          if(!button){ setStatus('Creative Studio unavailable'); toast('Creative Studio could not load.'); return; }
          button.click();
          const runwayInput=document.querySelector('#vanes-runway-prompt');
          if(runwayInput) runwayInput.value=prompt;
          setStatus('Runway ready — create your video.');
        };
        if(document.querySelector('#vanes-runway-open')) openStudio();
        else { let n=0; const wait=setInterval(function(){ n++; if(document.querySelector('#vanes-runway-open')){clearInterval(wait);openStudio();} else if(n>=20){clearInterval(wait);openStudio();}},250); }
        return;
      }

      ensure();
      const chat = current();

      chat.messages.push({
        role: 'user',
        content: 'Create this educational visual: ' + prompt
      });

      if (chat.title === 'New chat') chat.title = prompt.slice(0, 48);

      save();
      render();
      input.value = '';
      setStatus('Creating image…');

      try {
        const response = await fetch(IMAGE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt })
        });

        const data = await response.json().catch(function () { return {}; });

        if (!response.ok || !data.ok || !Array.isArray(data.images) || !data.images.length) {
          throw new Error(data.error || 'The image service returned no image.');
        }

        chat.messages.push({
          role: 'assistant',
          content: '<VANES_IMAGE>' + data.images[0] + '</VANES_IMAGE>'
        });

        save();
        render();
        toast('Image created.');
      } catch (error) {
        chat.messages.push({
          role: 'assistant',
          content: 'I could not create that image. ' + (error.message || 'Please try again.')
        });
        save();
        render();
      } finally {
        setStatus('Ready');
      }
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (busy) return;

      const text = input.value.trim();
      const image = window.VANES_PENDING_IMAGE || null;

      if (!text && !image) return;

      if (!image && imageIntent(text)) {
        input.value = '';
        generate();
        return;
      }

      input.value = '';
      window.VANES_PENDING_IMAGE = null;

      const preview = document.querySelector('#imagePreview');

      if (preview) {
        preview.hidden = true;
        preview.innerHTML = '';
      }

      send(text, image);
    });

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    const upload = document.querySelector('#uploadButton');

    if (upload) {
      let fileInput = document.querySelector('#imageInput');

      if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'imageInput';
        fileInput.accept = 'image/*';
        fileInput.hidden = true;
        document.body.appendChild(fileInput);
      }

      upload.onclick = function (event) {
        event.preventDefault();
        fileInput.click();
      };

      fileInput.onchange = function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;

        if (file.size > 8 * 1024 * 1024) {
          toast('Choose an image smaller than 8 MB.');
          return;
        }

        const reader = new FileReader();

        reader.onload = function () {
          window.VANES_PENDING_IMAGE = reader.result;

          const preview = document.querySelector('#imagePreview');

          if (preview) {
            preview.hidden = false;
            preview.innerHTML =
              '<img src="' + esc(reader.result) +
              '" alt="Study image preview">' +
              '<span>Image attached — send a question or instruction.</span>';
          }
        };

        reader.readAsDataURL(file);
      };
    }

    const generateButton = document.querySelector('#generateButton');

    if (generateButton) {
      generateButton.onclick = function (event) {
        event.preventDefault();
        if (!busy) generate();
      };
    }

    let stop = document.querySelector('#vanes-stop');

    if (!stop) {
      stop = document.createElement('button');
      stop.type = 'button';
      stop.id = 'vanes-stop';
      stop.className = 'vanes-stop';
      stop.textContent = '■';
      stop.title = 'Stop response';
      stop.setAttribute('aria-label', 'Stop response');
      stop.hidden = true;
      form.insertBefore(stop, form.lastElementChild);
    }

    stop.onclick = function () {
      if (aborter) aborter.abort();
    };

    const observer = new MutationObserver(function () {
      stop.hidden = !busy;
    });

    observer.observe(stop, { attributes: true });

    window.addEventListener('vanes:runway-result', function(event){
      const url=event.detail?.url;
      if(!url) return;
      ensure();
      const chat=current();
      chat.messages.push({role:'assistant',content:'<VANES_VIDEO>'+url+'</VANES_VIDEO>'});
      save(); render(); setStatus('Ready'); toast('Runway video added to the chat.');
      window.VANES_PENDING_IMAGE=null;
    });

    ensure();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();