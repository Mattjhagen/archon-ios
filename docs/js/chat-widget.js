/* ============================================
   Chat Widget — Floating AI assistant
   Tabs: Chat | Memory
   Features: credit tracking, model handoff, context memory
   ============================================ */
(function() {
  var STORAGE_KEY = 'archon-chat-widget';
  var MODELS = [
    { id: 'gpt4o', name: 'GPT-4o', provider: 'OpenAI', creditsPerReq: 10 },
    { id: 'claude', name: 'Claude 3.5', provider: 'Anthropic', creditsPerReq: 8 },
    { id: 'gemini', name: 'Gemini 1.5', provider: 'Google', creditsPerReq: 5 },
    { id: 'ollama', name: 'Ollama (Local)', provider: 'Local', creditsPerReq: 0 }
  ];

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      credits: 200,
      currentModel: 0,
      messages: [],
      memory: [],
      activeTab: 'chat'
    };
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function getModel(state) { return MODELS[state.currentModel]; }

  function handoff(state) {
    var start = state.currentModel;
    while (state.credits < MODELS[state.currentModel].creditsPerReq) {
      state.currentModel = (state.currentModel + 1) % MODELS.length;
      if (state.currentModel === start) break;
    }
    return state.currentModel !== start;
  }

  function getResponse(userMsg, state) {
    var msg = userMsg.toLowerCase();
    var model = getModel(state);
    var cost = model.creditsPerReq;
    if (model.id !== 'ollama') {
      state.credits = Math.max(0, state.credits - cost);
    }
    state.messages.push({ role: 'user', text: userMsg });

    var reply = '';
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
      reply = "Hey! I'm the Archon AI assistant. I can help you build iOS apps, explain coding concepts, or answer questions about Archon. What would you like to do?";
    } else if (msg.includes('what is archon') || msg.includes('about archon')) {
      reply = "Archon is an iOS app that lets you build apps by describing them in chat. You describe what you want, the AI generates real SwiftUI code, and you can preview it live — no coding experience needed.";
    } else if (msg.includes('how') && msg.includes('work')) {
      reply = "Archon uses AI models to generate code from your descriptions. Just type what you want in chat — like \"build a weather app\" — and the AI agent creates the project step by step. You can watch it work, retry steps, or change direction anytime.";
    } else if (msg.includes('model') || msg.includes('gpt') || msg.includes('claude') || msg.includes('gemini')) {
      reply = "Archon supports GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, and local Ollama models. You can switch between them in Settings → AI Provider. When credits run low for one model, Archon automatically hands off to the next.";
    } else if (msg.includes('credit') || msg.includes('pricing') || msg.includes('cost')) {
      reply = "Credits are consumed per AI request based on the model. GPT-4o costs ~10 credits, Claude ~8, Gemini ~5, and Ollama is free. You can monitor usage in Settings → Usage. If credits run out, Archon auto-switches to available models.";
    } else if (msg.includes('learn') || msg.includes('tutorial') || msg.includes('teach')) {
      reply = "Check out the Learning Center! We have interactive lessons for HTML, CSS, TypeScript, Python, Swift, and Java — each with live code editors, quizzes, and progress tracking. Go to relayapp.pro/learn/";
    } else if (msg.includes('swift') || msg.includes('ios')) {
      reply = "Swift is the primary language for iOS development. Archon generates SwiftUI views, Combine pipelines, and async/await code. Check out the Swift lessons in the Learning Center to get started!";
    } else if (msg.includes('help')) {
      reply = "I can help with:\n• Building apps with Archon\n• Coding questions (Swift, HTML, CSS, etc.)\n• Explaining how Archon features work\n• Model and credit information\nJust ask!";
    } else if (msg.includes('thank')) {
      reply = "You're welcome! Let me know if you need anything else.";
    } else {
      var replies = [
        "That's a great question! In Archon, you can describe exactly what you want and the AI will generate it. Could you tell me more about what you're trying to build?",
        "Interesting! Let me help with that. The AI Builder in Archon can handle most app ideas — just describe what you need in plain English.",
        "Good question. The best way to start is by describing your app idea in the Archon chat. The AI will break it into tasks and generate the code step by step.",
        "I'd suggest trying that in the Archon AI Builder — describe what you want, and it'll generate a working project you can preview and edit in real-time."
      ];
      reply = replies[Math.floor(Math.random() * replies.length)];
    }

    state.messages.push({ role: 'assistant', text: reply });

    // Auto-add to memory
    var topic = userMsg.length > 40 ? userMsg.substring(0, 40) + '...' : userMsg;
    state.memory.push({ q: topic, a: reply.substring(0, 60) + '...', time: new Date().toLocaleTimeString() });
    if (state.memory.length > 20) state.memory.shift();

    // Check handoff
    var didHandoff = false;
    if (state.credits <= 0 && state.currentModel < MODELS.length - 1) {
      didHandoff = handoff(state);
    }

    saveState(state);
    return { text: reply, handoff: didHandoff, model: getModel(state) };
  }

  function buildUI() {
    var mount = document.getElementById('chat-bubble-mount');
    if (!mount) return;
    var state = loadState();

    // Bubble
    var bubble = document.createElement('button');
    bubble.className = 'chat-bubble';
    bubble.setAttribute('aria-label', 'Open AI chat');
    bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>';
    mount.appendChild(bubble);

    // Panel
    var panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.innerHTML =
      '<div class="chat-header">' +
        '<span class="chat-header-title">Archon AI</span>' +
        '<span class="chat-header-credits" id="chat-credits">' + state.credits + ' credits</span>' +
        '<select class="chat-model-select" id="chat-model">' +
          MODELS.map(function(m, i) {
            return '<option value="' + i + '"' + (i === state.currentModel ? ' selected' : '') + '>' + m.name + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<div class="chat-tabs">' +
        '<button class="chat-tab active" data-tab="chat">Chat</button>' +
        '<button class="chat-tab" data-tab="memory">Memory</button>' +
      '</div>' +
      '<div class="chat-messages" id="chat-messages"></div>' +
      '<div class="chat-memory" id="chat-memory" style="display:none;"></div>' +
      '<div class="chat-input-area">' +
        '<textarea class="chat-input" id="chat-input" rows="1" placeholder="Ask Archon anything..."></textarea>' +
        '<button class="chat-send" id="chat-send" aria-label="Send">' +
          '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
        '</button>' +
      '</div>';
    mount.appendChild(panel);

    // Load existing messages
    var msgsEl = panel.querySelector('#chat-messages');
    state.messages.forEach(function(m) {
      appendMsg(msgsEl, m.role, m.text);
    });
    if (state.messages.length === 0) {
      appendMsg(msgsEl, 'system', 'Ask me anything about Archon or building apps.');
    }

    // Toggle
    bubble.addEventListener('click', function() {
      var isOpen = panel.classList.toggle('open');
      bubble.classList.toggle('open');
      if (isOpen) {
        var input = panel.querySelector('#chat-input');
        setTimeout(function() { input.focus(); }, 200);
      }
    });

    // Tabs
    panel.querySelectorAll('.chat-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        panel.querySelectorAll('.chat-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var isChat = tab.dataset.tab === 'chat';
        panel.querySelector('#chat-messages').style.display = isChat ? 'flex' : 'none';
        panel.querySelector('#chat-memory').style.display = isChat ? 'none' : 'block';
        if (!isChat) renderMemory(panel.querySelector('#chat-memory'), state);
      });
    });

    // Model switch
    panel.querySelector('#chat-model').addEventListener('change', function(e) {
      state.currentModel = parseInt(e.target.value);
      saveState(state);
      updateCredits(panel, state);
    });

    // Send
    var input = panel.querySelector('#chat-input');
    var sendBtn = panel.querySelector('#chat-send');

    function send() {
      var text = input.value.trim();
      if (!text) return;
      input.value = '';
      input.style.height = 'auto';

      appendMsg(msgsEl, 'user', text);
      msgsEl.scrollTop = msgsEl.scrollHeight;

      // Typing
      var typing = document.createElement('div');
      typing.className = 'chat-typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      msgsEl.appendChild(typing);
      msgsEl.scrollTop = msgsEl.scrollHeight;

      setTimeout(function() {
        typing.remove();
        var result = getResponse(text, state);
        appendMsg(msgsEl, 'assistant', result.text);
        if (result.handoff) {
          appendMsg(msgsEl, 'system', 'Switched to ' + result.model.name + ' — credits exhausted for previous model.');
          panel.querySelector('#chat-model').value = state.currentModel;
        }
        msgsEl.scrollTop = msgsEl.scrollHeight;
        updateCredits(panel, state);
      }, 600 + Math.random() * 800);
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    // Auto-resize input
    input.addEventListener('input', function() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 80) + 'px';
    });

    updateCredits(panel, state);
  }

  function appendMsg(container, role, text) {
    var div = document.createElement('div');
    div.className = 'chat-msg ' + role;
    div.textContent = text;
    container.appendChild(div);
  }

  function updateCredits(panel, state) {
    var el = panel.querySelector('#chat-credits');
    el.textContent = state.credits + ' credits';
    el.className = 'chat-header-credits';
    if (state.credits <= 10) el.classList.add('empty');
    else if (state.credits <= 30) el.classList.add('low');
  }

  function renderMemory(container, state) {
    if (state.memory.length === 0) {
      container.innerHTML = '<div class="chat-memory-empty">No memory yet.<br>Start a chat and your topics will appear here.</div>';
      return;
    }
    container.innerHTML = state.memory.slice().reverse().map(function(m) {
      return '<div class="chat-memory-item"><strong>' + m.q + '</strong>' + m.a + '<br><small>' + m.time + '</small></div>';
    }).join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }
})();
