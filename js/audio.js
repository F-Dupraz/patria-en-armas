/* ============================================================
 * audio.js — efectos de sonido sintetizados con WebAudio
 * (sin archivos externos; si el navegador no lo soporta, calla)
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD;

  var A = { ctx: null, on: true, master: null, noiseBuf: null, last: {} };
  TD.Audio = A;

  // Se llama en el primer gesto del usuario (los navegadores lo exigen).
  A.init = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended' && A.ctx.resume) {
        try { A.ctx.resume(); } catch (e) { /* ignorado */ }
      }
      return;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.32;
      A.master.connect(A.ctx.destination);
      var len = Math.floor(A.ctx.sampleRate * 1.0);
      var buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      var d = buf.getChannelData(0), i;
      for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.noiseBuf = buf;
    } catch (e) {
      A.ctx = null;
    }
  };

  function tone(freq, dur, type, vol, slideTo, delay) {
    var c = A.ctx, t0 = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(A.master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  function noise(dur, vol, freq, type, delay, slideTo) {
    var c = A.ctx, t0 = c.currentTime + (delay || 0);
    var src = c.createBufferSource(); src.buffer = A.noiseBuf;
    var f = c.createBiquadFilter(); f.type = type || 'lowpass';
    f.frequency.setValueAtTime(freq || 1200, t0);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    var g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(A.master);
    src.start(t0); src.stop(t0 + dur + 0.03);
  }

  var S = {
    click: function () { tone(540, 0.05, 'square', 0.12, 400); },
    build: function () { noise(0.09, 0.4, 900, 'lowpass'); tone(180, 0.1, 'square', 0.18, 120); noise(0.09, 0.35, 900, 'lowpass', 0.11); tone(240, 0.1, 'square', 0.16, 150, 0.11); },
    upgrade: function () { tone(392, 0.09, 'triangle', 0.3); tone(494, 0.09, 'triangle', 0.3, 0, 0.09); tone(587, 0.16, 'triangle', 0.3, 0, 0.18); },
    sell: function () { tone(900, 0.06, 'triangle', 0.25, 1300); tone(1300, 0.1, 'triangle', 0.22, 1700, 0.06); },
    coin: function () { tone(1250, 0.05, 'triangle', 0.12, 1700); },
    shot: function () { noise(0.07, 0.4, 2600, 'highpass'); noise(0.12, 0.25, 700, 'lowpass'); },
    cannon: function () { noise(0.4, 0.9, 500, 'lowpass', 0, 80); tone(90, 0.3, 'sine', 0.6, 38); },
    boom: function () { noise(0.3, 0.6, 800, 'lowpass', 0, 100); },
    bola: function () { tone(320, 0.12, 'sine', 0.14, 620); },
    hit: function () { noise(0.05, 0.25, 1500, 'bandpass'); },
    slash: function () { noise(0.1, 0.3, 3200, 'highpass', 0, 900); },
    wave: function () { tone(294, 0.16, 'sawtooth', 0.16); tone(392, 0.16, 'sawtooth', 0.16, 0, 0.17); tone(294, 0.16, 'sawtooth', 0.16, 0, 0.34); tone(392, 0.3, 'sawtooth', 0.16, 0, 0.51); },
    horn: function () { tone(196, 0.5, 'sawtooth', 0.2, 185); tone(147, 0.6, 'sawtooth', 0.16, 139, 0.1); },
    ability: function () { tone(330, 0.1, 'sawtooth', 0.2, 660); noise(0.25, 0.3, 2000, 'bandpass', 0.05); },
    life: function () { tone(220, 0.2, 'square', 0.22, 110); },
    levelup: function () { tone(523, 0.1, 'triangle', 0.3); tone(659, 0.1, 'triangle', 0.3, 0, 0.1); tone(784, 0.1, 'triangle', 0.3, 0, 0.2); tone(1047, 0.25, 'triangle', 0.3, 0, 0.3); },
    win: function () {
      var n = [392, 392, 523, 659, 523, 659, 784], i;
      for (i = 0; i < n.length; i++) tone(n[i], i === n.length - 1 ? 0.5 : 0.14, 'triangle', 0.32, 0, i * 0.15);
    },
    lose: function () { tone(330, 0.3, 'triangle', 0.3, 300); tone(262, 0.3, 'triangle', 0.3, 240, 0.3); tone(196, 0.7, 'triangle', 0.3, 160, 0.6); },
    disabled: function () { noise(0.3, 0.4, 600, 'lowpass', 0, 120); tone(140, 0.25, 'square', 0.15, 70); },
    splash: function () { noise(0.3, 0.3, 1800, 'bandpass', 0, 500); }
  };

  A.play = function (name) {
    if (!A.on || !A.ctx || !S[name]) return;
    try {
      var now = A.ctx.currentTime;
      if (A.last[name] && now - A.last[name] < 0.06) return;   // evita saturar con el mismo sonido
      A.last[name] = now;
      S[name]();
    } catch (e) { /* ignorado */ }
  };

  A.setOn = function (v) {
    A.on = !!v;
    TD.Save.data.sound = A.on;
    TD.Save.save();
  };
})();
