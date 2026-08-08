/* Relay chat bubble, wired to Shaggoth.
 *
 * The previous widget was a canned FAQ bot that made zero network calls, so
 * it could only answer the handful of questions someone had thought to hard
 * code, and its answers went stale the moment the platform moved. This one
 * talks to Shaggoth -- the self-hosted Python AI on r510 -- over its public
 * HTTPS endpoint.
 *
 * Shaggoth is the only backend it will call. The Fly.io routes behind
 * app.relayapp.pro all require Supabase auth and spend real API credits;
 * pointing an unauthenticated widget on a public marketing page at those
 * would be handing out a metered key. Shaggoth is self-hosted, costs nothing
 * per message, and rate limits by IP on its own side.
 *
 * When Shaggoth is unreachable the widget degrades to a short set of
 * pointer answers -- where to find the IDE, the docs, the source -- rather
 * than pretending to be the AI. Those answers deliberately contain no model
 * names, prices, or version numbers: a fallback nobody remembers to update
 * should not be in a position to state facts that expire.
 *
 * Configure by defining window.RELAY_CHAT_CONFIG before this script loads.
 *
 * API (Shaggoth, shaggoth/server.py):
 *   GET  /health        -> {ok, version}
 *   GET  /greeting      -> {greeting}          composed fresh per request
 *   POST /chat          -> {reply, source, flag, ...}
 *   POST /chat/stream   -> SSE: {token} ... {done:true, reply, source, ...}
 */
