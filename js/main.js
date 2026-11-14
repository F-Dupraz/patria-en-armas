/* ============================================================
 * main.js — arranque, ajuste a la pantalla (PC, tablet y celular),
 * entrada (mouse, táctil y teclado) y bucle principal con
 * requestAnimationFrame.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD, UI = TD.UI, V = TD.View;
  var canvas, stage, ctx, scale = 1, last = 0;
  var rotated = false, cssW = TD.W, cssH = TD.H;

  // Por debajo de esta escala el diseño de 1280x720 queda ilegible: se pasa al modo compacto.
  var COMPACT_BELOW = 0.66;

  function isTouchDevice() {
    try { return !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches); }
    catch (e) { return false; }
  }

  // Calcula la vista y acomoda el canvas dentro de la zona segura (sin notch ni barras del sistema).
  //  · PC / tablet: 1280x720 con franjas, como siempre.
  //  · Celular: vista compacta de 480 de alto que aprovecha el ancho de la pantalla.
  //  · Dispositivo táctil en vertical: el juego se dibuja girado 90°, para jugarlo apaisado
  //    aunque el teléfono tenga la rotación bloqueada.
  function resize() {
    var cs = window.getComputedStyle(stage);
    var pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
    var pt = parseFloat(cs.paddingTop) || 0, pb = parseFloat(cs.paddingBottom) || 0;
    var sw = stage.clientWidth || window.innerWidth || TD.W, sh = stage.clientHeight || window.innerHeight || TD.H;
    var aw = Math.max(160, sw - pl - pr), ah = Math.max(90, sh - pt - pb);
    rotated = ah > aw && isTouchDevice();
    if (rotated) { var tmp = aw; aw = ah; ah = tmp; }

    var s = Math.min(aw / TD.W, ah / TD.H);
    V.compact = s < COMPACT_BELOW;
    if (V.compact) {
      V.h = TD.CH;
      V.w = Math.round(TD.clamp(TD.CH * aw / ah, TD.CW_MIN, TD.CW_MAX));
      s = Math.min(aw / V.w, ah / V.h);
    } else {
      V.w = TD.W; V.h = TD.H;
    }
    V.css = s;
    cssW = Math.max(160, Math.floor(V.w * s));
    cssH = Math.max(90, Math.floor(V.h * s));

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pw = Math.min(2560, Math.round(cssW * dpr)), ph = Math.round(pw * V.h / V.w);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    // centrado en la zona segura; girado, el centro no cambia
    canvas.style.left = Math.round(pl + (sw - pl - pr - cssW) / 2) + 'px';
    canvas.style.top = Math.round(pt + (sh - pt - pb - cssH) / 2) + 'px';
    canvas.style.transform = rotated ? 'rotate(90deg)' : 'none';
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    scale = pw / V.w;
  }

  // Posición del puntero en unidades de la vista (tiene en cuenta el giro de 90°).
  function toVirtual(ev) {
    var r = canvas.getBoundingClientRect();
    var dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
    var lx = rotated ? dy : dx, ly = rotated ? -dx : dy;
    return { x: (lx / (cssW || 1) + 0.5) * V.w, y: (ly / (cssH || 1) + 0.5) * V.h };
  }

  function frame(ts) {
    var dt = (ts - last) / 1000;
    last = ts;
    if (!(dt > 0)) dt = 0;
    if (dt > 0.05) dt = 0.05;            // si la pestaña estuvo oculta, no se "saltea" el juego
    try {
      UI.update(dt);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      UI.draw(ctx);
    } catch (e) {
      if (window.console && console.error) console.error(e);
    }
    window.requestAnimationFrame(frame);
  }

  function bindInput() {
    var hasPointer = !!window.PointerEvent;
    if (hasPointer) {
      canvas.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        var p = toVirtual(ev);
        V.touch = ev.pointerType === 'touch' || ev.pointerType === 'pen';
        UI.click(p.x, p.y);
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignorado */ }
      });
      canvas.addEventListener('pointermove', function (ev) {
        var p = toVirtual(ev);
        UI.move(p.x, p.y);
      });
      var out = function (ev) { if (ev.pointerType !== 'mouse' || ev.type === 'pointerleave') UI.move(-999, -999); };
      var up = function (ev) { UI.release(); out(ev); };
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
      canvas.addEventListener('pointerleave', out);
    } else {
      canvas.addEventListener('mousedown', function (ev) { var p = toVirtual(ev); V.touch = false; UI.click(p.x, p.y); });
      canvas.addEventListener('mousemove', function (ev) { var p = toVirtual(ev); UI.move(p.x, p.y); });
      canvas.addEventListener('touchstart', function (ev) {
        ev.preventDefault();
        if (ev.changedTouches && ev.changedTouches.length) {
          var p = toVirtual(ev.changedTouches[0]);
          V.touch = true;
          UI.click(p.x, p.y);
        }
      }, { passive: false });
      canvas.addEventListener('touchmove', function (ev) {
        ev.preventDefault();
        if (ev.changedTouches && ev.changedTouches.length) {
          var p = toVirtual(ev.changedTouches[0]);
          UI.move(p.x, p.y);
        }
      }, { passive: false });
      canvas.addEventListener('touchend', function () { UI.release(); UI.move(-999, -999); });
      window.addEventListener('mouseup', function () { UI.release(); });
    }
    canvas.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
    // Fuera del canvas (franjas): nada de zoom, selección ni "tirar para recargar"
    stage.addEventListener('touchmove', function (ev) { ev.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', function (ev) { ev.preventDefault(); });

    window.addEventListener('keydown', function (ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var k = ev.key === 'Spacebar' ? ' ' : (ev.key === 'Esc' ? 'Escape' : ev.key);
      if (k === ' ' || k === 'Escape') ev.preventDefault();
      if (ev.repeat) return;
      UI.key(k);
    });

    window.addEventListener('blur', function () { UI.release(); });
    window.addEventListener('pagehide', function () { TD.Logros.flush(); });
    // Al girar el teléfono algunos navegadores avisan antes de tener el tamaño nuevo: se reintenta.
    var later = function () { resize(); window.setTimeout(resize, 120); window.setTimeout(resize, 450); };
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', later);
    document.addEventListener('fullscreenchange', later);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    // Pausa automática si se oculta la pestaña en plena batalla
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) TD.Logros.flush();
      if (document.hidden && UI.screen === 'game' && UI.game && !UI.modal && UI.game.state === 'running') UI.togglePause();
    });
  }

  function start() {
    canvas = document.getElementById('game');
    stage = document.getElementById('stage');
    ctx = canvas.getContext('2d');
    UI.init();
    resize();
    bindInput();
    window.requestAnimationFrame(function (ts) { last = ts; window.requestAnimationFrame(frame); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
