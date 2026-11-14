/* ============================================================
 * main.js — arranque, escalado a la ventana, entrada (mouse,
 * táctil y teclado) y bucle principal con requestAnimationFrame.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD, UI = TD.UI;
  var canvas, ctx, scale = 1, last = 0;

  // El juego se dibuja en 1280x720 virtuales y se ajusta a la ventana (16:9, con franjas).
  function resize() {
    var ww = window.innerWidth || TD.W, wh = window.innerHeight || TD.H;
    var s = Math.min(ww / TD.W, wh / TD.H);
    var cssW = Math.max(160, Math.floor(TD.W * s)), cssH = Math.max(90, Math.floor(TD.H * s));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pw = Math.min(2560, Math.round(cssW * dpr)), ph = Math.round(pw * TD.H / TD.W);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    scale = pw / TD.W;
  }

  function toVirtual(ev) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) / (r.width || 1) * TD.W,
      y: (ev.clientY - r.top) / (r.height || 1) * TD.H
    };
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
      canvas.addEventListener('mousedown', function (ev) { var p = toVirtual(ev); UI.click(p.x, p.y); });
      canvas.addEventListener('mousemove', function (ev) { var p = toVirtual(ev); UI.move(p.x, p.y); });
      canvas.addEventListener('touchstart', function (ev) {
        ev.preventDefault();
        if (ev.changedTouches && ev.changedTouches.length) {
          var p = toVirtual(ev.changedTouches[0]);
          UI.click(p.x, p.y);
        }
      }, { passive: false });
      canvas.addEventListener('touchend', function () { UI.release(); UI.move(-999, -999); });
      window.addEventListener('mouseup', function () { UI.release(); });
    }
    canvas.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

    window.addEventListener('keydown', function (ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var k = ev.key === 'Spacebar' ? ' ' : (ev.key === 'Esc' ? 'Escape' : ev.key);
      if (k === ' ' || k === 'Escape') ev.preventDefault();
      if (ev.repeat) return;
      UI.key(k);
    });

    window.addEventListener('blur', function () { UI.release(); });
    window.addEventListener('pagehide', function () { TD.Logros.flush(); });
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    // Pausa automática si se oculta la pestaña en plena batalla
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) TD.Logros.flush();
      if (document.hidden && UI.screen === 'game' && UI.game && !UI.modal && UI.game.state === 'running') UI.togglePause();
    });
  }

  function start() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    UI.init();
    resize();
    bindInput();
    window.requestAnimationFrame(function (ts) { last = ts; window.requestAnimationFrame(frame); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
