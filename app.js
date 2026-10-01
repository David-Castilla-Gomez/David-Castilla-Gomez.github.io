// Chat del CV: Turnstile → sesión corta → /api/chat con streaming SSE.
// Sin frameworks. La conversación vive en memoria y se pierde al recargar; solo se recuerda
// el idioma elegido (localStorage), que es una preferencia de la interfaz.
(function () {
  "use strict";

  var cfg = window.CV_CHAT_CONFIG;
  var MAX_HISTORY = 7;
  var MAX_CONTEXT_CHARS = 1000; // el Worker admite 1000 caracteres por mensaje
  var RENEW_MARGIN_MS = 60 * 1000;
  var LANG_KEY = "cv-chat-lang";

  // ---------------------------------------------------------------- textos

  var I18N = {
    es: {
      title: "David Castilla Gómez · Ingeniero",
      headline: "Ingeniero",
      langGroup: "Idioma",
      langEs: "Ver en español",
      langEn: "Ver en inglés",
      chatTitle: "Pregunta por mi perfil",
      chatIntro: "Este asistente responde solo con la información de mi CV. Puedes escribir en español o en inglés.",
      s1: "¿Qué experiencia tiene David en MBSE y defensa?",
      s2: "¿Qué proyectos de IA y software ha desarrollado?",
      s3: "¿Cuál es su disponibilidad y dónde puede trabajar?",
      questionLabel: "Tu pregunta",
      placeholder: "Escribe tu pregunta…",
      send: "Enviar",
      stop: "Detener",
      footer: "Las conversaciones no se guardan.",
      you: "Tú: ",
      assistant: "Asistente: ",
      interrupted: "Respuesta interrumpida",
      verifying: "Verificando que eres una persona…",
      turnstileBlocked:
        "No se pudo cargar la verificación anti-bots. Si usas un bloqueador de contenido, permite challenges.cloudflare.com.",
      contactPrefix: " Puedes escribir a David a ",
      contactOr: " o por ",
      refusal: "Lo siento, con eso no puedo ayudar. Puedo contarte la experiencia, los proyectos, la formación o la disponibilidad de David.",
      errors: {
        rate_limited: "Vas muy rápido: espera unos segundos y vuelve a intentarlo.",
        daily_cap: "El asistente ha alcanzado su límite de conversaciones por hoy.",
        visitor_cap: "Has llegado al máximo de mensajes por hoy.",
        turnstile_failed: "No se pudo completar la verificación anti-bots. Recarga la página.",
        session: "No se pudo verificar la sesión. Recarga la página.",
        input: "No se pudo enviar el mensaje. Recuerda que el máximo son 1.000 caracteres.",
        network: "No hay conexión con el asistente. Comprueba tu conexión e inténtalo de nuevo.",
        other: "El servicio de IA no responde ahora mismo. Inténtalo en unos minutos.",
      },
    },
    en: {
      title: "David Castilla Gómez · Engineer",
      headline: "Engineer",
      langGroup: "Language",
      langEs: "View in Spanish",
      langEn: "View in English",
      chatTitle: "Ask about my profile",
      chatIntro: "This assistant only answers with the information in my CV. You can write in English or Spanish.",
      s1: "What experience does David have in MBSE and defence?",
      s2: "What AI and software projects has he built?",
      s3: "When is he available and where can he work?",
      questionLabel: "Your question",
      placeholder: "Type your question…",
      send: "Send",
      stop: "Stop",
      footer: "Conversations are not stored.",
      you: "You: ",
      assistant: "Assistant: ",
      interrupted: "Response interrupted",
      verifying: "Checking that you are human…",
      turnstileBlocked:
        "The anti-bot check could not load. If you use a content blocker, allow challenges.cloudflare.com.",
      contactPrefix: " You can reach David at ",
      contactOr: " or on ",
      refusal: "Sorry, I can't help with that. I can tell you about David's experience, projects, education or availability.",
      errors: {
        rate_limited: "You are going too fast: wait a few seconds and try again.",
        daily_cap: "The assistant has reached its conversation limit for today.",
        visitor_cap: "You have reached today's message limit.",
        turnstile_failed: "The anti-bot check could not be completed. Please reload the page.",
        session: "Your session could not be verified. Please reload the page.",
        input: "The message could not be sent. The maximum is 1,000 characters.",
        network: "Cannot reach the assistant. Check your connection and try again.",
        other: "The AI service is not responding right now. Please try again in a few minutes.",
      },
    },
  };

  function initialLanguage() {
    // ?lang=es|en: el botón del CV en PDF abre el chat en el idioma de ese CV.
    var fromUrl = new URLSearchParams(location.search).get("lang");
    if (fromUrl === "es" || fromUrl === "en") return fromUrl;
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved === "es" || saved === "en") return saved;
    } catch (e) {
      // almacenamiento bloqueado: se usa el idioma del navegador
    }
    return /^es\b/i.test(navigator.language || "") ? "es" : "en";
  }

  var lang = initialLanguage();

  function t(key) {
    return I18N[lang][key];
  }

  var els = {
    log: document.getElementById("messages"),
    form: document.getElementById("chat-form"),
    input: document.getElementById("q"),
    counter: document.getElementById("counter"),
    send: document.getElementById("send"),
    stop: document.getElementById("stop"),
    status: document.getElementById("status"),
    suggestions: document.getElementById("suggestions"),
    turnstile: document.getElementById("turnstile"),
    langButtons: document.querySelectorAll(".lang-button"),
  };

  var state = {
    session: null,
    expiresAt: 0,
    widgetId: null,
    history: [],
    streaming: false,
    abort: null,
    statusKey: null, // se guarda la clave para retraducir el estado al cambiar de idioma
  };

  function applyLanguage(next) {
    lang = next;
    document.documentElement.lang = lang;
    document.title = t("title");
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    els.langButtons.forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-lang") === lang));
    });
    if (state.statusKey) setStatus(state.statusKey, els.status.dataset.kind);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {
      // sin almacenamiento: la elección dura hasta recargar
    }
  }

  // ---------------------------------------------------------------- sesión

  function deferred() {
    var d = {};
    d.promise = new Promise(function (resolve, reject) {
      d.resolve = resolve;
      d.reject = reject;
    });
    d.promise.catch(function () {}); // evita avisos si nadie la está esperando todavía
    return d;
  }

  var sessionWait = deferred();

  window.onTurnstileLoad = function () {
    state.widgetId = window.turnstile.render(els.turnstile, {
      sitekey: cfg.turnstileSiteKey,
      action: "cv-chat",
      appearance: "interaction-only",
      "refresh-expired": "manual",
      retry: "auto",
      theme: "auto",
      callback: exchangeToken,
      "error-callback": function () {
        setStatus("turnstile_failed", "error");
        sessionWait.reject({ code: "turnstile_failed" });
      },
    });
  };

  // Si el script de Turnstile no llega (bloqueadores de contenido), avisamos en vez de esperar para siempre.
  setTimeout(function () {
    if (!window.turnstile) setStatus("turnstileBlocked", "error");
  }, 10000);

  function exchangeToken(token) {
    fetch(cfg.apiBase + "/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turnstileToken: token }),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) throw toApiError(data);
          state.session = data.session;
          state.expiresAt = Date.now() + data.expiresIn * 1000;
          setStatus(null);
          updateSendButton();
          sessionWait.resolve(state.session);
        });
      })
      .catch(function (err) {
        var e = err && err.code ? err : { code: "network" };
        setStatus(errorKey(e), "error");
        sessionWait.reject(e);
      });
  }

  function renewSession() {
    state.session = null;
    sessionWait = deferred();
    updateSendButton();
    if (window.turnstile && state.widgetId !== null) window.turnstile.reset(state.widgetId);
    return sessionWait.promise;
  }

  function getSession() {
    if (state.session && state.expiresAt - Date.now() > RENEW_MARGIN_MS) return Promise.resolve(state.session);
    if (state.session) return renewSession();
    return sessionWait.promise;
  }

  // ---------------------------------------------------------------- envío

  function send(text) {
    text = text.trim();
    if (!text || state.streaming) return;

    els.suggestions.hidden = true;
    appendMessage("user", text);
    state.history.push({ role: "user", content: text });
    els.input.value = "";
    updateCounter();

    var bubble = appendMessage("assistant", "");
    bubble.classList.add("is-pending");
    setStreaming(true);

    streamAnswer(bubble, false)
      .then(function (answer) {
        state.history.push({ role: "assistant", content: answer });
      })
      .catch(function (err) {
        var partial = bubble.dataset.raw || "";
        if (err && err.name === "AbortError") {
          if (partial) {
            state.history.push({ role: "assistant", content: partial });
            addCaption(bubble, t("interrupted"));
          } else {
            bubble.parentElement.remove();
            state.history.pop();
          }
          return;
        }
        if (partial) {
          state.history.push({ role: "assistant", content: partial });
        } else {
          bubble.parentElement.remove();
          state.history.pop(); // el mensaje del usuario no obtuvo respuesta
        }
        appendNote(messageFor(err), err && (err.code === "daily_cap" || err.code === "visitor_cap"));
      })
      .finally(function () {
        bubble.classList.remove("is-pending");
        setStreaming(false);
        els.input.focus();
      });
  }

  // Las respuestas del bot vuelven como contexto recortadas: pueden pasar del límite por mensaje.
  function contextMessages() {
    return state.history.slice(-MAX_HISTORY).map(function (m) {
      return m.role === "assistant" ? { role: m.role, content: m.content.slice(0, MAX_CONTEXT_CHARS) } : m;
    });
  }

  function streamAnswer(bubble, retried) {
    return getSession().then(function (session) {
      var controller = new AbortController();
      state.abort = controller;
      return fetch(cfg.apiBase + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session },
        // lang: el bot responde en el idioma de la bandera elegida.
        body: JSON.stringify({ messages: contextMessages(), lang: lang }),
        signal: controller.signal,
      }).then(function (res) {
        if (!res.ok) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            var err = toApiError(data);
            if (res.status === 401 && !retried) {
              return renewSession().then(function () { return streamAnswer(bubble, true); });
            }
            throw err;
          });
        }
        return readStream(res.body, bubble);
      });
    });
  }

  // gpt-oss responde algunas negativas con una frase fija en inglés aunque se le pida otro idioma.
  var CANNED_REFUSAL = /^\s*I['’]m sorry,? but I can['’]t[^\n]{0,80}$/i;

  function localizeRefusal(answer) {
    return lang === "es" && CANNED_REFUSAL.test(answer) ? t("refusal") : answer;
  }

  function readStream(body, bubble) {
    var reader = body.getReader();
    var decoder = new TextDecoder("utf-8");
    var buffer = "";
    var text = "";
    var scheduled = false;

    function paint() {
      scheduled = false;
      bubble.innerHTML = renderMarkdownLite(text);
      bubble.dataset.raw = text;
      scrollToEnd();
    }

    function handle(event) {
      // El evento "meta" (proveedor y modelo) no se muestra en la interfaz.
      if (event.type === "delta") {
        text += event.text;
        bubble.classList.remove("is-pending");
        if (!scheduled) {
          scheduled = true;
          requestAnimationFrame(paint);
        }
      } else if (event.type === "done") {
        if (event.reason === "length") text += " …";
      } else if (event.type === "error") {
        throw { code: event.code };
      }
    }

    function pump() {
      return reader.read().then(function (chunk) {
        if (chunk.done) {
          text = localizeRefusal(text);
          paint();
          if (!text) throw { code: "provider_stream_error" };
          els.log.setAttribute("aria-busy", "false");
          return text;
        }
        buffer += decoder.decode(chunk.value, { stream: true });
        var blocks = buffer.split("\n\n");
        buffer = blocks.pop();
        blocks.forEach(function (block) {
          block.split("\n").forEach(function (line) {
            if (line.indexOf("data:") !== 0) return;
            var event;
            try {
              event = JSON.parse(line.slice(5));
            } catch (e) {
              return;
            }
            handle(event);
          });
        });
        return pump();
      });
    }

    return pump().catch(function (err) {
      paint();
      throw err;
    });
  }

  // ---------------------------------------------------------------- render

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Recibe texto YA escapado. Solo enlaces http(s): nada de javascript: ni data:.
  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\s][^*]*?)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Autoenlaces <https://...> (llegan ya escapados como &lt;...&gt;).
      .replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, function (match, before, url) {
        // La puntuación final ("…gomez/.") no forma parte del enlace.
        var trailing = /[.,;:!?]+$/.exec(url);
        var tail = trailing ? trailing[0] : "";
        var href = tail ? url.slice(0, -tail.length) : url;
        return before + '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + href + "</a>" + tail;
      });
  }

  function renderMarkdownLite(text) {
    var lines = escapeHtml(text).split("\n");
    var html = "";
    var list = null;
    var para = [];

    function flushPara() {
      if (para.length) {
        html += "<p>" + inline(para.join("<br>")) + "</p>";
        para = [];
      }
    }
    function closeList() {
      if (list) {
        html += "</" + list + ">";
        list = null;
      }
    }

    lines.forEach(function (raw) {
      var line = raw.replace(/\s+$/, "");
      var ul = /^\s*[-*•]\s+(.*)$/.exec(line);
      var ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
      if (ul || ol) {
        flushPara();
        var type = ul ? "ul" : "ol";
        if (list !== type) {
          closeList();
          html += "<" + type + ">";
          list = type;
        }
        html += "<li>" + inline((ul || ol)[1]) + "</li>";
      } else if (line.trim() === "") {
        flushPara();
        closeList();
      } else {
        closeList();
        para.push(line);
      }
    });
    flushPara();
    closeList();
    return html;
  }

  // ---------------------------------------------------------------- UI

  function appendMessage(role, text) {
    var item = document.createElement("li");
    item.className = "message message-" + role;
    var who = document.createElement("span");
    who.className = "visually-hidden";
    who.textContent = role === "user" ? t("you") : t("assistant");
    var bubble = document.createElement("div");
    bubble.className = "bubble";
    if (role === "user") bubble.textContent = text;
    item.appendChild(who);
    item.appendChild(bubble);
    els.log.appendChild(item);
    scrollToEnd();
    return bubble;
  }

  function addCaption(bubble, text) {
    var caption = document.createElement("p");
    caption.className = "caption";
    caption.textContent = text;
    bubble.parentElement.appendChild(caption);
    scrollToEnd();
  }

  function appendNote(text, withContact) {
    var item = document.createElement("li");
    item.className = "message message-note";
    var p = document.createElement("p");
    p.textContent = text;
    if (withContact) {
      p.appendChild(document.createTextNode(t("contactPrefix")));
      var mail = document.createElement("a");
      mail.href = "mailto:" + cfg.email;
      mail.textContent = cfg.email;
      p.appendChild(mail);
      p.appendChild(document.createTextNode(t("contactOr")));
      var li = document.createElement("a");
      li.href = cfg.linkedin;
      li.rel = "noopener noreferrer";
      li.textContent = "LinkedIn";
      p.appendChild(li);
      p.appendChild(document.createTextNode("."));
    }
    item.appendChild(p);
    els.log.appendChild(item);
    scrollToEnd();
  }

  function scrollToEnd() {
    els.log.scrollTop = els.log.scrollHeight;
  }

  // key: clave de I18N (o de I18N.errors); null borra el estado.
  function setStatus(key, kind) {
    state.statusKey = key;
    var text = "";
    if (key) text = I18N[lang].errors[key] || t(key) || "";
    els.status.textContent = text;
    els.status.dataset.kind = kind || "";
  }

  function setStreaming(on) {
    state.streaming = on;
    els.stop.hidden = !on;
    els.log.setAttribute("aria-busy", on ? "true" : "false");
    if (!on) state.abort = null;
    updateSendButton();
  }

  function updateSendButton() {
    els.send.disabled = state.streaming || !state.session || els.input.value.trim() === "";
  }

  function updateCounter() {
    els.counter.textContent = els.input.value.length + "/1000";
    updateSendButton();
  }

  function toApiError(data) {
    var e = (data && data.error) || {};
    return { code: e.code || "unknown", retryAfter: e.retryAfter };
  }

  function errorKey(err) {
    switch (err && err.code) {
      case "rate_limited":
      case "daily_cap":
      case "visitor_cap":
      case "turnstile_failed":
      case "network":
        return err.code;
      case "session_missing":
      case "session_invalid":
      case "session_expired":
        return "session";
      case "invalid_messages":
      case "bad_request":
      case "payload_too_large":
        return "input";
      default:
        return "other";
    }
  }

  function messageFor(err) {
    return I18N[lang].errors[errorKey(err)];
  }

  // ---------------------------------------------------------------- eventos

  els.langButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      applyLanguage(button.getAttribute("data-lang"));
    });
  });

  els.form.addEventListener("submit", function (e) {
    e.preventDefault();
    send(els.input.value);
  });

  els.input.addEventListener("input", updateCounter);

  els.input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (!els.send.disabled) send(els.input.value);
    } else if (e.key === "Escape" && state.abort) {
      state.abort.abort();
    }
  });

  els.stop.addEventListener("click", function () {
    if (state.abort) state.abort.abort();
  });

  els.suggestions.addEventListener("click", function (e) {
    var button = e.target.closest(".suggestion");
    if (!button) return;
    if (!state.session) {
      els.input.value = button.textContent;
      updateCounter();
      els.input.focus();
      return;
    }
    send(button.textContent);
  });

  // Integrado en la web principal: el idioma lo manda la página que contiene el chat.
  window.addEventListener("message", function (e) {
    if (e.origin !== location.origin || !e.data || e.data.type !== "cv-lang") return;
    if (e.data.lang === "es" || e.data.lang === "en") applyLanguage(e.data.lang);
  });

  // Con el foco dentro del iframe, Escape no llega a la web: se le pide que cierre el panel
  // (si hay una respuesta en curso, el primer Escape solo la detiene).
  if (document.documentElement.classList.contains("embedded") && window.parent !== window) {
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !state.streaming) {
        window.parent.postMessage({ type: "cv-close" }, location.origin);
      }
    });
  }

  applyLanguage(lang);
  setStatus("verifying");
  updateCounter();

  // Estadística anónima: suma un chat abierto al contador del día (sin cookies, IPs ni
  // identificadores; nada de la conversación). Se respetan Do Not Track y Global Privacy Control.
  try {
    if (navigator.doNotTrack !== "1" && !navigator.globalPrivacyControl) {
      fetch(cfg.apiBase + "/api/event", { method: "POST", body: "chat", keepalive: true }).catch(function () {});
    }
  } catch (e) {
    // Nunca debe afectar al chat.
  }
})();
