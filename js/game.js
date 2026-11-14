/* ============================================================
 * game.js — estado de una batalla: oleadas, economía, vidas,
 * construcción, actualización con delta time y render del mapa.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD, D = TD.Draw;
  var TAU = Math.PI * 2;
  var TMP = {}, PRED = { x: 0, y: 0 };

  /* Solares fijos: los explícitos del nivel + una hilera determinística
   * a ambos lados de cada camino terrestre.                            */
  TD.genSlots = function (lvl, paths) {
    var out = [], maxY = lvl.theme === 'rio' ? 374 : 598, minX = lvl.theme === 'costa' ? 110 : 70;
    function ok(x, y) {
      var p, s;
      if (x < minX || x > 1210 || y < 120 || y > maxY) return false;
      for (p = 0; p < paths.length; p++) {
        if (paths[p].naval) continue;
        if (paths[p].nearest(x, y).dist < 54) return false;
      }
      for (s = 0; s < out.length; s++) if (TD.dist(x, y, out[s][0], out[s][1]) < 88) return false;
      return true;
    }
    if (lvl.slots) lvl.slots.forEach(function (s) { out.push([s[0], s[1]]); });
    var sp = lvl.slotSpacing || 150, off = 66, side = 1, tmp = {};
    paths.forEach(function (path) {
      if (path.naval) return;
      var d, k;
      for (d = 110; d < path.length - 70; d += sp) {
        var p = path.at(d, tmp);
        for (k = 0; k < 2; k++) {
          var sd = k === 0 ? side : -side;
          var x = Math.round(p.x - Math.sin(p.ang) * off * sd), y = Math.round(p.y + Math.cos(p.ang) * off * sd);
          if (ok(x, y)) { out.push([x, y]); break; }
        }
        side = -side;
      }
    });
    return out;
  };

  function Game(idx, heroKey) {
    var lvl = TD.LEVELS[idx], self = this, i;
    this.idx = idx; this.lvl = lvl;
    TD.curFlag = TD.flagFor(lvl);
    this.paths = lvl.paths.map(function (p) {
      return new TD.Path(p.straight ? p.pts : TD.smooth(p.pts, 12), !!p.naval);
    });
    this.waterY = lvl.theme === 'rio' ? D.WATER_Y : null;
    this.slots = TD.genSlots(lvl, this.paths).map(function (s) { return { x: s[0], y: s[1], tower: null }; });
    this.towers = []; this.enemies = []; this.soldiers = []; this.projs = []; this.fx = []; this.texts = [];
    this.gold = lvl.gold; this.lives = lvl.lives || 20;
    this.time = 0; this.speed = 1; this.paused = false;
    this.state = 'prep';            // prep | running | won | lost
    this.waveIdx = 0; this.nextTimer = 0; this.spawners = []; this.waveLeft = [];
    this.stats = { sold: 0, leaked: 0, heroDeaths: 0, early: 0, built: 0, kills: 0, maxTowers: 0 };
    this.sel = null; this.mode = null; this.armed = null;
    this.banner = null; this.endT = 0; this.shake = 0; this.result = null;
    this.mx = -999; this.my = -999;
    this.boss = null;
    this.dl = [];

    // Entradas y salidas visibles de cada camino (para los marcadores)
    this.entries = []; this.exits = [];
    function inside(p) { return p.x > 30 && p.x < TD.W - 30 && p.y > TD.TOP_H + 30 && p.y < TD.BAR_Y - 30; }
    this.paths.forEach(function (path, pi) {
      var d, p;
      for (d = 0; d < path.length; d += 8) { p = path.at(d, TMP); if (inside(p)) break; }
      self.entries.push({ x: p.x, y: p.y, pi: pi, naval: path.naval });
      for (d = path.length; d > 0; d -= 8) { p = path.at(d, TMP); if (inside(p)) break; }
      var dup = false;
      for (i = 0; i < self.exits.length; i++) if (TD.dist(self.exits[i].x, self.exits[i].y, p.x, p.y) < 40) dup = true;
      if (!dup) self.exits.push({ x: p.x, y: p.y, naval: path.naval });
    });

    // Héroe: arranca sobre el primer camino terrestre, cerca del final
    var land = this.paths[0], hp;
    for (i = 0; i < this.paths.length; i++) if (!this.paths[i].naval) { land = this.paths[i]; break; }
    hp = land.at(land.length * 0.62, TMP);
    this.hero = new TD.Hero(this, heroKey || 'sanmartin', hp.x, hp.y);
    this.soldiers.push(this.hero);

    this.bg = D.background(this);
  }

  /* ---------------- utilidades ---------------- */
  Game.prototype.addText = function (x, y, s, color, size) {
    if (this.texts.length > 70) this.texts.shift();
    this.texts.push({ x: x, y: y, s: s, color: color || '#fff', size: size || 13, t: 0, dur: 1.15 });
  };
  Game.prototype.addFx = function (f) {
    if (this.fx.length > 240 && !f.cb) return;
    f.t = 0;
    this.fx.push(f);
  };
  Game.prototype.setBanner = function (text) { this.banner = { text: text, t: 0, dur: 3.2 }; };
  Game.prototype.addGold = function (n, x, y) {
    this.gold += n;
    if (x != null) this.addText(x, y, '+' + n, '#ffd76a', 14);
  };

  Game.prototype.spawnEnemy = function (type, pi, wi, d0) {
    var e = new TD.Enemy(this, type, pi, wi, d0);
    this.enemies.push(e);
    if (e.def.boss) {
      this.boss = e;
      this.setBanner('¡' + e.def.name + ' entra en combate!');
      TD.Audio.play('boss');
    }
    return e;
  };

  // Posición estimada de un enemigo dentro de T segundos (para la artillería)
  Game.prototype.predict = function (e, T) {
    var v = (e.moving && e.stunT <= 0) ? e.def.spd * e.spdMul * (1 - e.slowF) : 0;
    var p = e.path.at(e.d + v * T, TMP);
    PRED.x = p.x - Math.sin(p.ang) * e.off;
    PRED.y = p.y + Math.cos(p.ang) * e.off;
    return PRED;
  };

  // Daño en área. o: burn, burnT, flat (sin atenuación), naval (multiplicador contra barcos)
  Game.prototype.explode = function (x, y, r, dmg, type, o) {
    o = o || {};
    var i, e, d, f;
    var water = this.waterY != null && y > this.waterY;
    for (i = 0; i < this.enemies.length; i++) {
      e = this.enemies[i];
      if (e.dead || e.gone) continue;
      d = TD.dist(x, y, e.x, e.def.naval ? e.y - 4 : e.y);
      if (d > r + e.r * 0.7) continue;
      f = o.flat || d < r * 0.5 ? 1 : Math.max(0.5, 1 - 0.5 * (d - r * 0.5) / (r * 0.5 + e.r));
      e.damage(dmg * f * (o.naval && e.def.naval ? o.naval : 1), type, {});
      if (o.burn && !e.dead) {
        if (o.burnT > e.burnT) e.burnT = o.burnT;
        if (o.burn > e.burnDps) e.burnDps = o.burn;
      }
    }
    if (water) {
      this.addFx({ k: 'splash', x: x, y: y, r: r * 0.6, dur: 0.6 });
      TD.Audio.play('splash');
    } else {
      this.addFx({ k: 'dust', x: x, y: y, r: r * 0.8, dur: 0.6, seed: x });
      TD.Audio.play('boom');
    }
    this.addFx({ k: 'boom', x: x, y: y - 4, r: r, dur: 0.45, fire: type === 'fuego' });
    if (this.shake < 0.12) this.shake = 0.12;
  };

  Game.prototype.nearestTower = function (x, y, range) {
    var best = null, bd = range, i, t, d;
    for (i = 0; i < this.towers.length; i++) {
      t = this.towers[i];
      if (t.disT > 0) continue;
      d = TD.dist(x, y, t.x, t.y - 10);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  };

  Game.prototype.enemyShootTower = function (e, tw, dmg) {
    var naval = e.def.naval, self = this;
    var sx = e.x + e.face * (naval ? 10 : 12), sy = naval ? e.y - 10 : e.cy() - 2;
    this.addFx({ k: 'flash', x: sx, y: sy, ang: Math.atan2(tw.y - 24 - sy, tw.x - sx), dur: 0.1, s: naval ? 1.8 : 1 });
    if (naval) {
      this.addFx({ k: 'smoke', x: sx, y: sy, dur: 0.9, r: 6, grow: 12 });
      this.projs.push(new TD.Proj(this, 'shell', sx, sy, null, tw.x, tw.y - 14, {
        arc: 34,
        onHit: function (x, y) {
          self.addFx({ k: 'boom', x: x, y: y, r: 26, dur: 0.4 });
          tw.hurt(dmg);
          TD.Audio.play('boom');
        }
      }));
      TD.Audio.play('cannon');
    } else {
      this.projs.push(new TD.Proj(this, 'eshot', sx, sy, null, tw.x, tw.y - 28, { onHit: function () { tw.hurt(dmg); } }));
      TD.Audio.play('shot');
    }
  };

  Game.prototype.enemyShootSoldier = function (e, s, dmg) {
    var sx = e.x + e.face * 12, sy = e.cy() - 2;
    this.addFx({ k: 'flash', x: sx, y: sy, ang: Math.atan2(s.y - 14 - sy, s.x - sx), dur: 0.09 });
    this.projs.push(new TD.Proj(this, 'eshot', sx, sy, s, s.x, s.y - 14, {
      onHit: function (t) { if (t && !t.dead) t.hurt(dmg); }
    }));
    TD.Audio.play('shot');
  };

  /* ---------------- sucesos ---------------- */
  Game.prototype.waveResolved = function (wi) {
    if (wi < 0 || this.waveLeft[wi] == null) return;
    this.waveLeft[wi]--;
    if (this.waveLeft[wi] === 0) {
      var bonus = this.lvl.waves[wi].bonus;
      this.gold += bonus;
      if (this.state === 'running') {
        this.setBanner('Oleada ' + (wi + 1) + ' superada: +' + bonus + ' de oro');
        if (wi + 1 < this.lvl.waves.length) TD.Audio.play('waveclear');
      }
    }
  };

  Game.prototype.onKill = function (e, o) {
    var gold = e.def.gold;
    this.addGold(gold, e.x, e.y - e.h - 2);
    this.stats.kills++;
    this.hero.addXp(o.hero ? gold : gold * 0.2);
    if (e.def.naval) {
      this.addFx({ k: 'boom', x: e.x, y: e.y - 8, r: e.r * 1.4, dur: 0.6, fire: true });
      this.addFx({ k: 'splash', x: e.x, y: e.y + 2, r: e.r * 1.5, dur: 0.8 });
      this.addFx({ k: 'smoke', x: e.x, y: e.y - 14, dur: 1.4, r: 10, grow: 24, rise: 40, color: '#4a443e' });
      TD.Audio.play('boom');
    } else {
      this.addFx({ k: 'puff', x: e.x, y: e.y - 4, dur: 0.45, seed: e.anim });
      TD.Audio.play('die');
    }
    if (e.def.boss) {
      this.setBanner('¡Cayó ' + e.def.name + '!');
      this.shake = 0.5;
      this.addFx({ k: 'ring', x: e.x, y: e.y, r: 140, color: D.GOLD, dur: 0.9, w: 5 });
      if (this.boss === e) this.boss = null;
    }
    if (this.sel && this.sel.enemy === e) this.sel = null;
    TD.Audio.play('coin');
    this.waveResolved(e.wi);
  };

  Game.prototype.enemyReached = function (e) {
    if (e.gone || e.dead) return;
    e.gone = true;
    if (e.blocker) { if (e.blocker.target === e) e.blocker.target = null; e.blocker = null; }
    this.lives -= e.def.lives;
    if (this.lives < 0) this.lives = 0;
    this.stats.leaked++;
    this.shake = 0.3;
    this.lifeFlash = 0.6;
    if (this.boss === e) this.boss = null;
    if (this.sel && this.sel.enemy === e) this.sel = null;
    TD.Audio.play(this.lives > 0 && this.lives <= 5 ? 'alarm' : 'life');
    this.waveResolved(e.wi);
  };

  /* ---------------- oleadas ---------------- */
  Game.prototype.canCall = function () {
    return (this.state === 'prep' || this.state === 'running') && this.waveIdx < this.lvl.waves.length;
  };

  Game.prototype.earlyBonus = function () {
    if (this.state !== 'running' || this.nextTimer <= 0.5) return 0;
    return Math.round(Math.min(this.nextTimer, 40) * 1.2);
  };

  Game.prototype.callWave = function (auto) {
    if (!this.canCall()) return false;
    var i, total = 0, dur = 0, wv = this.lvl.waves[this.waveIdx], g;
    if (this.state === 'prep') {
      this.state = 'running';
    } else if (!auto) {
      var bonus = this.earlyBonus();
      if (bonus > 0) {
        this.gold += bonus;
        if (this.nextTimer >= 5) this.stats.early++;      // cuenta como "adelantada" si faltaban 5 s o más
        this.addText(TD.W - 180, TD.BAR_Y - 20, 'Oleada adelantada: +' + bonus + ' de oro', '#ffd76a', 15);
      }
    }
    for (i = 0; i < wv.groups.length; i++) {
      g = wv.groups[i];
      this.spawners.push({ type: g.type, n: g.n, gap: g.gap, t: g.delay, path: g.path, wi: this.waveIdx });
      total += g.n;
      dur = Math.max(dur, g.delay + (g.n - 1) * g.gap);
    }
    this.waveLeft[this.waveIdx] = total;
    this.waveIdx++;
    this.nextTimer = this.waveIdx < this.lvl.waves.length ? dur + wv.pause : 0;
    this.setBanner(this.waveIdx === this.lvl.waves.length ? '¡Última oleada!' : 'Oleada ' + this.waveIdx);
    TD.Audio.play(this.waveIdx === this.lvl.waves.length ? 'wavefinal' : 'wave');
    return true;
  };

  /* ---------------- construir / vender ---------------- */
  Game.prototype.build = function (slot, key, keepArmed) {
    var def = TD.TOWERS[key];
    if (!slot || slot.tower || !def) return false;
    if (this.gold < def.cost) {
      this.addText(slot.x, slot.y - 30, 'Te falta oro', '#ffb0a0', 14);
      TD.Audio.play('deny');
      return false;
    }
    this.gold -= def.cost;
    var tw = new TD.Tower(this, slot, key);
    slot.tower = tw;
    this.towers.push(tw);
    this.stats.built++;
    if (this.towers.length > this.stats.maxTowers) this.stats.maxTowers = this.towers.length;
    this.addFx({ k: 'dust', x: slot.x, y: slot.y + 4, r: 34, dur: 0.6, seed: slot.x });
    this.addFx({ k: 'ring', x: slot.x, y: slot.y, r: 40, color: D.BLANCO, dur: 0.4 });
    TD.Audio.play('build');
    if (keepArmed) this.sel = null; else { this.sel = { tower: tw }; this.armed = null; }
    return true;
  };

  Game.prototype.sell = function (tw) {
    var i = this.towers.indexOf(tw);
    if (i < 0) return;
    var v = tw.sellValue();
    this.addGold(v, tw.x, tw.y - 40);
    this.stats.sold++;
    tw.dismiss();
    this.towers.splice(i, 1);
    tw.slot.tower = null;
    this.sel = null; this.mode = null;
    this.addFx({ k: 'dust', x: tw.x, y: tw.y, r: 36, dur: 0.6, seed: 9 });
    TD.Audio.play('sell');
  };

  /* ---------------- actualización ---------------- */
  Game.prototype.update = function (dt) {
    var i;
    if (this.paused || this.state === 'won' || this.state === 'lost') return;
    for (i = 0; i < this.speed; i++) {
      this.step(dt);
      if (this.state === 'won' || this.state === 'lost') break;
    }
  };

  function compact(arr) {
    var j = 0, i;
    for (i = 0; i < arr.length; i++) if (!(arr[i].dead || arr[i].gone)) arr[j++] = arr[i];
    arr.length = j;
  }

  Game.prototype.step = function (dt) {
    var i, s, f, t, j;
    this.time += dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.lifeFlash > 0) this.lifeFlash -= dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t >= this.banner.dur) this.banner = null; }

    // oleadas automáticas
    if (this.state === 'running' && this.waveIdx < this.lvl.waves.length) {
      this.nextTimer -= dt;
      if (this.nextTimer <= 0) this.callWave(true);
    }
    // generadores
    for (i = 0; i < this.spawners.length; i++) {
      s = this.spawners[i];
      s.t -= dt;
      while (s.t <= 0 && s.n > 0) {
        this.spawnEnemy(s.type, s.path, s.wi, 0);
        s.n--;
        s.t += s.gap;
      }
    }
    j = 0;
    for (i = 0; i < this.spawners.length; i++) if (this.spawners[i].n > 0) this.spawners[j++] = this.spawners[i];
    this.spawners.length = j;

    for (i = 0; i < this.towers.length; i++) this.towers[i].update(dt);
    for (i = 0; i < this.soldiers.length; i++) this.soldiers[i].update(dt);
    for (i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.dead && !e.gone) e.update(dt);
    }
    for (i = 0; i < this.projs.length; i++) this.projs[i].update(dt);

    // limpieza
    compact(this.enemies);
    j = 0;
    for (i = 0; i < this.soldiers.length; i++) if (!this.soldiers[i].gone) this.soldiers[j++] = this.soldiers[i];
    this.soldiers.length = j;
    j = 0;
    for (i = 0; i < this.projs.length; i++) if (!this.projs[i].dead) this.projs[j++] = this.projs[i];
    this.projs.length = j;

    // efectos y textos
    j = 0;
    for (i = 0; i < this.fx.length; i++) {
      f = this.fx[i];
      f.t += dt;
      if (f.cb && !f.done && f.t >= (f.at || 0)) { f.done = true; f.cb(); }
      if (f.t < f.dur) this.fx[j++] = f;
    }
    this.fx.length = j;
    j = 0;
    for (i = 0; i < this.texts.length; i++) {
      t = this.texts[i];
      t.t += dt;
      if (t.t < t.dur) this.texts[j++] = t;
    }
    this.texts.length = j;

    // humo de los vapores
    if (((this.time * 4) | 0) !== (((this.time - dt) * 4) | 0)) {
      for (i = 0; i < this.enemies.length; i++) {
        var en = this.enemies[i];
        if (en.def.naval && (en.o.ship === 'vapor' || en.o.ship === 'insignia')) {
          this.addFx({ k: 'smoke', x: en.x + en.face * (en.o.ship === 'vapor' ? 2 : 16), y: en.y - 32, dur: 1.6, r: 4, grow: 12, rise: 34, dx: -en.face * 16, color: '#4a443e', a: 0.5 });
        }
      }
    }

    // fin de la batalla
    if (this.lives <= 0) { this.finish(false); return; }
    if (this.state === 'running' && this.waveIdx >= this.lvl.waves.length && this.spawners.length === 0 && this.enemies.length === 0) {
      this.endT += dt;
      if (this.endT > 1.2) this.finish(true);
    }
  };

  Game.prototype.finish = function (win) {
    var i, met = [], stars = 0, S = TD.Save;
    if (this.state === 'won' || this.state === 'lost') return;
    this.sel = null; this.mode = null; this.armed = null;
    if (!win) {
      this.state = 'lost';
      this.result = { win: false, stars: 0, met: [] };
      TD.Audio.play('lose');
      return;
    }
    this.state = 'won';
    for (i = 0; i < this.lvl.stars.length; i++) {
      var ok = TD.objectiveMet(this.lvl.stars[i], this);
      met.push(ok);
      if (ok) stars++;
    }
    this.result = { win: true, stars: stars, met: met };
    var key = String(this.idx);
    if (!(S.data.stars[key] >= stars)) S.data.stars[key] = stars;
    if (S.data.unlocked < this.idx + 2) S.data.unlocked = Math.min(TD.LEVELS.length, this.idx + 2);
    S.save();
    TD.Audio.play('win');
  };

  /* ---------------- entrada ---------------- */
  Game.prototype.slotAt = function (x, y) {
    var i, s;
    for (i = 0; i < this.slots.length; i++) {
      s = this.slots[i];
      if (s.tower) { if (Math.abs(x - s.x) < 30 && y > s.y - 62 && y < s.y + 16) return s; }
      else if (TD.dist(x, y, s.x, s.y - 4) < 30) return s;
    }
    return null;
  };

  Game.prototype.clampLand = function (x, y) {
    x = TD.clamp(x, 20, TD.W - 20);
    y = TD.clamp(y, TD.TOP_H + 30, TD.BAR_Y - 8);
    if (this.waterY != null && y > D.CLIFF_Y - 4) y = D.CLIFF_Y - 4;
    TMP.x = x; TMP.y = y;
    return TMP;
  };

  Game.prototype.click = function (x, y) {
    var i, e, s, p;
    if (this.state === 'won' || this.state === 'lost') return;
    // punto de reunión del cuartel
    if (this.mode === 'rally' && this.sel && this.sel.tower) {
      var tw = this.sel.tower;
      p = this.clampLand(x, y);
      if (TD.dist(tw.x, tw.y, p.x, p.y) <= tw.st.range) {
        tw.setRally(p.x, p.y);
        this.addFx({ k: 'marker', x: p.x, y: p.y, dur: 0.6 });
        TD.Audio.play('click');
      } else {
        this.addText(x, y - 10, 'Demasiado lejos del cuartel', '#ffb0a0', 13);
      }
      this.mode = null;
      return;
    }
    // héroe
    var h = this.hero;
    if (!h.dead && Math.abs(x - h.x) < 18 && y > h.y - h.h - 4 && y < h.y + 8) {
      this.sel = (this.sel && this.sel.hero) ? null : { hero: true };
      this.armed = null;
      TD.Audio.play('click');
      return;
    }
    // solares y torres
    s = this.slotAt(x, y);
    if (s) {
      if (s.tower) { this.sel = { tower: s.tower }; this.armed = null; this.mode = null; }
      else if (this.armed) this.build(s, this.armed, true);
      else this.sel = { slot: s };
      TD.Audio.play('click');
      return;
    }
    // mover al héroe
    if (this.sel && this.sel.hero && !h.dead) {
      p = this.clampLand(x, y);
      h.hx = p.x; h.hy = p.y;
      h.release();
      this.addFx({ k: 'marker', x: p.x, y: p.y, dur: 0.6 });
      return;
    }
    // enemigo: muestra su ficha
    for (i = this.enemies.length - 1; i >= 0; i--) {
      e = this.enemies[i];
      if (e.dead || e.gone) continue;
      if (Math.abs(x - e.x) < e.r + 8 && y > e.y - e.h - 6 && y < e.y + 10) { this.sel = { enemy: e }; return; }
    }
    this.sel = null; this.mode = null;
  };

  /* ---------------- render del mapa ---------------- */
  function byY(a, b) { return a.sy - b.sy; }

  Game.prototype.render = function (ctx) {
    var i, s, t = this.time, dl = this.dl, e;
    ctx.save();
    if (this.shake > 0 && !this.paused) ctx.translate(TD.rand(-1, 1) * this.shake * 8, TD.rand(-1, 1) * this.shake * 8);
    ctx.drawImage(this.bg, 0, 0);

    // brillo del agua
    if (this.waterY != null) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      for (i = 0; i < 14; i++) {
        var wx = ((i * 97 + t * (12 + i % 4 * 4)) % (TD.W + 60)) - 30, wy = this.waterY + 20 + (i * 53) % 200;
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 9, wy - 3, wx + 20, wy); ctx.stroke();
      }
    }

    // salida a defender
    for (i = 0; i < this.exits.length; i++) {
      s = this.exits[i];
      if (s.naval) continue;
      D.flagPole(ctx, s.x, s.y + 4, 46, D.natFlag(), t, 26, 17, 1);
    }

    // solares vacíos
    for (i = 0; i < this.slots.length; i++) {
      s = this.slots[i];
      if (s.tower) continue;
      var hov = TD.dist(this.mx, this.my, s.x, s.y - 4) < 30;
      var isSel = this.sel && this.sel.slot === s;
      D.slot(ctx, s.x, s.y, hov || isSel, t, !!this.armed || isSel);
    }

    // alcance de la torre seleccionada o de la torre "armada" sobre un solar
    var rng = null;
    if (this.sel && this.sel.tower) rng = { x: this.sel.tower.x, y: this.sel.tower.y, r: this.sel.tower.st.range };
    else {
      var key = this.armed, hs = null;
      if (key) hs = this.slotAt(this.mx, this.my);
      if (key && hs && !hs.tower) rng = { x: hs.x, y: hs.y, r: TD.TOWERS[key].base.range };
    }
    if (rng) {
      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.beginPath(); ctx.arc(rng.x, rng.y - 8, rng.r, 0, TAU); ctx.fill();
      ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(rng.x, rng.y - 8, rng.r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.sel && this.sel.tower && this.sel.tower.rally) {
      var r = this.sel.tower.rally;
      ctx.strokeStyle = 'rgba(116,172,223,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, 20, 9, 0, 0, TAU); ctx.stroke();
      D.flagPole(ctx, r.x, r.y, 24, D.natFlag(), t, 12, 8, 1);
    }

    // entidades ordenadas por profundidad
    dl.length = 0;
    for (i = 0; i < this.towers.length; i++) { this.towers[i].sy = this.towers[i].y + 6; dl.push(this.towers[i]); }
    for (i = 0; i < this.soldiers.length; i++) { s = this.soldiers[i]; if (!s.dead) { s.sy = s.y; dl.push(s); } }
    for (i = 0; i < this.enemies.length; i++) { e = this.enemies[i]; if (!e.dead && !e.gone) { e.sy = e.y; dl.push(e); } }
    dl.sort(byY);
    for (i = 0; i < dl.length; i++) dl[i].draw(ctx);

    // selección
    if (this.sel && this.sel.hero && !this.hero.dead) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.ellipse(this.hero.x, this.hero.y, 22, 10, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    if (this.sel && this.sel.enemy && !this.sel.enemy.dead) {
      e = this.sel.enemy;
      ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r + 8, (e.r + 8) * 0.45, 0, 0, TAU); ctx.stroke();
    }
    if (this.sel && this.sel.tower) {
      var st = this.sel.tower;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(st.x, st.y + 4, 32, 13, 0, 0, TAU); ctx.stroke();
    }
    // habilidad lista: destello sobre la torre
    for (i = 0; i < this.towers.length; i++) {
      var tw = this.towers[i];
      if (tw.abilityReady()) {
        var py = tw.y - 92 + Math.sin(t * 5 + i) * 2;
        ctx.fillStyle = D.GOLD; ctx.strokeStyle = D.INK; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(tw.x, py, 9, 0, TAU); ctx.fill(); ctx.stroke();
        D.star(ctx, tw.x, py, 6, false);
      }
    }

    for (i = 0; i < this.projs.length; i++) this.projs[i].draw(ctx);
    for (i = 0; i < this.fx.length; i++) D.fx(ctx, this.fx[i]);
    for (i = 0; i < this.texts.length; i++) {
      var tx = this.texts[i], p = tx.t / tx.dur;
      ctx.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1;
      D.textO(ctx, tx.s, tx.x, tx.y - 26 * p, tx.size, tx.color);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  TD.Game = Game;
})();
