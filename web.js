// Web personal: idioma, menú móvil y panel del chat (chat.html?embed=1 en un iframe).
// El HTML está en español; los textos ingleses viven aquí. Sin dependencias ni rastreadores.
(function () {
  "use strict";

  var LANG_KEY = "cv-chat-lang"; // la misma clave que usa el chat: la elección se comparte
  var TITLES = { es: "David Castilla Gómez · Ingeniero", en: "David Castilla Gómez · Engineer" };

  var EN = {
    skip: "Skip to content",
    navLabel: "Sections",
    menu: "Menu",
    navPath: "Career",
    navProjects: "Projects",
    navAwards: "Awards",
    navSkills: "Skills",
    navContact: "Contact",
    langGroup: "Language",
    kicker: "Engineer",
    lead: "Mechanical engineer with an MSc in Motorsport Engineering from Oxford Brookes, now studying an MSc in Industrial Mathematics at UPM. I work on MBSE, digital twins, simulation and applied AI.",
    availability: "Available now · Madrid, rest of Spain, remote or Europe",
    ctaChat: "Ask my AI assistant",
    photoAlt: "David Castilla Gómez",
    pathEyebrow: "Where I come from",
    pathTitle: "Career",
    p1date: "Mar – Jul 2026",
    p1title: "Intern, Advanced Design Tools and Processes",
    p1org: "Navantia · Madrid",
    p1text: "Modelled system architectures with the Arcadia method in Capella and SysON, worked on requirements, PBS, baselines and ICDs in Siemens Teamcenter and on the General Arrangement in Siemens NX, and built a Microsoft Copilot agent with Python scripts that generates the PBS from customer requirements, adopted by the team as a template.",
    p2date: "Sep 2025 – present",
    p2title: "MSc Industrial Mathematics (M2i)",
    p2org: "Universidad Politécnica de Madrid",
    p2text: "Average 8.3/10 so far. Master's thesis: a predictive digital twin for unmanned-vehicle operations, with Navantia as industrial partner.",
    p3title: "MSc Motorsport Engineering · Merit",
    p3org: "Oxford Brookes University · UK",
    p3text: "Distinction in the dissertation (71.5/100) and in Composite Design and Impact Modelling (73.5/100).",
    p4title: "BSc Mechanical Engineering",
    p4text: "GPA 7.34/10. Thesis 10/10 and Automotive Engineering 9.5/10, both with Matrícula de Honor (highest distinction).",
    p5date: "2014 – Jul 2025",
    p5title: "Founder & content creator",
    p5org: "ElReyGuiri · Formula 1 content brand",
    p5text: "About 595,000 combined followers on YouTube, Twitch, X, Instagram and TikTok; creator for DUX Gaming and Veloce Esports (UK).",
    projectsEyebrow: "What I have built",
    projectsTitle: "Projects",
    c1title: "Predictive digital twin (MSc thesis)",
    c1text: "A mothership keeps tracking an unmanned surface vehicle through communication blackouts. Arcadia in SysML v2, reduced-order models, residual networks and LSTMs, and Kalman/DMDc data assimilation; core ported to C++17.",
    c2title: "AI CV assistant",
    c2text: "LLM chatbot that answers recruiters' questions only from my CV. TypeScript API on Cloudflare Workers, Groq with a Workers AI fallback, guardrails and rate limits; zero cost.",
    c2cta: "Try it",
    c3text: "A 242M-parameter language model trained from scratch in PyTorch on Spanish Golden Age literature; perplexity 21.93 on a decontaminated test set. Paper in preparation.",
    c3tag: "242M parameters",
    c3cta: "Project page",
    c4text: "Innovation Award at the UPM Idea Challenge (Nov 2025): a counter-drone-swarm concept, in a team of 4.",
    c4tag1: "Defence",
    c5text: "Adversarial ML in Lisbon (2026): a sparse universal perturbation of 50 pixels cut an MNIST classifier from 98.9% to ~47% accuracy. Report co-author.",
    c5tag1: "Adversarial ML",
    c5tag2: "Optimisation",
    c6title: "Lap-time simulator",
    c6text: "MSc dissertation (Distinction): improved a MATLAB simulator and validated it on 13 circuits against my own laps in Assetto Corsa; error down from ~25% to 2–3%.",
    c6tag2: "Vehicle dynamics",
    c7title: "Formula-car dynamics tool",
    c7text: "BSc thesis with Matrícula de Honor: a parametric MSC ADAMS/View model with a custom GUI, applied to a Williams FW42 case.",
    c7tag2: "Multibody",
    c8text: "A programming language with Spanish keywords: about 49,000 lines of C, a bytecode virtual machine, a garbage collector and an LSP server. Private repository.",
    c8tag2: "Interpreters",
    awardsEyebrow: "Recognition",
    awardsTitle: "Awards and distinctions",
    a1title: "Innovation Award",
    a1text: "UPM Idea Challenge, with Hive Shield",
    a2text: "MSc dissertation (71.5/100), Oxford Brookes",
    a3text: "Composite Design and Impact Modelling (73.5/100), Oxford Brookes",
    a4title: "Two Matrículas de Honor",
    a4text: "BSc thesis (10/10) and Automotive Engineering (9.5/10), Universidad de Cantabria",
    a5title: "Karting Trophy",
    a5text: "Winner, Universidad de Cantabria",
    a6text: "Qualified for the playoffs",
    skillsEyebrow: "Toolbox",
    skillsTitle: "Skills",
    s1title: "Systems & PLM",
    s1req: "Requirements management",
    s1trace: "Traceability",
    s2title: "Programming",
    s3title: "AI",
    s3res: "Residual networks",
    s3adv: "Adversarial ML",
    s3llm: "LLM applications",
    s4title: "Simulation",
    s5title: "Maths",
    s5fem: "FEM",
    s5rom: "Reduced-order models",
    s5kalman: "Kalman filtering",
    s5da: "Data assimilation",
    s5bif: "Bifurcation analysis",
    s5opt: "Optimisation",
    certsTitle: "Certificates",
    cert1: "Siemens Xcelerator Academy: 17 learning paths (2026)",
    langsTitle: "Languages",
    lang1: "Spanish: native",
    lang2: "English: CEFR B2 (Cambridge FCE; IELTS Academic 6.5) and an MSc completed in the UK",
    contactEyebrow: "Contact",
    contactTitle: "Let's talk",
    contactText: "I can start right away. The quickest way to get to know my profile is to ask my assistant; for anything else, write to me.",
    ctaChatShort: "AI assistant",
    footerPrivacy: "No cookies, no tracking",
    fab: "AI assistant",
    drawerTitle: "AI assistant",
    close: "Close",
    frameTitle: "David's AI assistant",
  };

  // Atributo del HTML → atributo que traduce.
  var ATTRS = { "data-i18n-aria": "aria-label", "data-i18n-alt": "alt", "data-i18n-title": "title" };
  var ES = { text: {}, attr: {} };

  function collectSpanish() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      ES.text[el.getAttribute("data-i18n")] = el.textContent;
    });
    Object.keys(ATTRS).forEach(function (marker) {
      document.querySelectorAll("[" + marker + "]").forEach(function (el) {
        ES.attr[el.getAttribute(marker)] = el.getAttribute(ATTRS[marker]);
      });
    });
  }

  function initialLanguage() {
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

  var lang = "es";
  var frame = document.getElementById("chat-frame");

  function applyLanguage(next) {
    lang = next;
    document.documentElement.lang = lang;
    document.title = TITLES[lang];
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      el.textContent = lang === "en" ? EN[key] || ES.text[key] : ES.text[key];
    });
    Object.keys(ATTRS).forEach(function (marker) {
      document.querySelectorAll("[" + marker + "]").forEach(function (el) {
        var key = el.getAttribute(marker);
        el.setAttribute(ATTRS[marker], lang === "en" ? EN[key] || ES.attr[key] : ES.attr[key]);
      });
    });
    document.querySelectorAll(".lang-button").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-lang") === lang));
    });
    if (frame.getAttribute("src") && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: "cv-lang", lang: lang }, location.origin);
    }
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {
      // sin almacenamiento: la elección dura hasta recargar
    }
  }

  // ---------------------------------------------------------------- menú móvil

  var navToggle = document.querySelector(".nav-toggle");
  var navList = document.getElementById("nav-list");

  function setNav(open) {
    navList.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  }

  navToggle.addEventListener("click", function () {
    setNav(!navList.classList.contains("is-open"));
  });
  navList.addEventListener("click", function (e) {
    if (e.target.closest("a")) setNav(false);
  });

  // ---------------------------------------------------------------- panel del chat

  var drawer = document.getElementById("chat-drawer");
  var background = [".topbar", "main", ".footer", ".chat-fab"].map(function (sel) {
    return document.querySelector(sel);
  });
  var lastFocus = null;

  function openChat() {
    if (!frame.getAttribute("src")) {
      // Se carga al abrirlo por primera vez: quien solo mira la web no gasta cupo.
      frame.setAttribute("src", "chat.html?embed=1&lang=" + lang);
    }
    lastFocus = document.activeElement;
    drawer.hidden = false;
    document.body.classList.add("drawer-open");
    background.forEach(function (el) {
      if (el) el.inert = true;
    });
    drawer.querySelector(".drawer-close").focus();
  }

  function closeChat() {
    drawer.hidden = true;
    document.body.classList.remove("drawer-open");
    background.forEach(function (el) {
      if (el) el.inert = false;
    });
    // Si el panel se abrió solo al cargar (#chat o ?lang=), el foco vuelve al botón del asistente.
    var target = lastFocus && lastFocus !== document.body ? lastFocus : document.querySelector(".chat-fab");
    if (target && target.focus) target.focus();
  }

  document.querySelectorAll(".js-open-chat").forEach(function (button) {
    button.addEventListener("click", openChat);
  });
  drawer.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) closeChat();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !drawer.hidden) closeChat();
  });
  // Escape pulsado dentro del chat (iframe del mismo origen).
  window.addEventListener("message", function (e) {
    if (e.origin === location.origin && e.data && e.data.type === "cv-close" && !drawer.hidden) closeChat();
  });

  document.querySelectorAll(".lang-button").forEach(function (button) {
    button.addEventListener("click", function () {
      applyLanguage(button.getAttribute("data-lang"));
    });
  });

  collectSpanish();
  applyLanguage(initialLanguage());

  // #chat y los enlaces de los CVs ya enviados (?lang=es|en) abren el chat directamente.
  if (location.hash === "#chat" || new URLSearchParams(location.search).has("lang")) openChat();
})();
