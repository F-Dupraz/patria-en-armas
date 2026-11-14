/* ============================================================
 * juice.js — "game feel": partículas livianas, destello de golpe,
 * caídas animadas, hundimiento de barcos, monedas que vuelan al
 * contador, números de daño discretos y sacudida suave.
 * Todo es sutil a propósito: se tiene que ver la batalla, no los efectos.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD, D = TD.Draw;
  var TAU = Math.PI * 2;
  var J = {};
  TD.Juice = J;

  var MAX_PARTS = 320, MAX_NUMS = 22, MAX_COINS = 28;
  var HUD_COIN = { x: 112, y: 22 };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function easeOut(q) { return 1 - (1 - q) * (1 - q); }
  function easeOutBack(q) { var c = 1.7; q -= 1; return 1 + q * q * ((c + 1) * q + c); }

  J.opt = function (k) { var d = TD.Save.data; return d[k] !== false; };

  /* ---------------- partículas ---------------- */
  // p: k, x, y, vx, vy, grav, gy (suelo), life, r, c, rot, vr, bounce, drag
  J.part = function (g, p) {
    if (g.parts.length >= MAX_PARTS) return null;
    p.max = p.life;
    if (p.rot == null) p.rot = 0;
    g.parts.push(p);
    return p;
  };

  J.step = function (g, dt) {
    var a = g.parts, i, j = 0, p;
    for (i = 0; i < a.length; i++) {
      p = a[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      if (!p.rest) {
        p.vy += (p.grav || 0) * dt;
        if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += (p.vr || 0) * dt;
        if (p.gy != null && p.y > p.gy && p.vy > 0) {
          p.y = p.gy;
          if (p.k === 'drop') { p.life = 0; continue; }
          if (p.bounce && p.vy > 60) { p.vy = -p.vy * p.bounce; p.vx *= 0.55; p.vr = (p.vr || 0) * 0.5; }
          else { p.rest = true; p.vx = 0; p.vy = 0; if (p.k === 'hat') p.rot = 0; }
        }
      }
      a[j++] = p;
    }
    a.length = j;

    // números de daño
    a = g.nums; j = 0;
    for (i = 0; i < a.length; i++) { a[i].t += dt; if (a[i].t < a[i].dur) a[j++] = a[i]; }
    a.length = j;

    // monedas: saltan y después vuelan al contador
    a = g.coins; j = 0;
    for (i = 0; i < a.length; i++) {
      p = a[i];
      p.t += dt;
      if (p.t < 0.42) {
        p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        p.fx = p.x; p.fy = p.y;
      } else {
        var q = Math.min(1, (p.t - 0.42) / 0.5), e = q * q;
        p.x = p.fx + (HUD_COIN.x - p.fx) * e;
        p.y = p.fy + (HUD_COIN.y - p.fy) * e - Math.sin(q * Math.PI) * 40;
        if (q >= 1) { J.goldArrive(g, p.n); continue; }
      }
      a[j++] = p;
    }
    a.length = j;

    if (g.goldPulse > 0) g.goldPulse -= dt;
    if (g.goldDeny > 0) g.goldDeny -= dt;
    if (g.goldPlusT > 0) g.goldPlusT -= dt;
    if (g.trauma > 0) g.trauma = Math.max(0, g.trauma - dt * 1.5);
  };

  J.goldArrive = function (g, n) {
    g.goldPulse = 0.22;
    g.goldPlus = (g.goldPlusT > 0 ? g.goldPlus : 0) + n;
    g.goldPlusT = 0.9;
  };

  /* ---------------- sacudida (trauma) ---------------- */
  J.kick = function (g, amt) { g.trauma = Math.min(1, (g.trauma || 0) + amt); };

  // Desplazamiento suave (ruido de senos, no saltos aleatorios por cuadro)
  J.shakeOffset = function (g, out) {
    out.x = 0; out.y = 0;
    if (!g.trauma || g.paused || !J.opt('shake')) return out;
    var s = g.trauma * g.trauma * 9, t = g.time * 60;
    out.x = s * (Math.sin(t * 0.73) * 0.6 + Math.sin(t * 1.91 + 1.3) * 0.4);
    out.y = s * (Math.sin(t * 0.87 + 2.1) * 0.6 + Math.sin(t * 2.23 + 0.4) * 0.4);
    return out;
  };

  /* ---------------- impactos ---------------- */
  // Chispas en el punto de golpe; la eficacia se lee en el tamaño, no en un texto.
  J.hit = function (g, e, m, crit, type) {
    var x = e.x, y = e.cy(), i, n, col;
    if (e.def.naval) {
      n = crit ? 6 : 4;
      for (i = 0; i < n; i++) {
        J.part(g, { k: 'clod', x: x + rnd(-8, 8), y: y - 4, vx: rnd(-70, 70), vy: rnd(-150, -70), grav: 420, gy: e.y + 4, life: 0.8, r: rnd(1.6, 2.6), c: '#6b4a2b', vr: rnd(-12, 12) });
      }
      return;
    }
    if (m <= 0.75) {
      // "tink": rebota en la armadura
      for (i = 0; i < 3; i++) J.part(g, { k: 'spark', x: x, y: y, vx: rnd(-90, 90), vy: rnd(-110, -30), grav: 300, life: 0.22, r: 1.2, c: '#d9d6cc' });
      return;
    }
    n = m >= 1.25 ? 5 : 3;
    if (crit) n += 3;
    col = type === 'fuego' ? '#ffb347' : '#fff2b0';
    for (i = 0; i < n; i++) {
      var a = rnd(0, TAU), sp = rnd(70, 150) * (crit ? 1.3 : 1);
      J.part(g, { k: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, grav: 260, life: rnd(0.16, 0.28), r: 1.4, c: col });
    }
    if (crit || m >= 1.25) g.addFx({ k: 'star4', x: x, y: y, r: crit ? 13 : 8, dur: crit ? 0.22 : 0.16 });
  };

  // Números de daño: se acumulan por enemigo en una ventana corta para no saturar
  J.addDmg = function (g, e, dealt, m, crit) {
    if (!J.opt('nums') || dealt <= 0) return;
    e.dmgAcc = (e.dmgAcc || 0) + dealt;
    if (crit) e.dmgCrit = true;
    e.dmgM = m;
    if (!(e.dmgT > 0)) e.dmgT = 0.32;
  };

  J.flushDmg = function (g, e) {
    var v = Math.round(e.dmgAcc || 0);
    e.dmgAcc = 0; e.dmgT = 0;
    if (v < 1) { e.dmgCrit = false; return; }
    var crit = e.dmgCrit, m = e.dmgM || 1;
    e.dmgCrit = false;
    if (g.nums.length >= MAX_NUMS) g.nums.shift();
    // si hay otros números recientes cerca, se apilan en vez de encimarse
    var x = e.x, y = e.y - e.h - 4, i, n, k = 0;
    for (i = 0; i < g.nums.length; i++) {
      n = g.nums[i];
      if (n.t < 0.4 && Math.abs(n.x0 - x) < 34 && Math.abs(n.y0 - y) < 30) k++;
    }
    g.nums.push({
      x0: x, y0: y,
      x: x + (k % 2 ? 10 : -4) * (k > 0 ? 1 : 0), y: y - k * 13, s: crit ? v + '!' : String(v),
      size: crit ? 16 : (m >= 1.25 ? 13 : (m <= 0.75 ? 11 : 12)),
      color: crit ? '#ffd76a' : (m <= 0.75 ? '#cfc9bc' : '#ffffff'),
      t: 0, dur: crit ? 0.85 : 0.65
    });
  };

  J.tickDmg = function (g, e, dt) {
    if (e.dmgT > 0) { e.dmgT -= dt; if (e.dmgT <= 0) J.flushDmg(g, e); }
  };

  /* ---------------- explosiones ---------------- */
  J.explosion = function (g, x, y, r, water, fire) {
    var i, n = Math.min(9, 4 + (r / 12) | 0);
    if (water) {
      for (i = 0; i < n + 2; i++) {
        J.part(g, { k: 'drop', x: x + rnd(-r * 0.3, r * 0.3), y: y, vx: rnd(-60, 60), vy: rnd(-230, -110), grav: 620, gy: y + rnd(0, 6), life: 1.2, r: rnd(1.6, 2.8), c: 'rgba(235,245,250,0.9)' });
      }
      return;
    }
    for (i = 0; i < n; i++) {
      var a = rnd(Math.PI * 1.05, Math.PI * 1.95), sp = rnd(80, 190);
      J.part(g, { k: 'clod', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 560, gy: y + rnd(-6, 10), life: rnd(0.9, 1.4), r: rnd(1.6, 3), c: i % 3 ? '#7a5a36' : '#5a4128', vr: rnd(-14, 14), bounce: 0.3 });
    }
    if (fire) {
      for (i = 0; i < 4; i++) J.part(g, { k: 'ember', x: x + rnd(-8, 8), y: y - 4, vx: rnd(-30, 30), vy: rnd(-90, -40), grav: -20, drag: 1.5, life: rnd(0.5, 0.9), r: rnd(1.2, 2) });
    }
    g.addFx({ k: 'scorch', ground: true, x: x, y: y + 2, r: r * 0.55, dur: 5 });
  };

  // Estela de la bala de cañón (se llama desde el proyectil)
  J.trail = function (g, pr) {
    pr.trailT = (pr.trailT || 0) - 1;
    if (pr.trailT > 0) return;
    pr.trailT = 2;
    if (pr.o.fire) J.part(g, { k: 'ember', x: pr.x, y: pr.y, vx: rnd(-10, 10), vy: rnd(-20, 0), drag: 2, life: 0.35, r: 1.6 });
    else J.part(g, { k: 'puff', x: pr.x, y: pr.y, vx: 0, vy: -6, life: 0.4, r: 1.8, c: '#e6e0d2' });
  };

  /* ---------------- muertes ---------------- */
  function copyLook(o) {
    var c = {}, k;
    for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) c[k] = o[k];
    c.walk = false; c.atk = 0; c.alpha = 1; c.sq = 0;
    return c;
  }

  // Cae hacia atrás, el sombrero sale volando y todo se desvanece. Sin crudeza.
  J.fall = function (g, u, o2) {
    o2 = o2 || {};
    var o = copyLook(u.o), dir = -(u.face || 1), cav = o.kind === 'cav', s = o.s || 1;
    o.noHat = !!o.hat && !o2.keepHat;
    g.addFx({ k: 'fall', ground: true, x: u.x, y: u.y, o: o, dir: dir, cav: cav, dur: o2.dur || 1.5, seed: u.anim || 0 });
    g.addFx({ k: 'dust', x: u.x - dir * 14, y: u.y, r: 18, dur: 0.55, seed: u.anim || 0 });
    if (o.noHat) {
      var hy = u.y - (cav ? 45 : 33) * s;
      J.part(g, { k: 'hat', x: u.x, y: hy, vx: dir * rnd(30, 70), vy: rnd(-200, -150), grav: 700, gy: u.y + rnd(2, 6), life: o2.dur || 1.5, r: 1, vr: dir * rnd(6, 11), bounce: 0.35, o: o, s: s });
    }
  };

  J.sink = function (g, e) {
    var o = copyLook(e.o), i;
    o.noWake = true;
    g.addFx({ k: 'sink', ground: true, x: e.x, y: e.y, o: o, h: e.h, dir: e.face || 1, dur: 2.2 });
    for (i = 0; i < 8; i++) {
      J.part(g, { k: 'clod', x: e.x + rnd(-e.r, e.r), y: e.y - 14, vx: rnd(-80, 80), vy: rnd(-200, -90), grav: 480, gy: e.y + rnd(2, 8), life: 1.1, r: rnd(1.6, 3), c: i % 2 ? '#5a3b22' : '#3d2a1c', vr: rnd(-12, 12) });
    }
  };

  J.coin = function (g, x, y, n) {
    if (g.coins.length >= MAX_COINS) { J.goldArrive(g, n); return; }
    g.coins.push({ x: x, y: y, vx: rnd(-40, 40), vy: rnd(-190, -150), t: 0, n: n, fx: x, fy: y });
  };

  /* ---------------- destello blanco de golpe ---------------- */
  // Dibuja la unidad en un lienzo auxiliar, la tiñe de blanco y la pega.
  var fcv = null, fctx = null;
  J.drawFlashed = function (ctx, x, y, halfW, top, bottom, amt, fn, arg) {
    if (amt <= 0.02 || !ctx.getTransform) { fn(ctx, arg); return; }
    var m = ctx.getTransform(), S = Math.sqrt(m.a * m.a + m.b * m.b) || 1;
    var w = halfW * 2, h = top + bottom;
    var pw = Math.ceil(w * S), ph = Math.ceil(h * S);
    if (!fcv) { fcv = document.createElement('canvas'); fctx = fcv.getContext('2d'); }
    if (fcv.width < pw || fcv.height < ph) { fcv.width = Math.max(fcv.width, pw); fcv.height = Math.max(fcv.height, ph); }
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.globalCompositeOperation = 'source-over'; fctx.globalAlpha = 1;
    fctx.clearRect(0, 0, pw, ph);
    fctx.setTransform(S, 0, 0, S, -(x - halfW) * S, -(y - top) * S);
    fn(fctx, arg);
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.globalCompositeOperation = 'source-atop';
    fctx.globalAlpha = amt; fctx.fillStyle = '#ffffff';
    fctx.fillRect(0, 0, pw, ph);
    fctx.globalCompositeOperation = 'source-over'; fctx.globalAlpha = 1;
    ctx.drawImage(fcv, 0, 0, pw, ph, x - halfW, y - top, w, h);
  };

  /* ---------------- dibujo ---------------- */
  J.drawParts = function (ctx, g) {
    var a = g.parts, i, p, f;
    ctx.save();
    ctx.lineCap = 'round';
    for (i = 0; i < a.length; i++) {
      p = a[i];
      f = p.life / p.max;
      switch (p.k) {
        case 'spark':
          ctx.globalAlpha = Math.min(1, f * 1.6);
          ctx.strokeStyle = p.c; ctx.lineWidth = p.r;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke();
          break;
        case 'clod':
          ctx.globalAlpha = Math.min(1, f * 3);
          ctx.fillStyle = p.c;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillRect(-p.r, -p.r * 0.8, p.r * 2, p.r * 1.6);
          ctx.restore();
          break;
        case 'drop':
          ctx.globalAlpha = Math.min(1, f * 2);
          ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
          break;
        case 'ember':
          ctx.globalAlpha = f;
          ctx.fillStyle = f > 0.5 ? '#ffd27a' : '#ff8a3a';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
          break;
        case 'puff':
          ctx.globalAlpha = f * 0.45;
          ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (1 - f) * 4, 0, TAU); ctx.fill();
          break;
        case 'hat':
          ctx.globalAlpha = Math.min(1, f * 3);
          D.hatAt(ctx, p.x, p.y, p.o, p.rot, p.s);
          break;
        case 'sparkle':
          ctx.globalAlpha = Math.sin(f * Math.PI);
          D.star(ctx, p.x, p.y, p.r, true);
          break;
      }
    }
    ctx.restore();
  };

  J.drawNums = function (ctx, g) {
    var a = g.nums, i, n, q, sc, rise;
    for (i = 0; i < a.length; i++) {
      n = a[i];
      q = n.t / n.dur;
      sc = n.t < 0.12 ? 0.6 + 0.4 * easeOutBack(n.t / 0.12) : 1;
      rise = easeOut(Math.min(1, q * 1.4)) * 16;
      ctx.save();
      ctx.globalAlpha = q > 0.6 ? (1 - q) / 0.4 : 1;
      ctx.translate(n.x, n.y - rise);
      ctx.scale(sc, sc);
      D.textO(ctx, n.s, 0, 0, n.size, n.color);
      ctx.restore();
    }
  };

  // Capa sobre el HUD: monedas en vuelo
  J.drawOverlay = function (ctx, g) {
    var a = g.coins, i, p, sq;
    for (i = 0; i < a.length; i++) {
      p = a[i];
      sq = Math.abs(Math.sin(p.t * 9));        // gira (se ve de canto)
      ctx.save();
      ctx.translate(p.x, p.y); ctx.scale(0.35 + sq * 0.65, 1);
      D.coin(ctx, 0, 0, 6);
      ctx.restore();
    }
  };

  /* ---------------- nuevos efectos para D.fx ---------------- */
  var baseFx = D.fx;
  D.fx = function (ctx, f) {
    var p = f.t / f.dur, q, a, o;
    if (p < 0) return;
    if (p > 1) p = 1;
    switch (f.k) {
      case 'fall':
        o = f.o;
        q = Math.min(1, f.t / 0.34);
        // pequeño salto y caída con un rebote al tocar el suelo
        var ang = (q < 1 ? q * q : 1) * (f.cav ? 1.25 : 1.45);
        if (f.t > 0.34 && f.t < 0.5) ang -= Math.sin((f.t - 0.34) / 0.16 * Math.PI) * 0.12;
        var hop = Math.sin(Math.min(1, f.t / 0.2) * Math.PI) * 4;
        o.alpha = f.t < f.dur - 0.5 ? 1 : Math.max(0, (f.dur - f.t) / 0.5);
        ctx.save();
        ctx.translate(f.x, f.y - hop + (f.t > f.dur - 0.5 ? (f.t - f.dur + 0.5) * 6 : 0));
        ctx.rotate(f.dir * ang);
        D.unit(ctx, 0, 0, o);
        ctx.restore();
        return;
      case 'sink':
        o = f.o;
        q = p * p;
        o.alpha = p < 0.75 ? 1 : (1 - p) / 0.25;
        o.t = (o.t || 0) + 0.016;
        ctx.save();
        ctx.beginPath(); ctx.rect(f.x - 120, f.y - 160, 240, 163); ctx.clip();
        ctx.translate(f.x, f.y + q * (f.h + 10));
        ctx.rotate(f.dir * q * 0.45);
        D.ship(ctx, 0, 0, o);
        ctx.restore();
        // anillos en el agua
        ctx.save();
        ctx.globalAlpha = (1 - p) * 0.7;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        a = (f.t * 1.6) % 1;
        ctx.beginPath(); ctx.ellipse(f.x, f.y + 3, 20 + a * 40, (20 + a * 40) * 0.3, 0, 0, TAU); ctx.stroke();
        ctx.restore();
        return;
      case 'scorch':
        ctx.save();
        ctx.globalAlpha = 0.22 * (p < 0.7 ? 1 : (1 - p) / 0.3);
        ctx.fillStyle = '#3a2a18';
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.42, 0, 0, TAU); ctx.fill();
        ctx.restore();
        return;
      case 'star4':
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.translate(f.x, f.y); ctx.rotate(p * 0.6);
        var r = f.r * (0.6 + p * 0.6);
        ctx.fillStyle = '#fffbe6';
        ctx.beginPath();
        ctx.moveTo(0, -r); ctx.lineTo(r * 0.22, -r * 0.22); ctx.lineTo(r, 0); ctx.lineTo(r * 0.22, r * 0.22);
        ctx.lineTo(0, r); ctx.lineTo(-r * 0.22, r * 0.22); ctx.lineTo(-r, 0); ctx.lineTo(-r * 0.22, -r * 0.22);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        return;
      case 'shock':
        ctx.save();
        ctx.globalAlpha = (1 - p) * 0.5;
        ctx.strokeStyle = '#fff6dc'; ctx.lineWidth = 2 * (1 - p) + 0.5;
        q = easeOut(p);
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * q, f.r * q * 0.45, 0, 0, TAU); ctx.stroke();
        ctx.restore();
        return;
    }
    baseFx(ctx, f);
  };

  /* ---------------- transición entre pantallas ---------------- */
  J.fade = { a: 1, dir: -1, cb: null };          // arranca negro y aclara

  J.transition = function (cb) {
    if (J.fade.dir === 1) return;
    J.fade.dir = 1; J.fade.cb = cb;
  };

  J.updateFade = function (dt) {
    var F = J.fade;
    if (F.dir === 1) {
      F.a += dt / 0.22;
      if (F.a >= 1) { F.a = 1; F.dir = -1; var cb = F.cb; F.cb = null; if (cb) cb(); }
    } else if (F.dir === -1) {
      F.a -= dt / 0.32;
      if (F.a <= 0) { F.a = 0; F.dir = 0; }
    }
  };

  J.drawFade = function (ctx) {
    if (J.fade.a <= 0) return;
    ctx.fillStyle = 'rgba(28,20,12,' + J.fade.a + ')';
    ctx.fillRect(0, 0, TD.W, TD.H);
  };

  J.busy = function () { return J.fade.dir === 1; };
})();