(function () {
    'use strict';

    var CONFIG = {
        // Cloudflare named tunnel "shaggoth" -> 127.0.0.1:8420 on r510.
        // shaggoth.relayapp.pro is the same tunnel if this host ever moves.
        apiBase: 'https://ai.relayapp.pro',
        // Only useful for a private deployment of this widget. A key shipped
        // in a public static page is not a secret; leave it empty here and
        // gate the endpoint with SHAGGOTH_API_KEY only where the page itself
        // is private.
        apiKey: '',
        // Shaggoth feeds every incoming message to its curiosity scheduler,
        // which is what it researches overnight. This bubble sits on a public
        // page that anyone can type into, so it opts out by default rather
        // than letting drive-by traffic pick the syllabus. Set true on a
        // deployment where the visitors are the ones who should be steering
        // what it learns.
        research: false,
        // '' leaves the answer mode to whatever the server is configured for.
        // 'no_drift' answers only from the knowledge base, 'drift' lets the
        // language model improvise.
        mode: '',
        stream: true,
        title: 'Shaggoth',
        subtitle: 'Relay AI assistant',
        placeholder: 'Ask about Relay...',
        suggestions: ['What is Archon IDE?', 'What is Shaggoth?', 'How do I get started?'],
        // Shown before /greeting answers, and kept if that request fails.
        greeting: "I'm Shaggoth, the AI behind Relay. Self-hosted, no external APIs. Ask me something.",
        mountSelector: '#chat-bubble-mount'
    };

    var userConfig = window.RELAY_CHAT_CONFIG || {};
    for (var key in userConfig) {
        if (Object.prototype.hasOwnProperty.call(userConfig, key)) CONFIG[key] = userConfig[key];
    }
    var API = String(CONFIG.apiBase || '').replace(/\/+$/, '');

    var SESSION_KEY = 'relay.chat.session';
    var HISTORY_KEY = 'relay.chat.history';
    // Conversations persist across page navigations, which on a multi-page
    // site means they persist indefinitely. Cap what is stored so a long
    // running visitor cannot fill localStorage with transcript.
    var MAX_STORED = 40;
    var HEALTH_TIMEOUT_MS = 4000;
    var CHAT_TIMEOUT_MS = 60000;
    var HEALTH_INTERVAL_MS = 60000;

    // -------------------------------------------------------------- storage

    /* Every storage call is wrapped: Safari private mode throws on setItem,
     * and a chat bubble is not worth taking the page down over. */
    function readStore(key) {
        try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }
    function writeStore(key, value) {
        try { window.localStorage.setItem(key, value); } catch (e) { /* full or blocked */ }
    }

    function sessionId() {
        var id = readStore(SESSION_KEY);
        if (id) return id;
        id = 'relay-web-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        writeStore(SESSION_KEY, id);
        return id;
    }

    function loadHistory() {
        var raw = readStore(HISTORY_KEY);
        if (!raw) return [];
        try {
            var parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.filter(function (m) {
                return m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'bot');
            }) : [];
        } catch (e) {
            return [];
        }
    }

    function saveHistory(history) {
        writeStore(HISTORY_KEY, JSON.stringify(history.slice(-MAX_STORED)));
    }

    // ----------------------------------------------------------- networking

    function authHeaders(extra) {
        var headers = extra || {};
        if (CONFIG.apiKey) headers['Authorization'] = 'Bearer ' + CONFIG.apiKey;
        return headers;
    }

    /* fetch has no timeout of its own; without one a request to a tunnel
     * whose origin is down hangs until the browser gives up, and the typing
     * indicator spins for minutes. */
    function fetchWithTimeout(url, options, timeoutMs) {
        options = options || {};
        if (typeof AbortController !== 'function') return fetch(url, options);
        var controller = new AbortController();
        var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
        options.signal = controller.signal;
        return fetch(url, options).then(function (response) {
            clearTimeout(timer);
            return response;
        }, function (err) {
            clearTimeout(timer);
            throw err;
        });
    }

    function chatBody(text) {
        var body = { message: text, session_id: sessionId(), research: CONFIG.research };
        if (CONFIG.mode) body.mode = CONFIG.mode;
        return JSON.stringify(body);
    }

    function checkHealth() {
        return fetchWithTimeout(API + '/health', { headers: authHeaders({}) }, HEALTH_TIMEOUT_MS)
            .then(function (r) { return r.ok; })
            .catch(function () { return false; });
    }

    function loadGreeting() {
        return fetchWithTimeout(API + '/greeting', { headers: authHeaders({}) }, HEALTH_TIMEOUT_MS)
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) { return (d && (d.greeting || d.reply) || '').trim(); })
            .catch(function () { return ''; });
    }

    function askPlain(text) {
        return fetchWithTimeout(API + '/chat', {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: chatBody(text)
        }, CHAT_TIMEOUT_MS).then(function (r) {
            if (!r.ok) throw httpError(r.status);
            return r.json();
        }).then(function (d) {
            return { reply: (d && d.reply || '').trim(), source: d && d.source };
        });
    }

    /* Stream tokens as they arrive. onToken is called with each fragment; the
     * resolved value is the authoritative full reply from the done event, so
     * a stream that drops a fragment still ends up with the right text. */
    function askStreaming(text, onToken) {
        return fetchWithTimeout(API + '/chat/stream', {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: chatBody(text)
        }, CHAT_TIMEOUT_MS).then(function (r) {
            if (!r.ok) throw httpError(r.status);
            if (!r.body || typeof r.body.getReader !== 'function') throw new Error('no stream');

            var reader = r.body.getReader();
            var decoder = new TextDecoder();
            var buffer = '';
            var accumulated = '';
            var meta = null;

            function handleEvent(block) {
                var lines = block.split('\n');
                for (var i = 0; i < lines.length; i++) {
                    if (lines[i].indexOf('data:') !== 0) continue;
                    var payload = lines[i].slice(5).trim();
                    if (!payload) continue;
                    var data;
                    try { data = JSON.parse(payload); } catch (e) { continue; }
                    if (data.token) {
                        accumulated += data.token;
                        onToken(data.token);
                    }
                    if (data.done) meta = data;
                }
            }

            function pump() {
                return reader.read().then(function (chunk) {
                    if (chunk.done) {
                        buffer += decoder.decode();
                        if (buffer.trim()) handleEvent(buffer);
                        return {
                            reply: ((meta && meta.reply) || accumulated).trim(),
                            source: meta && meta.source,
                            streamed: accumulated.length > 0
                        };
                    }
                    buffer += decoder.decode(chunk.value, { stream: true });
                    var blocks = buffer.split('\n\n');
                    buffer = blocks.pop();
                    for (var i = 0; i < blocks.length; i++) handleEvent(blocks[i]);
                    return pump();
                });
            }

            return pump();
        });
    }

    function httpError(status) {
        var err = new Error('HTTP ' + status);
        err.status = status;
        return err;
    }

    // ------------------------------------------------------------- fallback

    /* Used only when Shaggoth cannot be reached. Pointers, not facts -- see
     * the header comment. */
    var FALLBACKS = [
        {
            match: /\b(ide|archon|editor|code\s*editor)\b/i,
            text: 'Archon IDE is the browser IDE. It lives at https://ide.relayapp.pro and the source is in the Relay repo under archon-ide/.'
        },
        {
            match: /\b(shaggoth|local ai|self.?hosted)\b/i,
            text: 'Shaggoth is the self-hosted AI behind this bubble. It runs on our own hardware with no external model APIs. Source: https://github.com/Mattjhagen/Shaggoth-a1'
        },
        {
            match: /\b(doc|docs|documentation|guide|manual)\b/i,
            text: 'The docs, install guides and phase plans are linked from https://relayapp.pro and kept in docs/ in the Relay repo.'
        },
        {
            match: /\b(start|started|begin|install|setup|set up|download|app|android|ios)\b/i,
            text: 'Start at https://relayapp.pro -- everything, including the mobile builds, is linked from there.'
        },
        {
            match: /\b(source|github|repo|open.?source|licen[cs]e)\b/i,
            text: 'Everything is on GitHub: https://github.com/Mattjhagen/Relay. MIT licensed.'
        },
        {
            match: /\b(status|uptime|down|outage)\b/i,
            text: 'Platform status is linked from the footer of https://relayapp.pro.'
        }
    ];

    var OFFLINE_DEFAULT =
        'Shaggoth is offline right now, so this is a canned answer rather than the AI. ' +
        'Try https://relayapp.pro for the docs and https://github.com/Mattjhagen/Relay for the source.';

    function fallbackAnswer(text) {
        for (var i = 0; i < FALLBACKS.length; i++) {
            if (FALLBACKS[i].match.test(text)) {
                return FALLBACKS[i].text + '\n\n(Shaggoth is offline, so this is a canned answer.)';
            }
        }
        return OFFLINE_DEFAULT;
    }

    // ----------------------------------------------------------------- view

    var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l2-4.9A8.4 8.4 0 0 1 4 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8 8.4z"/></svg>';
    var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>';

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function build() {
        var root = el('div', 'relay-chat');
        root.setAttribute('data-state', 'unknown');

        var panel = el('div', 'relay-chat-panel');
        panel.id = 'relay-chat-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', CONFIG.title + ' chat');

        var header = el('div', 'relay-chat-header');
        var avatar = el('div', 'relay-chat-avatar', (CONFIG.title || 'S').charAt(0).toUpperCase());
        avatar.setAttribute('aria-hidden', 'true');
        var titles = el('div', 'relay-chat-titles');
        titles.appendChild(el('div', 'relay-chat-title', CONFIG.title));
        var status = el('div', 'relay-chat-status');
        status.appendChild(el('span', 'relay-chat-status-dot'));
        var statusText = el('span', null, CONFIG.subtitle);
        status.appendChild(statusText);
        titles.appendChild(status);
        var clearBtn = el('button', 'relay-chat-action', 'Clear');
        clearBtn.type = 'button';
        header.appendChild(avatar);
        header.appendChild(titles);
        header.appendChild(clearBtn);

        var log = el('div', 'relay-chat-log');
        // polite, not assertive: streamed replies should not interrupt a
        // screen reader mid-sentence on every token.
        log.setAttribute('role', 'log');
        log.setAttribute('aria-live', 'polite');
        log.setAttribute('aria-label', 'Conversation');

        var suggestions = el('div', 'relay-chat-suggestions');

        var form = el('form', 'relay-chat-form');
        var input = el('input', 'relay-chat-input');
        input.type = 'text';
        input.placeholder = CONFIG.placeholder;
        input.autocomplete = 'off';
        input.setAttribute('aria-label', 'Message ' + CONFIG.title);
        var send = el('button', 'relay-chat-send');
        send.type = 'submit';
        send.innerHTML = ICON_SEND;
        send.setAttribute('aria-label', 'Send message');
        form.appendChild(input);
        form.appendChild(send);

        var footnote = el('div', 'relay-chat-footnote');
        footnote.appendChild(document.createTextNode('Answered by Shaggoth, self-hosted. '));
        var footLink = el('a', null, 'It can be wrong.');
        footLink.href = 'https://github.com/Mattjhagen/Shaggoth-a1';
        footLink.target = '_blank';
        footLink.rel = 'noopener';
        footnote.appendChild(footLink);

        panel.appendChild(header);
        panel.appendChild(log);
        panel.appendChild(suggestions);
        panel.appendChild(form);
        panel.appendChild(footnote);

        var launcher = el('button', 'relay-chat-launcher');
        launcher.type = 'button';
        launcher.innerHTML =
            '<span class="relay-chat-icon-open">' + ICON_CHAT + '</span>' +
            '<span class="relay-chat-icon-close">' + ICON_CLOSE + '</span>' +
            '<span class="relay-chat-dot"></span>';
        launcher.setAttribute('aria-label', 'Open chat with ' + CONFIG.title);
        launcher.setAttribute('aria-expanded', 'false');
        launcher.setAttribute('aria-controls', 'relay-chat-panel');

        root.appendChild(panel);
        root.appendChild(launcher);

        return {
            root: root, panel: panel, log: log, form: form, input: input, send: send,
            launcher: launcher, clearBtn: clearBtn, statusText: statusText,
            suggestions: suggestions
        };
    }

    // ------------------------------------------------------------- behaviour

    function init() {
        var ui = build();
        var history = loadHistory();
        var online = null;
        var busy = false;
        var greeted = false;
        var healthTimer = null;

        var mount = CONFIG.mountSelector ? document.querySelector(CONFIG.mountSelector) : null;
        (mount || document.body).appendChild(ui.root);

        function nearBottom() {
            return ui.log.scrollHeight - ui.log.scrollTop - ui.log.clientHeight < 80;
        }

        /* Only auto-scroll when the reader is already at the bottom. Yanking
         * the view down while someone is scrolled up reading an earlier answer
         * is the single most irritating thing a chat log can do. */
        function scrollDown(force) {
            if (force || nearBottom()) ui.log.scrollTop = ui.log.scrollHeight;
        }

        function addMessage(role, text, meta) {
            var wrap = el('div', 'relay-chat-msg relay-chat-msg-' + (role === 'user' ? 'user' : 'bot'));
            if (meta === 'error') wrap.className += ' relay-chat-msg-error';
            var bubble = el('div', 'relay-chat-bubble', text);
            wrap.appendChild(bubble);
            if (meta && meta !== 'error' && meta !== 'pattern') {
                wrap.appendChild(el('div', 'relay-chat-meta', meta));
            }
            ui.log.appendChild(wrap);
            scrollDown(role === 'user');
            return bubble;
        }

        function remember(role, text) {
            history.push({ role: role, text: text });
            if (history.length > MAX_STORED) history = history.slice(-MAX_STORED);
            saveHistory(history);
        }

        function renderHistory() {
            ui.log.textContent = '';
            for (var i = 0; i < history.length; i++) addMessage(history[i].role, history[i].text);
            scrollDown(true);
        }

        function showTyping() {
            var wrap = el('div', 'relay-chat-msg relay-chat-msg-bot');
            var typing = el('div', 'relay-chat-typing');
            typing.innerHTML = '<span></span><span></span><span></span>';
            typing.setAttribute('aria-label', CONFIG.title + ' is typing');
            wrap.appendChild(typing);
            ui.log.appendChild(wrap);
            scrollDown(true);
            return wrap;
        }

        function setState(isOnline) {
            online = isOnline;
            ui.root.setAttribute('data-state', isOnline ? 'online' : 'offline');
            ui.statusText.textContent = isOnline ? CONFIG.subtitle : 'Offline - limited answers';
        }

        function renderSuggestions() {
            ui.suggestions.textContent = '';
            // Prompts are only a nudge for an empty conversation; once there
            // is a transcript they are just clutter above the input.
            if (history.length > 1) return;
            (CONFIG.suggestions || []).forEach(function (prompt) {
                var chip = el('button', 'relay-chat-suggestion', prompt);
                chip.type = 'button';
                chip.addEventListener('click', function () { submit(prompt); });
                ui.suggestions.appendChild(chip);
            });
        }

        function pollHealth() {
            checkHealth().then(setState);
        }

        function open() {
            ui.root.classList.add('is-open');
            ui.root.classList.remove('has-unread');
            ui.launcher.setAttribute('aria-expanded', 'true');
            ui.launcher.setAttribute('aria-label', 'Close chat with ' + CONFIG.title);
            // Next frame, so the transition has a starting state to animate
            // from rather than snapping straight to its end state.
            requestAnimationFrame(function () { ui.root.classList.add('is-visible'); });
            scrollDown(true);
            if (!('ontouchstart' in window)) ui.input.focus();

            pollHealth();
            if (!healthTimer) healthTimer = setInterval(pollHealth, HEALTH_INTERVAL_MS);

            if (!greeted) {
                greeted = true;
                if (!history.length) {
                    var bubble = addMessage('bot', CONFIG.greeting);
                    // /greeting is composed per request from what Shaggoth
                    // currently knows, so the opener is about what it has
                    // actually been reading. The markup line is only the
                    // fallback if that request fails.
                    loadGreeting().then(function (line) {
                        if (!line) { remember('bot', CONFIG.greeting); return; }
                        bubble.textContent = line;
                        remember('bot', line);
                    });
                }
            }
        }

        function close() {
            ui.root.classList.remove('is-visible');
            ui.launcher.setAttribute('aria-expanded', 'false');
            ui.launcher.setAttribute('aria-label', 'Open chat with ' + CONFIG.title);
            if (healthTimer) { clearInterval(healthTimer); healthTimer = null; }
            var finish = function () { ui.root.classList.remove('is-open'); };
            // Wait out the fade before display:none, but never leave the panel
            // stuck open if the transition never fires (reduced motion, a
            // background tab).
            setTimeout(finish, 200);
            ui.launcher.focus();
        }

        function toggle() {
            if (ui.root.classList.contains('is-open')) close(); else open();
        }

        function failureText(err) {
            if (err && err.status === 429) {
                return 'That is more questions than Shaggoth accepts in a minute. Give it a moment and ask again.';
            }
            if (err && err.status === 401) {
                return 'Shaggoth refused the request: this endpoint needs an API key.';
            }
            return null;
        }

        function submit(text) {
            text = (text || '').trim();
            if (!text || busy) return;

            busy = true;
            ui.send.disabled = true;
            ui.input.value = '';
            addMessage('user', text);
            remember('user', text);
            renderSuggestions();

            var typing = showTyping();
            var bubble = null;
            var streamed = false;

            function beginReply(first) {
                typing.remove();
                bubble = addMessage('bot', first);
            }

            function settle(reply, source) {
                if (!bubble) beginReply(reply);
                else bubble.textContent = reply;
                if (source && source !== 'pattern' && bubble.parentNode) {
                    bubble.parentNode.appendChild(el('div', 'relay-chat-meta', source));
                }
                remember('bot', reply);
                setState(true);
                scrollDown();
            }

            function fail(err) {
                if (typing.parentNode) typing.remove();
                var known = failureText(err);
                var text2 = known || fallbackAnswer(text);
                if (bubble) {
                    // Tokens already landed on screen; do not throw them away,
                    // just say the rest is missing.
                    bubble.textContent = bubble.textContent + '\n\n[connection lost]';
                    remember('bot', bubble.textContent);
                } else {
                    addMessage('bot', text2, 'error');
                    remember('bot', text2);
                }
                if (!known) setState(false);
                scrollDown();
            }

            function done() {
                busy = false;
                ui.send.disabled = false;
                renderSuggestions();
            }

            var request;
            if (CONFIG.stream && window.ReadableStream && window.TextDecoder) {
                request = askStreaming(text, function (token) {
                    streamed = true;
                    if (!bubble) beginReply(token);
                    else { bubble.textContent += token; scrollDown(); }
                }).catch(function (err) {
                    // A stream that failed before producing anything is worth
                    // retrying unbuffered: an intermediary that strips
                    // text/event-stream is a real deployment, and a Shaggoth
                    // predating /chat/stream 404s on it. /chat returns the
                    // same answer either way.
                    //
                    // Once tokens are on screen a retry would duplicate them,
                    // and a 401/429/5xx would only fail the same way twice --
                    // both of those surface instead.
                    var retryable = !err.status || err.status === 404 || err.status === 405;
                    if (streamed || !retryable) throw err;
                    return askPlain(text);
                });
            } else {
                request = askPlain(text);
            }

            request.then(function (result) {
                settle(result.reply || 'No answer came back.', result.source);
            }).catch(fail).then(done, done);
        }

        ui.launcher.addEventListener('click', toggle);
        ui.clearBtn.addEventListener('click', function () {
            history = [];
            saveHistory(history);
            greeted = false;
            renderHistory();
            renderSuggestions();
            // A cleared conversation should also be a new session on the
            // server side; otherwise Shaggoth keeps answering with context
            // the visitor just asked to be rid of. sessionId() mints a fresh
            // one the next time it is asked.
            try { window.localStorage.removeItem(SESSION_KEY); } catch (e) { /* blocked */ }
            open();
        });
        ui.form.addEventListener('submit', function (e) {
            e.preventDefault();
            submit(ui.input.value);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && ui.root.classList.contains('is-open')) close();
        });

        renderHistory();
        renderSuggestions();

        // Expose enough to drive the bubble from the page (a "Talk to
        // Shaggoth" button in the hero, for instance).
        window.RelayChat = {
            open: open,
            close: close,
            toggle: toggle,
            ask: function (text) { open(); submit(text); }
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
