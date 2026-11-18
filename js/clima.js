/* ============================================================
 * clima.js — temáticas de algunos niveles (lvl.clima).
 *
 *  'niebla' (El Cruce de los Andes): niebla de montaña que se espesa
 *  con cada oleada y va tapando el sendero. Las torres, los solares y
 *  el héroe abren claros a su alrededor, así nunca se pierden de vista.
 *  Es sólo visual: las torres siguen disparando a lo que no se ve.
 *
 * Cómo se dibuja: un lienzo chico (1/6 del mundo) donde cada píxel toma
 * su opacidad de un ruido que deriva con el viento; se umbraliza según
 * la "cobertura" de la oleada, se recortan los claros y se estira sobre
 * el mapa con suavizado, que es lo que le da el aspecto algodonoso.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD, TAU = Math.PI * 2;

  var SC = 6;                                  // píxeles del mundo por píxel de niebla
  var FW = Math.ceil(TD.W / SC), FH = Math.ceil(TD.H / SC);
  var NT = 256, TEX_PX = 4;                    // textura de ruido periódica: 256² texeles de 4 px del mundo
  var noise = null;

  /* Ruido de valor periódico (3 octavas), ecualizado para que sus valores
   * queden repartidos de forma pareja en [0, 1): así "cobertura 0.4"
   * tapa más o menos el 40 % del mapa.                                  */
  function buildNoise() {
    var rnd = TD.rng(1817), out = new Float32Array(NT * NT);
    var oct = [[4, 0.55], [8, 0.3], [16, 0.15]], o, f, w, g, x, y, i;
    function sm(t) { return t * t * (3 - 2 * t); }
    for (o = 0; o < oct.length; o++) {
      f = oct[o][0]; w = oct[o][1];
      g = new Float32Array(f * f);
      for (i = 0; i < g.length; i++) g[i] = rnd();
      for (y = 0; y < NT; y++) {
        var v = y / NT * f, y0 = v | 0, ty = sm(v - y0), y1 = (y0 + 1) % f;
        for (x = 0; x < NT; x++) {
          var u = x / NT * f, x0 = u | 0, tx = sm(u - x0), x1 = (x0 + 1) % f;
          var a = g[y0 * f + x0] + (g[y0 * f + x1] - g[y0 * f + x0]) * tx;
          var b = g[y1 * f + x0] + (g[y1 * f + x1] - g[y1 * f + x0]) * tx;
          out[y * NT + x] += (a + (b - a) * ty) * w;
        }
      }
    }
    // ecualización por rango
    var idx = new Uint32Array(NT * NT);
    for (i = 0; i < idx.length; i++) idx[i] = i;
    idx.sort(function (p, q) { return out[p] - out[q]; });
    var eq = new Float32Array(NT * NT);
    for (i = 0; i < idx.length; i++) eq[idx[i]] = i / idx.length;
    return eq;
  }

  // muestra bilineal y periódica de la textura (coordenadas en texeles)
  function sample(u, v) {
    u = ((u % NT) + NT) % NT; v = ((v % NT) + NT) % NT;
    var x0 = u | 0, y0 = v | 0, tx = u - x0, ty = v - y0;
    var x1 = (x0 + 1) & (NT - 1), y1 = (y0 + 1) & (NT - 1);
    var r0 = y0 * NT, r1 = y1 * NT;
    var a = noise[r0 + x0] + (noise[r0 + x1] - noise[r0 + x0]) * tx;
    var b = noise[r1 + x0] + (noise[r1 + x1] - noise[r1 + x0]) * tx;
    return a + (b - a) * ty;
  }

  /* ---------------- niebla ---------------- */
  function Niebla(g) {
    if (!noise) noise = buildNoise();
    this.g = g;
    this.cv = document.createElement('canvas');
    this.cv.width = FW; this.cv.height = FH;
    this.cx = this.cv.getContext('2d');
    this.img = this.cx.createImageData(FW, FH);
    this.cov = this.target();                 // cobertura actual (se acerca de a poco a la meta)
    this.acc = 1;                             // fuerza el primer redibujado
    this.lastWave = 0;
  }

  // Cobertura meta según la oleada: casi nada en la preparación (para planear
  // con el mapa a la vista) y bien cerrada al final.
  Niebla.prototype.target = function () {
    var g = this.g, n = g.lvl.waves.length, k = g.waveIdx;
    if (k <= 0) return 0.06;
    return 0.16 + 0.7 * Math.pow((k - 1) / Math.max(1, n - 1), 0.9);
  };

  Niebla.prototype.update = function (dt) {
    var g = this.g, tg = this.target();
    this.cov += (tg - this.cov) * Math.min(1, dt * 0.35);     // se cierra en unos segundos, no de golpe
    this.acc += dt;
    if (g.waveIdx !== this.lastWave) {
      this.lastWave = g.waveIdx;
      var n = g.lvl.waves.length;
      if (g.waveIdx === Math.round(n * 0.4) || g.waveIdx === Math.round(n * 0.75)) {
        g.addText(TD.W / 2, TD.TOP_H + 70, 'La niebla se cierra sobre el sendero…', '#eef2f4', 17);
      }
    }
  };

  Niebla.prototype.paint = function () {
    var g = this.g, d = this.img.data, t = g.time, c = this.cov;
    var thr = 1 - c, soft = 0.13, haze = 0.08 + 0.12 * c, AMAX = 0.93;
    // dos capas que derivan con distinto viento; su promedio se vuelve a llevar a [0, 1)
    var ax = t * 1.6, ay = t * 0.35, bx = -t * 1.1 + 97, by = t * 0.5 + 53;
    var i, j, p = 0, u, v, s, n, a, e, sh;
    for (j = 0; j < FH; j++) {
      v = j * SC / TEX_PX;
      for (i = 0; i < FW; i++, p += 4) {
        u = i * SC / TEX_PX;
        s = (sample(u + ax, v + ay) + sample(u * 0.7 + bx, v * 0.7 + by)) * 0.5;
        n = s < 0.5 ? 2 * s * s : 1 - 2 * (1 - s) * (1 - s);           // triangular → uniforme
        e = (n - thr) / soft;
        e = e <= 0 ? 0 : (e >= 1 ? 1 : e * e * (3 - 2 * e));
        a = AMAX * (haze + (1 - haze) * e);
        sh = 222 + 26 * n;                                              // volumen: el corazón de la nube, más blanco
        d[p] = sh - 8; d[p + 1] = sh - 4; d[p + 2] = sh; d[p + 3] = a * 255;
      }
    }
    var cx = this.cx;
    cx.globalCompositeOperation = 'source-over';
    cx.putImageData(this.img, 0, 0);
    // claros alrededor de lo propio
    cx.globalCompositeOperation = 'destination-out';
    for (i = 0; i < g.slots.length; i++) {
      var sl = g.slots[i];
      if (sl.tower) hole(cx, sl.x, sl.y - 30, 74);
      else hole(cx, sl.x, sl.y - 4, 44);
    }
    var h = g.hero;
    if (h && !h.dead) hole(cx, h.x, h.y - 14, 50);
    cx.globalCompositeOperation = 'source-over';
  };

  function hole(cx, x, y, r, k) {
    x /= SC; y /= SC; r /= SC;
    var gr = cx.createRadialGradient(x, y, r * 0.45, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,' + (k == null ? 1 : k) + ')');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = gr;
    cx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  Niebla.prototype.draw = function (ctx) {
    // a ~30 cuadros por segundo alcanza: la niebla se mueve lento
    var nt = this.g.towers.length;
    if (this.acc >= 1 / 30 || nt !== this.nt) { this.acc = 0; this.nt = nt; this.paint(); }
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.cv, 0, 0, FW, FH, 0, 0, FW * SC, FH * SC);
    ctx.restore();
  };

  /* ---------------- amanecer (San Lorenzo) ----------------
   * Penumbra suave de antes del alba: nunca tapa nada del todo, apenas
   * oscurece y enfría el mapa. Las torres y el héroe dan una luz tibia.
   * Con cada oleada aclara, el río se enciende de naranja y hacia la
   * quinta oleada ya es de día.                                        */
  var DAWN_MAX = 0.46, DAWN_WAVES = 5;

  function Amanecer(g) {
    this.g = g;
    this.cv = document.createElement('canvas');
    this.cv.width = FW; this.cv.height = FH;
    this.cx = this.cv.getContext('2d');
    this.dark = this.target();
    this.acc = 1; this.day = false;
  }
  Amanecer.prototype.target = function () {
    return DAWN_MAX * Math.max(0, 1 - this.g.waveIdx / DAWN_WAVES);
  };
  Amanecer.prototype.update = function (dt) {
    this.dark += (this.target() - this.dark) * Math.min(1, dt * 0.2);     // aclara lento, como de verdad
    if (this.dark < 0.004) this.dark = 0;
    this.acc += dt;
    if (!this.day && this.dark < 0.03 && this.g.waveIdx >= DAWN_WAVES) {
      this.day = true;
      this.g.addText(TD.W / 2, TD.TOP_H + 70, 'Amanece sobre el Paraná', '#ffe2b0', 17);
    }
  };
  Amanecer.prototype.paint = function () {
    var g = this.g, cx = this.cx, i, sl, h = g.hero;
    cx.globalCompositeOperation = 'source-over';
    cx.clearRect(0, 0, FW, FH);
    cx.fillStyle = 'rgba(16,24,56,' + this.dark + ')';
    cx.fillRect(0, 0, FW, FH);
    // claros tibios: no se borra toda la sombra, sólo la mayor parte
    cx.globalCompositeOperation = 'destination-out';
    for (i = 0; i < g.slots.length; i++) {
      sl = g.slots[i];
      if (sl.tower) hole(cx, sl.x, sl.y - 26, 100, 0.8);
      else hole(cx, sl.x, sl.y - 4, 46, 0.6);
    }
    if (h && !h.dead) hole(cx, h.x, h.y - 14, 70, 0.75);
    cx.globalCompositeOperation = 'source-over';
  };
  Amanecer.prototype.draw = function (ctx) {
    if (this.dark <= 0) return;
    var nt = this.g.towers.length;
    if (this.acc >= 1 / 20 || nt !== this.nt) { this.acc = 0; this.nt = nt; this.paint(); }
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.cv, 0, 0, FW, FH, 0, 0, FW * SC, FH * SC);
    // el cielo se enciende desde el río (a la izquierda): más fuerte a mitad del alba
    var k = this.dark / DAWN_MAX, glow = 0.26 * Math.sin(Math.PI * Math.min(1, (1 - k) * 0.85 + 0.15));
    var gr = ctx.createLinearGradient(0, 0, TD.W * 0.6, 0);
    gr.addColorStop(0, 'rgba(255,150,70,' + glow + ')');
    gr.addColorStop(0.45, 'rgba(255,190,120,' + glow * 0.35 + ')');
    gr.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, TD.W * 0.6, TD.H);
    ctx.restore();
  };

  /* ---------------- langostas (Tucumán) ----------------
   * Desde la tercera oleada, cada tanto una manga de langostas cruza el
   * campo con el viento. A los realistas que agarra los frena (como una
   * ralentización de las de siempre; a los jefes, la mitad). A los
   * nuestros no les hace nada.                                         */
  var SW_N = 200, SW_RX = 135, SW_RY = 92, SW_SPD = 82, SW_SLOW = 0.35;

  function Langostas(g) {
    this.g = g;
    this.swarms = [];
    this.timer = -1;           // < 0: todavía no empezó la temporada de langostas
    this.first = true;
  }
  Langostas.prototype.spawn = function () {
    var g = this.g, land = [], i, p, tmp = {};
    for (i = 0; i < g.paths.length; i++) if (!g.paths[i].naval) land.push(g.paths[i]);
    var path = land[(Math.random() * land.length) | 0];
    // apunta a un tramo del camino y cruza el mapa de punta a punta con el viento
    p = path.at(path.length * TD.rand(0.25, 0.8), tmp);
    var ang = (Math.random() < 0.5 ? 0 : Math.PI) + TD.rand(-0.45, 0.45);
    var dx = Math.cos(ang), dy = Math.sin(ang), L = 950;
    var bugs = [];
    for (i = 0; i < SW_N; i++) {
      var r = Math.sqrt(Math.random()), a = Math.random() * TAU;
      bugs.push({ ox: Math.cos(a) * r, oy: Math.sin(a) * r, ph: Math.random() * TAU, w: TD.rand(1.5, 3.5), s: TD.rand(0.8, 1.25) });
    }
    this.swarms.push({ x: p.x - dx * L, y: p.y - dy * L, dx: dx, dy: dy, d: 0, len: L * 2, bugs: bugs, buzz: 0 });
    if (this.first) {
      this.first = false;
      g.setBanner('¡Una manga de langostas cae sobre los realistas!');
    } else {
      g.addText(TD.W / 2, TD.TOP_H + 70, '¡Langostas!', '#e6d27a', 17);
    }
    TD.Audio.play('langostas');
  };
  Langostas.prototype.update = function (dt) {
    var g = this.g, i, j, s, e, nx, ny;
    if (this.timer < 0) {
      if (g.waveIdx >= 3) this.timer = 7;          // la primera, unos segundos después de la tercera oleada
    } else if (g.state === 'running') {
      this.timer -= dt;
      if (this.timer <= 0) { this.spawn(); this.timer = TD.rand(34, 44); }
    }
    for (i = this.swarms.length - 1; i >= 0; i--) {
      s = this.swarms[i];
      s.d += SW_SPD * dt;
      s.x += s.dx * SW_SPD * dt; s.y += s.dy * SW_SPD * dt;
      if (s.d > s.len) { this.swarms.splice(i, 1); continue; }
      for (j = 0; j < g.enemies.length; j++) {
        e = g.enemies[j];
        if (e.dead || e.gone || e.def.naval) continue;
        nx = (e.x - s.x) / SW_RX; ny = (e.y - s.y) / SW_RY;
        if (nx * nx + ny * ny < 1) e.slow(SW_SLOW, 0.35);
      }
      s.buzz -= dt;
      if (s.buzz <= 0 && s.x > -60 && s.x < TD.W + 60) { s.buzz = 2.2; TD.Audio.play('langostas', 0.5); }
    }
  };
  // sombra de la manga sobre el campo (debajo de las tropas)
  Langostas.prototype.drawBelow = function (ctx) {
    var i, s;
    for (i = 0; i < this.swarms.length; i++) {
      s = this.swarms[i];
      ctx.fillStyle = 'rgba(40,34,10,0.2)';
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 18, SW_RX * 0.95, SW_RY * 0.55, 0, 0, TAU); ctx.fill();
    }
  };
  Langostas.prototype.draw = function (ctx) {
    var t = this.g.time, i, j, s, b, x, y, f, wing, hd;
    for (i = 0; i < this.swarms.length; i++) {
      s = this.swarms[i];
      hd = s.dx >= 0 ? 1 : -1;
      // polvareda amarillenta que envuelve a la manga
      var hz = ctx.createRadialGradient(s.x, s.y - 26, 10, s.x, s.y - 26, SW_RX * 1.1);
      hz.addColorStop(0, 'rgba(190,170,90,0.22)');
      hz.addColorStop(1, 'rgba(190,170,90,0)');
      ctx.fillStyle = hz;
      ctx.beginPath(); ctx.ellipse(s.x, s.y - 26, SW_RX * 1.1, SW_RY * 1.05, 0, 0, TAU); ctx.fill();
      for (j = 0; j < s.bugs.length; j++) {
        b = s.bugs[j];
        x = s.x + b.ox * SW_RX + Math.sin(t * b.w + b.ph) * 16;
        y = s.y + b.oy * SW_RY - 26 + Math.cos(t * b.w * 1.3 + b.ph) * 10;
        f = b.s;
        // cuerpo
        ctx.fillStyle = j % 3 ? '#6e6020' : '#8a7a2c';
        ctx.beginPath(); ctx.ellipse(x, y, 4.2 * f, 1.7 * f, 0, 0, TAU); ctx.fill();
        // alas que aletean
        wing = Math.sin(t * 38 + b.ph);
        ctx.fillStyle = 'rgba(240,232,190,' + (0.35 + 0.3 * wing) + ')';
        ctx.beginPath(); ctx.ellipse(x - hd * f, y - 2.2 * f * (0.5 + wing * 0.5), 3.8 * f, 1.4 * f, -hd * 0.4, 0, TAU); ctx.fill();
      }
    }
  };

  TD.Clima = {
    create: function (g) {
      switch (g.lvl.clima) {
        case 'niebla': return new Niebla(g);
        case 'amanecer': return new Amanecer(g);
        case 'langostas': return new Langostas(g);
      }
      return null;
    }
  };
})();
