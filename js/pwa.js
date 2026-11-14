/* ============================================================
 * pwa.js — el juego como aplicación instalable:
 * registro del service worker (para jugar sin conexión),
 * botón «Instalar» y pantalla completa.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD, P = {};
  TD.PWA = P;

  var nav = window.navigator || {}, doc = document, root = doc.documentElement;
  var deferred = null;        // aviso de instalación que el navegador nos deja disparar cuando queramos

  function mm(q) {
    try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; }
  }

  // iPhone / iPad (el iPad moderno se presenta como Mac con pantalla táctil)
  P.ios = /iPad|iPhone|iPod/.test(nav.userAgent || '') || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);

  // ¿Ya está corriendo como aplicación instalada?
  P.standalone = function () {
    return !!nav.standalone || mm('(display-mode: standalone)') || (mm('(display-mode: fullscreen)') && !P.isFullscreen());
  };

  /* ---------------- instalar ---------------- */
  // Chrome, Edge y compañía avisan con este evento; lo guardamos para ofrecerlo desde el menú.
  window.addEventListener('beforeinstallprompt', function (ev) {
    ev.preventDefault();
    deferred = ev;
  });
  window.addEventListener('appinstalled', function () { deferred = null; });

  // En iOS no hay aviso: se instala a mano desde «Compartir», y el juego explica cómo.
  P.canInstall = function () { return !!deferred || (P.ios && !P.standalone()); };

  P.install = function () {
    if (deferred) {
      var d = deferred;
      deferred = null;                 // cada aviso sirve una sola vez
      try { d.prompt(); } catch (e) { /* ignorado */ }
    } else if (P.ios) {
      TD.UI.iosHelp = true;
    }
  };

  /* ---------------- pantalla completa ---------------- */
  P.isFullscreen = function () { return !!(doc.fullscreenElement || doc.webkitFullscreenElement); };

  P.canFullscreen = function () {
    var ok = (doc.fullscreenEnabled || doc.webkitFullscreenEnabled) && (root.requestFullscreen || root.webkitRequestFullscreen);
    return !!ok && (P.isFullscreen() || !P.standalone());
  };

  P.toggleFullscreen = function () {
    try {
      if (P.isFullscreen()) {
        (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
        return;
      }
      var r = (root.requestFullscreen || root.webkitRequestFullscreen).call(root, { navigationUI: 'hide' });
      // en celulares, además se fija el juego apaisado (donde el sistema lo permite)
      var lock = function () {
        try {
          var o = window.screen && window.screen.orientation;
          if (o && o.lock) o.lock('landscape').catch(function () { /* no se puede: el juego se gira solo */ });
        } catch (e) { /* ignorado */ }
      };
      if (r && r.then) r.then(lock, function () { /* rechazado */ }); else lock();
    } catch (e) { /* ignorado */ }
  };

  /* ---------------- service worker ---------------- */
  // Solo por http(s): abriendo index.html con doble clic no hay service worker, y no hace falta.
  if ('serviceWorker' in nav && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener('load', function () {
      nav.serviceWorker.register('sw.js').catch(function () { /* sin modo sin conexión */ });
    });
  }
})();
