/* ============================================================
 * util.js — espacio de nombres, matemática, caminos y guardado
 * ============================================================ */
(function () {
  'use strict';

  var TD = {};
  window.TD = TD;

  // Resolución virtual: todo el juego se dibuja en 1280x720 y se escala a la ventana.
  TD.W = 1280;
  TD.H = 720;
  TD.TOP_H = 44;     // alto de la barra superior del HUD
  TD.BAR_Y = 640;    // comienzo de la barra inferior del HUD

  TD.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  TD.lerp = function (a, b, t) { return a + (b - a) * t; };
  TD.dist = function (ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  };
  TD.rand = function (a, b) { return a + Math.random() * (b - a); };
  TD.pick = function (arr) { return arr[(Math.random() * arr.length) | 0]; };

  // Generador pseudoaleatorio con semilla (para decorados siempre iguales).
  TD.rng = function (seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };

  TD.merge = function (a, b) {
    var o = {}, k;
    for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) o[k] = a[k];
    if (b) for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) o[k] = b[k];
    return o;
  };

  /* ---------- Suavizado Catmull-Rom de una lista de waypoints ---------- */
  TD.smooth = function (pts, seg) {
    seg = seg || 12;
    var out = [], i, j;
    function cr(a, b, c, d, t) {
      var t2 = t * t, t3 = t2 * t;
      return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    }
    for (i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      for (j = 0; j < seg; j++) {
        var t = j / seg;
        out.push([cr(p0[0], p1[0], p2[0], p3[0], t), cr(p0[1], p1[1], p2[1], p3[1], t)]);
      }
    }
    out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
    return out;
  };

  /* ---------- Camino: polilínea con distancia acumulada ---------- */
  function Path(pts, naval) {
    this.pts = pts;
    this.naval = !!naval;
    this.cum = [0];
    var L = 0, i;
    for (i = 1; i < pts.length; i++) {
      L += TD.dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
      this.cum.push(L);
    }
    this.length = L;
  }

  // Posición y ángulo a una distancia d del inicio.
  Path.prototype.at = function (d, out) {
    out = out || {};
    var pts = this.pts, cum = this.cum, n = pts.length;
    if (d <= 0) d = 0;
    if (d >= this.length) d = this.length;
    var lo = 0, hi = n - 1, m;
    while (hi - lo > 1) {
      m = (lo + hi) >> 1;
      if (cum[m] <= d) lo = m; else hi = m;
    }
    var segLen = cum[hi] - cum[lo];
    var t = segLen > 0 ? (d - cum[lo]) / segLen : 0;
    var ax = pts[lo][0], ay = pts[lo][1], bx = pts[hi][0], by = pts[hi][1];
    out.x = ax + (bx - ax) * t;
    out.y = ay + (by - ay) * t;
    out.ang = Math.atan2(by - ay, bx - ax);
    return out;
  };

  // Punto del camino más cercano a (x, y).
  Path.prototype.nearest = function (x, y) {
    var pts = this.pts, cum = this.cum, best = { d: 0, x: pts[0][0], y: pts[0][1], dist: Infinity }, i;
    for (i = 0; i < pts.length - 1; i++) {
      var ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
      var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      var t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
      t = t < 0 ? 0 : (t > 1 ? 1 : t);
      var px = ax + dx * t, py = ay + dy * t;
      var dd = TD.dist(x, y, px, py);
      if (dd < best.dist) {
        best.dist = dd; best.x = px; best.y = py;
        best.d = cum[i] + Math.sqrt(l2) * t;
      }
    }
    return best;
  };

  TD.Path = Path;

  /* ---------- Guardado en localStorage (siempre con try/catch) ---------- */
  var KEY = 'patria_en_armas_v1';

  function defaults() {
    return { unlocked: 1, stars: {}, hero: null, sound: true, music: true, sfxVol: 1, musicVol: 1, tutorialDone: false, shake: true, nums: true, diff: 'normal', medals: {} };
  }

  TD.Save = {
    data: defaults(),
    load: function () {
      try {
        var raw = window.localStorage.getItem(KEY);
        if (!raw) return;
        var o = JSON.parse(raw);
        if (!o || typeof o !== 'object') return;
        var d = defaults();
        if (typeof o.unlocked === 'number' && o.unlocked >= 1) d.unlocked = Math.floor(o.unlocked);
        if (o.stars && typeof o.stars === 'object') d.stars = o.stars;
        if (typeof o.hero === 'string') d.hero = o.hero;
        if (typeof o.sound === 'boolean') d.sound = o.sound;
        if (typeof o.music === 'boolean') d.music = o.music;
        if (typeof o.sfxVol === 'number' && o.sfxVol >= 0 && o.sfxVol <= 1) d.sfxVol = o.sfxVol;
        if (typeof o.musicVol === 'number' && o.musicVol >= 0 && o.musicVol <= 1) d.musicVol = o.musicVol;
        if (typeof o.tutorialDone === 'boolean') d.tutorialDone = o.tutorialDone;
        if (typeof o.shake === 'boolean') d.shake = o.shake;
        if (typeof o.nums === 'boolean') d.nums = o.nums;
        if (o.diff === 'facil' || o.diff === 'normal' || o.diff === 'dificil') d.diff = o.diff;
        if (o.medals && typeof o.medals === 'object') d.medals = o.medals;
        this.data = d;
      } catch (e) { /* sin almacenamiento: se juega igual, sin guardar */ }
    },
    save: function () {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (e) { /* ignorado */ }
    },
    reset: function () {
      this.data = defaults();
      try { window.localStorage.removeItem(KEY); } catch (e) { /* ignorado */ }
    },
    // Mayor dificultad con la que se ganó un nivel (0 fácil, 1 normal, 2 difícil; -1 sin ganar).
    // Las victorias anteriores al selector de dificultad cuentan como «fácil».
    medal: function (idx) {
      var k = String(idx), m = this.data.medals[k];
      if (typeof m === 'number' && m >= 0 && m <= 2) return m | 0;
      return this.data.stars[k] != null ? 0 : -1;
    },
    totalStars: function () {
      var n = 0, k;
      for (k in this.data.stars) if (Object.prototype.hasOwnProperty.call(this.data.stars, k)) n += this.data.stars[k] | 0;
      return n;
    }
  };
})();
