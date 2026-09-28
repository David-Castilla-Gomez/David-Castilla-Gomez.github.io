// Modo integrado: la web principal abre chat.html?embed=1 dentro de un panel lateral.
// Va en el <head> para marcar el documento antes de pintar y que no parpadee la cabecera.
if (/[?&]embed=1(?:&|$)/.test(location.search)) {
  document.documentElement.classList.add("embedded");
}
