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
  var TD = window.TD;

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

  function hole(cx, x, y, r) {
    x /= SC; y /= SC; r /= SC;
    var gr = cx.createRadialGradient(x, y, r * 0.45, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
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

  TD.Clima = {
    create: function (g) {
      switch (g.lvl.clima) {
        case 'niebla': return new Niebla(g);
      }
      return null;
    }
  };
})();