// Configuración pública del sitio. Aquí no hay secretos: la clave de Groq vive en el Worker.
(function () {
  "use strict";
  var local = location.hostname === "localhost" || location.hostname === "127.0.0.1";

  window.CV_CHAT_CONFIG = {
    apiBase: local
      ? "http://localhost:8787"
      : "https://cv-chatbot.david-castilla.workers.dev",
    turnstileSiteKey: local
      ? "1x00000000000000000000AA" // clave de prueba oficial de Cloudflare
      : "0x4AAAAAAFFBHHuLq8GXrbeU", // widget "cv-chatbot" (solo david-castilla-gomez.github.io)
    email: "davidcastillagomezcortazar@gmail.com",
    linkedin: "https://www.linkedin.com/in/david-castilla-gomez/",
  };
})();
