/* ============================================================
 * audio.js — efectos y música sintetizados con WebAudio
 * (sin archivos externos; si el navegador no lo soporta, calla)
 *
 * Rutas de señal:
 *   efectos ─► A.sfx ───────────────┐
 *   música  ─► pista ─► A.musBus ─► A.musFilter ─┤► master ─► limitador ─► salida
 *
 * La música es un secuenciador por pasos (lookahead): cada pista
 * define cuánto dura un paso y qué notas suenan en cada uno, según
 * la intensidad del momento (0 calma, 1 oleada, 2 jefe).
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD;

  var A = {
    ctx: null, on: true, music: true,
    master: null, sfx: null, musBus: null, musFilter: null, noiseBuf: null,
    last: {}, want: null, sfxVol: 1, musVol: 1
  };
  TD.Audio = A;

  var MUSIC_VOL = 0.42;        // nivel de la música respecto de los efectos
  var M = { cur: null, timer: null, lvl: 0, downAt: 0, muffled: false };

  // Los volúmenes (0-1) se aplican al cuadrado: el oído percibe mejor ese reparto.
  function musLevel() { return MUSIC_VOL * A.musVol * A.musVol * (M.muffled ? 0.6 : 1); }

  /* ---------- arranque ---------- */

  // Arma la cadena de audio sobre un contexto (también lo usan las pruebas offline).
  A.build = function (ctx) {
    A.ctx = ctx;
    var comp = ctx.createDynamicsCompressor();       // limitador suave: evita saturar al sumar música y efectos
    comp.threshold.value = -12; comp.knee.value = 10; comp.ratio.value = 8;
    comp.attack.value = 0.004; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    A.master = ctx.createGain(); A.master.gain.value = 0.32; A.master.connect(comp);
    A.sfx = ctx.createGain(); A.sfx.gain.value = A.sfxVol * A.sfxVol; A.sfx.connect(A.master);
    A.musFilter = ctx.createBiquadFilter(); A.musFilter.type = 'lowpass';
    A.musFilter.frequency.value = 20000; A.musFilter.connect(A.master);
    A.musBus = ctx.createGain(); A.musBus.gain.value = musLevel(); A.musBus.connect(A.musFilter);
    var len = Math.floor(ctx.sampleRate * 2.0);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0), i;
    for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noiseBuf = buf;
  };

  // Se llama en el primer gesto del usuario (los navegadores lo exigen).
  A.init = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended' && A.ctx.resume && !document.hidden) {
        try { A.ctx.resume(); } catch (e) { /* ignorado */ }
      }
      return;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      A.build(new AC());
      M.timer = window.setInterval(function () { A.tick(0.8); }, 90);
      // Sin pestaña visible no hay música de fondo
      document.addEventListener('visibilitychange', function () {
        if (!A.ctx) return;
        try {
          if (document.hidden) A.ctx.suspend(); else A.ctx.resume();
        } catch (e) { /* ignorado */ }
      });
      applyTrack();
    } catch (e) {
      A.ctx = null;
    }
  };

  /* ---------- síntesis básica ---------- */

  // Núcleo de un tono simple (destino explícito).
  function tn(dest, t0, freq, dur, type, vol, slideTo) {
    var c = A.ctx;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  // Núcleo de un golpe de ruido filtrado.
  function nz(dest, t0, dur, vol, freq, type, slideTo, q) {
    var c = A.ctx;
    var src = c.createBufferSource(); src.buffer = A.noiseBuf;
    var f = c.createBiquadFilter(); f.type = type || 'lowpass';
    f.frequency.setValueAtTime(freq || 1200, t0);
    if (q) f.Q.value = q;
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    var g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.03);
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    tn(A.sfx, A.ctx.currentTime + (delay || 0), freq, dur, type, vol, slideTo);
  }

  function noise(dur, vol, freq, type, delay, slideTo) {
    nz(A.sfx, A.ctx.currentTime + (delay || 0), dur, vol, freq, type, slideTo);
  }

  /* Nota con cuerpo: envolvente, filtro pasabajos que "abre", vibrato y
   * voces desafinadas (unison). Sirve para metales, flauta, cuerdas y guitarra.
   * o: type, vol, a (ataque), r (caída), sus, pluck, lp, lpEnd, lpT, q, vib, vibDelay, det */
  function mnote(dest, f, t, dur, o) {
    var c = A.ctx, a = o.a || 0.01, r = o.r || 0.08, vol = o.vol || 0.1;
    var sus = o.sus == null ? 0.7 : o.sus, end, g = c.createGain(), head = g, flt, i, voices, osc, lfo, lg;
    if (dur < a + 0.02) dur = a + 0.02;
    end = t + dur + (o.pluck ? 0 : r);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (o.pluck) {
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    } else {
      g.gain.linearRampToValueAtTime(vol * sus, t + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
    }
    g.connect(dest);
    if (o.lp) {
      flt = c.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = o.q || 0.7;
      flt.frequency.setValueAtTime(o.lp, t);
      if (o.lpEnd) flt.frequency.exponentialRampToValueAtTime(o.lpEnd, t + (o.lpT || dur));
      flt.connect(g); head = flt;
    }
    voices = o.det ? [-o.det, o.det] : [0];
    for (i = 0; i < voices.length; i++) {
      osc = c.createOscillator();
      osc.type = o.type || 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.detune.value = voices[i];
      if (o.vib) {
        lfo = c.createOscillator(); lg = c.createGain();
        lfo.frequency.value = 5.2; lg.gain.value = o.vib;
        lfo.connect(lg); lg.connect(osc.detune);
        lfo.start(t + (o.vibDelay || 0)); lfo.stop(end + 0.05);
      }
      osc.connect(head);
      osc.start(t); osc.stop(end + 0.05);
    }
  }

  function mtof(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  /* ---------- percusión (sirve para música y efectos) ---------- */
  function kick(d, t, v) { tn(d, t, 150, 0.2, 'sine', v, 42); nz(d, t, 0.03, v * 0.5, 2500, 'lowpass'); }
  function bombo(d, t, v) { tn(d, t, 120, 0.34, 'sine', v, 52); nz(d, t, 0.05, v * 0.4, 600, 'lowpass'); }
  function snare(d, t, v) { nz(d, t, 0.13, v, 1900, 'bandpass', 900, 0.8); tn(d, t, 200, 0.07, 'triangle', v * 0.5, 140); }
  function hat(d, t, v) { nz(d, t, 0.04, v, 7500, 'highpass'); }
  function tick(d, t, v) { tn(d, t, 1700, 0.03, 'square', v, 1100); }
  function timpani(d, t, v) { tn(d, t, 110, 0.55, 'sine', v, 60); nz(d, t, 0.06, v * 0.4, 400, 'lowpass'); }

  // Redoble: golpes de caja cada vez más fuertes
  function roll(d, t, dur, v0, v1) {
    var n = Math.floor(dur / 0.04), i;
    for (i = 0; i < n; i++) nz(d, t + i * 0.04, 0.07, v0 + (v1 - v0) * i / n, 2200, 'bandpass', 1400, 0.7);
  }

  // Toque de corneta: lista de [frecuencia, duración, demora]
  function bugle(notes, vol, lp) {
    var t0 = A.ctx.currentTime, i, n;
    for (i = 0; i < notes.length; i++) {
      n = notes[i];
      mnote(A.sfx, n[0], t0 + n[2], n[1], { type: 'sawtooth', vol: vol, a: 0.02, r: 0.12, sus: 0.8, det: 7, lp: lp * 0.35, lpEnd: lp, lpT: 0.08, q: 1.2 });
    }
  }

  /* ---------- efectos ---------- */
  var S = {
    click: function () { tone(540, 0.05, 'square', 0.12, 400); },
    pause: function () { tone(330, 0.09, 'triangle', 0.22, 210); },
    resume: function () { tone(260, 0.09, 'triangle', 0.22, 420); },
    build: function () { noise(0.09, 0.4, 900, 'lowpass'); tone(180, 0.1, 'square', 0.18, 120); noise(0.09, 0.35, 900, 'lowpass', 0.11); tone(240, 0.1, 'square', 0.16, 150, 0.11); },
    upgrade: function () { tone(392, 0.09, 'triangle', 0.3); tone(494, 0.09, 'triangle', 0.3, 0, 0.09); tone(587, 0.16, 'triangle', 0.3, 0, 0.18); },
    sell: function () { tone(900, 0.06, 'triangle', 0.25, 1300); tone(1300, 0.1, 'triangle', 0.22, 1700, 0.06); },
    coin: function () { tone(1250, 0.05, 'triangle', 0.12, 1700); },
    deny: function () { tone(190, 0.09, 'square', 0.18, 130); tone(150, 0.13, 'square', 0.18, 100, 0.1); },
    ready: function () { tone(880, 0.07, 'sine', 0.2); tone(1320, 0.16, 'sine', 0.2, 0, 0.07); },
    die: function () { noise(0.07, 0.28, 700, 'lowpass', 0, 200); tone(170, 0.09, 'triangle', 0.16, 80); },
    shot: function () { noise(0.07, 0.4, 2600, 'highpass'); noise(0.12, 0.25, 700, 'lowpass'); },
    cannon: function () { noise(0.4, 0.9, 500, 'lowpass', 0, 80); tone(90, 0.3, 'sine', 0.6, 38); },
    boom: function () { noise(0.3, 0.6, 800, 'lowpass', 0, 100); },
    bola: function () { tone(320, 0.12, 'sine', 0.14, 620); },
    hit: function () { noise(0.05, 0.25, 1500, 'bandpass'); },
    slash: function () { noise(0.1, 0.3, 3200, 'highpass', 0, 900); },
    horn: function () { tone(196, 0.5, 'sawtooth', 0.2, 185); tone(147, 0.6, 'sawtooth', 0.16, 139, 0.1); },
    ability: function () { tone(330, 0.1, 'sawtooth', 0.2, 660); noise(0.25, 0.3, 2000, 'bandpass', 0.05); },
    life: function () { tone(220, 0.2, 'square', 0.22, 110); },
    alarm: function () {          // quedan pocas vidas: sirena corta
      tone(660, 0.11, 'square', 0.2); tone(440, 0.11, 'square', 0.2, 0, 0.13);
      tone(660, 0.11, 'square', 0.2, 0, 0.26); tone(220, 0.25, 'square', 0.22, 110, 0.4);
    },
    levelup: function () { tone(523, 0.1, 'triangle', 0.3); tone(659, 0.1, 'triangle', 0.3, 0, 0.1); tone(784, 0.1, 'triangle', 0.3, 0, 0.2); tone(1047, 0.25, 'triangle', 0.3, 0, 0.3); },
    splash: function () { noise(0.3, 0.3, 1800, 'bandpass', 0, 500); },

    // Inicio de oleada: redoble de caja y toque de corneta
    wave: function () {
      var t0 = A.ctx.currentTime;
      roll(A.sfx, t0, 0.52, 0.06, 0.3);
      bugle([[392, 0.1, 0.0], [392, 0.1, 0.13], [523, 0.12, 0.26], [659, 0.12, 0.4], [784, 0.42, 0.54]], 0.15, 2600);
      timpani(A.sfx, t0 + 0.54, 0.5);
    },
    // Última oleada: más grave, más larga y con cañonazo
    wavefinal: function () {
      var t0 = A.ctx.currentTime;
      roll(A.sfx, t0, 0.8, 0.06, 0.38);
      bugle([[392, 0.1, 0.0], [392, 0.1, 0.13], [523, 0.1, 0.26], [523, 0.1, 0.39], [659, 0.12, 0.52], [784, 0.12, 0.66], [1047, 0.65, 0.8]], 0.16, 3000);
      bugle([[196, 0.5, 0.8], [262, 0.5, 0.8]], 0.12, 1400);
      timpani(A.sfx, t0 + 0.8, 0.7);
      nz(A.sfx, t0 + 0.8, 0.5, 0.7, 500, 'lowpass', 80);
    },
    // Oleada superada
    waveclear: function () {
      tone(523, 0.14, 'triangle', 0.24); tone(659, 0.14, 'triangle', 0.24, 0, 0.08);
      tone(784, 0.14, 'triangle', 0.24, 0, 0.16); tone(1047, 0.32, 'triangle', 0.26, 0, 0.24);
      tone(2093, 0.2, 'sine', 0.07, 0, 0.26);
    },
    // Entra un jefe: bocinazos graves y cañón
    boss: function () {
      var t0 = A.ctx.currentTime;
      mnote(A.sfx, 98, t0, 0.9, { type: 'sawtooth', vol: 0.3, a: 0.06, r: 0.3, sus: 0.8, det: 9, lp: 700, lpEnd: 260, lpT: 0.9 });
      mnote(A.sfx, 73.4, t0 + 0.6, 1.1, { type: 'sawtooth', vol: 0.3, a: 0.06, r: 0.4, sus: 0.8, det: 9, lp: 700, lpEnd: 220, lpT: 1.1 });
      nz(A.sfx, t0, 1.6, 0.5, 220, 'lowpass', 60);
      timpani(A.sfx, t0, 0.8); timpani(A.sfx, t0 + 0.6, 0.8);
    },
    star: function (i) {
      var f = [784, 988, 1319][i || 0] || 784;
      tone(f, 0.4, 'triangle', 0.3); tone(f * 2, 0.3, 'sine', 0.1, 0, 0.02);
      noise(0.2, 0.12, 6000, 'highpass');
    },
    win: function () {
      var t0 = A.ctx.currentTime, n = [392, 392, 523, 659, 523, 659, 784], i;
      for (i = 0; i < n.length; i++) {
        mnote(A.sfx, n[i], t0 + i * 0.15, i === n.length - 1 ? 0.9 : 0.14, { type: 'sawtooth', vol: 0.15, a: 0.02, r: 0.15, sus: 0.8, det: 7, lp: 900, lpEnd: 3000, lpT: 0.08, q: 1.2 });
      }
      bugle([[523, 1.0, 0.9], [659, 1.0, 0.9], [1047, 1.0, 0.9]], 0.08, 2600);
      timpani(A.sfx, t0 + 0.9, 0.6);
      roll(A.sfx, t0 + 0.55, 0.35, 0.05, 0.2);
    },
    lose: function () {
      var t0 = A.ctx.currentTime, n = [330, 294, 262, 196], d = [0, 0.4, 0.8, 1.2], i;
      for (i = 0; i < n.length; i++) {
        mnote(A.sfx, n[i], t0 + d[i], i === 3 ? 1.1 : 0.34, { type: 'sawtooth', vol: 0.15, a: 0.04, r: 0.2, sus: 0.8, det: 8, lp: 1500, lpEnd: 500, lpT: 0.4 });
        timpani(A.sfx, t0 + d[i], 0.45);
      }
    },
    disabled: function () { noise(0.3, 0.4, 600, 'lowpass', 0, 120); tone(140, 0.25, 'square', 0.15, 70); }
  };

  A.play = function (name, arg) {
    if (!A.on || !A.ctx || !S[name]) return;
    try {
      var now = A.ctx.currentTime;
      if (A.last[name] && now - A.last[name] < 0.06) return;   // evita saturar con el mismo sonido
      A.last[name] = now;
      S[name](arg);
    } catch (e) { /* ignorado */ }
  };

  /* ============================================================
   * MÚSICA
   * ============================================================ */

  /* ---- Pista «menú»: zamba lenta en La menor (6/8) -----------
   * Bombo legüero, bajo, arpegio de guitarra, colchón de cuerdas
   * y una melodía de flauta. 16 compases que se repiten.        */
  var MC = {
    Am: { b: 45, t: [57, 60, 64] }, G: { b: 43, t: [55, 59, 62] }, F: { b: 41, t: [53, 57, 60] },
    E: { b: 40, t: [52, 56, 59] }, C: { b: 48, t: [55, 60, 64] }, Dm: { b: 50, t: [57, 62, 65] }
  };
  var MENU_PROG = 'Am G F E Am G F E C G Dm Am F G Am E'.split(' ');
  // Melodía: por compás, lista plana de [paso(0-5), nota MIDI, duración en pasos]
  var MENU_MEL = [
    [0, 76, 3, 3, 74, 1, 4, 72, 1, 5, 71, 1],
    [0, 74, 3, 3, 71, 2, 5, 74, 1],
    [0, 72, 3, 3, 69, 3],
    [0, 68, 3, 3, 71, 2, 5, 68, 1],
    [0, 76, 2, 2, 72, 1, 3, 69, 3],
    [0, 71, 2, 2, 74, 1, 3, 79, 2, 5, 74, 1],
    [0, 77, 3, 3, 76, 1, 4, 72, 1, 5, 69, 1],
    [0, 68, 2, 2, 71, 1, 3, 76, 3],
    [0, 79, 3, 3, 76, 3],
    [0, 74, 3, 3, 71, 3],
    [0, 77, 3, 3, 74, 2, 5, 72, 1],
    [0, 76, 6],
    [0, 72, 2, 2, 74, 1, 3, 77, 3],
    [0, 79, 2, 2, 77, 1, 3, 74, 3],
    [0, 72, 2, 2, 76, 1, 3, 81, 3],
    [0, 80, 3, 3, 76, 2, 5, 71, 1]
  ];
  var MENU_ARP = [0, 1, 2, 1, 2, 1];

  var MENU = {
    stepDur: 0.205, len: 96,
    step: function (s, t, d) {
      var sd = MENU.stepDur, bar = Math.floor(s / 6), p = s % 6, ch = MC[MENU_PROG[bar]], m = MENU_MEL[bar], i;
      // bombo legüero y aro
      if (p === 0) bombo(d, t, 0.5); else if (p === 3) bombo(d, t, 0.3);
      if (p === 2 || p === 5) tick(d, t, 0.035);
      // bajo
      if (p === 0) mnote(d, mtof(ch.b), t, 3 * sd, { type: 'triangle', vol: 0.3, a: 0.01, r: 0.15, sus: 0.6, lp: 600 });
      if (p === 3) mnote(d, mtof(ch.b + 7), t, 2.6 * sd, { type: 'triangle', vol: 0.22, a: 0.01, r: 0.15, sus: 0.6, lp: 600 });
      // guitarra: arpegio punteado
      mnote(d, mtof(ch.t[MENU_ARP[p]] + (p === 3 ? 12 : 0)), t, 0.5, { type: 'sawtooth', vol: p === 0 ? 0.075 : 0.055, pluck: true, a: 0.004, lp: 2800, lpEnd: 500, lpT: 0.3 });
      // cuerdas: un acorde largo cada dos compases
      if (p === 0 && bar % 2 === 0) {
        for (i = 0; i < 3; i++) mnote(d, mtof(ch.t[i]), t, 12 * sd, { type: 'sawtooth', vol: 0.03, a: 0.7, r: 0.9, sus: 1, det: 6, lp: 1300 });
      }
      // melodía de flauta
      for (i = 0; i < m.length; i += 3) {
        if (m[i] === p) mnote(d, mtof(m[i + 1]), t, m[i + 2] * sd * 0.96, { type: 'triangle', vol: 0.14, a: 0.05, r: 0.2, sus: 0.8, vib: 14, vibDelay: 0.18, lp: 3600 });
      }
    }
  };

  /* ---- Pista «batalla»: marcha en Re menor (4/4, 128 bpm) -----
   * Redoblante y bombo de marcha, bajo, metales y fife.
   * Intensidad 0 (preparación): suave, solo flauta y bajo lento.
   * Intensidad 1 (oleada): marcha completa.
   * Intensidad 2 (jefe): todo lo anterior + bombo en negras y fife.  */
  var BC = {
    Dm: { b: 38, t: [62, 65, 69] }, Bb: { b: 46, t: [58, 62, 65] }, C: { b: 48, t: [60, 64, 67] },
    A: { b: 45, t: [57, 61, 64] }, Gm: { b: 43, t: [58, 62, 67] }
  };
  var BATTLE_PROG = 'Dm Bb C A Dm Bb C A Gm Dm Bb A Gm Dm A A'.split(' ');
  // Melodía: por compás, lista plana de [paso(0-15), nota MIDI, duración en pasos]
  var BATTLE_MEL = [
    [0, 74, 2, 2, 77, 2, 4, 81, 4, 8, 77, 2, 10, 74, 2, 12, 77, 4],
    [0, 74, 2, 2, 77, 2, 4, 82, 4, 8, 79, 2, 10, 77, 2, 12, 74, 4],
    [0, 72, 2, 2, 76, 2, 4, 79, 4, 8, 76, 2, 10, 72, 2, 12, 76, 4],
    [0, 73, 2, 2, 76, 2, 4, 81, 4, 8, 76, 2, 10, 73, 2, 12, 76, 4],
    [0, 81, 6, 6, 79, 2, 8, 77, 4, 12, 74, 4],
    [0, 82, 6, 6, 81, 2, 8, 79, 4, 12, 77, 4],
    [0, 79, 4, 4, 76, 4, 8, 72, 4, 12, 76, 2, 14, 79, 2],
    [0, 81, 4, 4, 76, 4, 8, 73, 4, 12, 76, 4],
    [0, 74, 2, 2, 70, 2, 4, 74, 4, 8, 79, 4, 12, 77, 2, 14, 74, 2],
    [0, 77, 2, 2, 74, 2, 4, 77, 4, 8, 81, 4, 12, 79, 2, 14, 77, 2],
    [0, 82, 4, 4, 79, 4, 8, 77, 4, 12, 74, 4],
    [0, 76, 4, 4, 73, 4, 8, 69, 4, 12, 73, 2, 14, 76, 2],
    [0, 74, 2, 2, 70, 2, 4, 74, 4, 8, 79, 4, 12, 77, 2, 14, 74, 2],
    [0, 77, 2, 2, 74, 2, 4, 77, 4, 8, 81, 4, 12, 79, 2, 14, 77, 2],
    [0, 81, 2, 2, 76, 2, 4, 73, 2, 6, 76, 2, 8, 81, 4, 12, 81, 4],
    [0, 76, 6, 6, 73, 2]
  ];
  var BASS_OFF = [0, 0, 12, 0, 0, 0, 12, 7];

  var BATTLE = {
    stepDur: 60 / 128 / 4, len: 256,
    step: function (s, t, d, L) {
      var sd = BATTLE.stepDur, bar = Math.floor(s / 16), p = s % 16, ch = BC[BATTLE_PROG[bar]], m = BATTLE_MEL[bar], i, f;
      // percusión
      if (L === 0) {
        if (p === 0) kick(d, t, 0.3);
      } else {
        if (p === 0 || p === 8) kick(d, t, 0.55);
        if (p === 10) kick(d, t, 0.38);
        if (L >= 2 && (p === 4 || p === 12)) kick(d, t, 0.45);
        if (p === 4 || p === 12) snare(d, t, 0.34);
        if (p === 3 || p === 11 || p === 14 || p === 15) snare(d, t, 0.1);
        if (L >= 2 && (p === 2 || p === 6 || p === 10)) snare(d, t, 0.12);
        if (p % 4 === 2) hat(d, t, L >= 2 ? 0.07 : 0.045);
        if (L >= 2 && p % 2 === 1) hat(d, t, 0.03);
        if (bar === 15 && p >= 8) snare(d, t, 0.1 + (p - 8) * 0.06);        // redoble que empuja al próximo ciclo
      }
      // bajo
      if (L === 0) {
        if (p % 4 === 0) mnote(d, mtof(ch.b), t, 4 * sd * 0.9, { type: 'triangle', vol: 0.22, a: 0.01, r: 0.1, sus: 0.7, lp: 500 });
      } else if (p % 2 === 0) {
        f = mtof(ch.b + BASS_OFF[p / 2]);
        mnote(d, f, t, 2 * sd * 0.85, { type: 'sawtooth', vol: 0.15, a: 0.005, r: 0.05, sus: 0.8, lp: 700, lpEnd: 350, lpT: 0.12 });
      }
      // colchón de cuerdas
      if (p === 0) {
        for (i = 0; i < 3; i++) mnote(d, mtof(ch.t[i] - 12), t, 15 * sd, { type: 'sawtooth', vol: L === 0 ? 0.035 : 0.024, a: 0.25, r: 0.4, sus: 1, det: 6, lp: 1000 });
      }
      // melodía: flauta suave en calma, metales con la oleada, fife en el jefe
      for (i = 0; i < m.length; i += 3) {
        if (m[i] !== p) continue;
        f = mtof(m[i + 1]);
        if (L === 0) {
          mnote(d, f, t, m[i + 2] * sd * 0.95, { type: 'triangle', vol: 0.09, a: 0.04, r: 0.15, sus: 0.8, vib: 12, vibDelay: 0.15, lp: 3200 });
        } else {
          mnote(d, f, t, m[i + 2] * sd * 0.92, { type: 'sawtooth', vol: 0.085, a: 0.015, r: 0.08, sus: 0.8, det: 7, lp: 900, lpEnd: 2800, lpT: 0.07, q: 1.1 });
          if (L >= 2) mnote(d, f * 2, t, m[i + 2] * sd * 0.8, { type: 'square', vol: 0.022, a: 0.01, r: 0.05, sus: 0.8, lp: 5200 });
        }
      }
    }
  };

  var TRACKS = { menu: MENU, battle: BATTLE };

  /* ---------- control del secuenciador ---------- */

  function fadeOut(tk, secs) {
    var g = tk.out.gain, now = A.ctx.currentTime;
    tk.dead = true;
    try {
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0.0001, now + secs);
    } catch (e) { /* ignorado */ }
    window.setTimeout(function () { try { tk.out.disconnect(); } catch (e) { /* ignorado */ } }, secs * 1000 + 2500);
  }

  function startTrack(name, fade) {
    var c = A.ctx, now = c.currentTime, g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(1, now + fade);
    g.connect(A.musBus);
    M.cur = { name: name, def: TRACKS[name], out: g, step: 0, nextT: now + 0.08, dead: false };
  }

  // Compara la pista pedida con la que suena y hace el cambio con fundido.
  function applyTrack() {
    if (!A.ctx) return;
    var want = (A.on && A.music && TRACKS[A.want]) ? A.want : null;
    var have = M.cur ? M.cur.name : null;
    if (want === have) return;
    var quick = !(A.on && A.music);
    if (M.cur) fadeOut(M.cur, quick ? 0.25 : (want ? 0.9 : 1.4));
    M.cur = null;
    if (want) {
      startTrack(want, 1.0);
      M.lvl = 0; M.downAt = 0;
    }
    A.tick(0.8);
  }

  // Agenda los pasos que caen dentro de la ventana (h segundos hacia adelante).
  A.tick = function (h) {
    var tk = M.cur;
    if (!A.ctx || !tk) return;
    var now = A.ctx.currentTime, lim = now + (h || 0.8);
    if (tk.nextT < now - 0.05) tk.nextT = now + 0.05;             // tras una suspensión, no recupera lo perdido
    while (tk.nextT < lim) {
      tk.def.step(tk.step % tk.def.len, tk.nextT, tk.out, M.lvl);
      tk.step++;
      tk.nextT += tk.def.stepDur;
    }
  };

  // Qué pista debería sonar ahora ('menu', 'battle' o null para silencio).
  A.setTrack = function (name) {
    if (A.want === name) return;
    A.want = name;
    applyTrack();
  };

  // 0 = calma, 1 = oleada en curso, 2 = jefe. Sube de inmediato, baja tras unos segundos.
  A.setIntensity = function (v) {
    var now = Date.now() / 1000;
    if (v >= M.lvl) { M.lvl = v; M.downAt = 0; }
    else if (!M.downAt) M.downAt = now + 4;
    else if (now >= M.downAt) { M.lvl = v; M.downAt = 0; }
  };

  // En pausa la música queda amortiguada y más baja.
  A.setMuffle = function (on) {
    on = !!on;
    if (!A.ctx || M.muffled === on) return;
    M.muffled = on;
    var now = A.ctx.currentTime;
    A.musFilter.frequency.setTargetAtTime(on ? 650 : 20000, now, 0.08);
    A.musBus.gain.setTargetAtTime(musLevel(), now, 0.1);
  };

  /* ---------- opciones ---------- */
  A.setOn = function (v) {
    A.on = !!v;
    TD.Save.data.sound = A.on;
    TD.Save.save();
    applyTrack();
  };

  A.setMusic = function (v) {
    A.music = !!v;
    TD.Save.data.music = A.music;
    TD.Save.save();
    applyTrack();
  };

  // Volumen de efectos y de música (0 a 1). Suenan al instante; se guardan con A.saveVolumes().
  A.setSfxVol = function (v) {
    A.sfxVol = Math.max(0, Math.min(1, v));
    TD.Save.data.sfxVol = A.sfxVol;
    if (A.ctx) A.sfx.gain.setTargetAtTime(A.sfxVol * A.sfxVol, A.ctx.currentTime, 0.02);
  };
  A.setMusicVol = function (v) {
    A.musVol = Math.max(0, Math.min(1, v));
    TD.Save.data.musicVol = A.musVol;
    if (A.ctx) A.musBus.gain.setTargetAtTime(musLevel(), A.ctx.currentTime, 0.03);
  };
  A.saveVolumes = function () { TD.Save.save(); };

  // Relee las opciones guardadas (al arrancar y al borrar el progreso).
  A.sync = function () {
    var d = TD.Save.data;
    A.on = d.sound;
    A.music = d.music !== false;
    A.sfxVol = typeof d.sfxVol === 'number' ? d.sfxVol : 1;
    A.musVol = typeof d.musicVol === 'number' ? d.musicVol : 1;
    if (A.ctx) {
      A.sfx.gain.value = A.sfxVol * A.sfxVol;
      A.musBus.gain.value = musLevel();
    }
    applyTrack();
  };
})();
