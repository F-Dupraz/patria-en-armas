/* ============================================================
 * towers.js — lógica de las torres: ataque, mejoras por rama,
 * venta y habilidades activas.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD, D = TD.Draw;

  var FORMATION = [[-13, -7], [13, -3], [0, 9]];

  function Tower(g, slot, key) {
    this.g = g; this.slot = slot; this.x = slot.x; this.y = slot.y;
    this.key = key; this.def = TD.TOWERS[key];
    this.branch = -1; this.level = 0;
    this.invested = this.def.cost;
    this.st = TD.merge(this.def.base);
    this.cd = 0.4; this.aim = -0.5; this.face = 1; this.recoil = 0; this.anim = Math.random() * 5; this.shots = 0;
    // seguimiento del blanco y estado de los que atienden la torre (para animarlos)
    this.tgt = null; this.scanT = 0; this.since = 9; this.lastRate = 1; this.aimL = 0.3; this.aimU = 0; this.reload = -1;
    this.maxHp = 140; this.hp = 140; this.disT = 0; this.buffT = 0; this.abCd = 0;
    this.soldiers = [];
    this.rally = null;
    // punto del camino terrestre más cercano (para reunión, montonera, etc.)
    var best = null, bestP = null, i, n;
    for (i = 0; i < g.paths.length; i++) {
      if (g.paths[i].naval) continue;
      n = g.paths[i].nearest(this.x, this.y);
      if (!best || n.dist < best.dist) { best = n; bestP = g.paths[i]; }
    }
    this.near = best || { x: this.x, y: this.y + 40, dist: 40, d: 0 };
    if (this.near.x < this.x) this.face = -1;
    // los soldados, en reposo, miran hacia donde llegan los enemigos
    var idleA = bestP ? bestP.at(this.near.d, {}).ang + Math.PI : null;
    if (key === 'granaderos') {
      this.sst = { hp: 0, dmg: 0, rate: 1, armor: 0, type: 'cont' };
      this.syncSoldierStats();
      this.rally = { x: this.near.x, y: this.near.y };
      for (i = 0; i < 3; i++) {
        var s = new TD.Soldier(g, this, this.x, this.y + 8, this.sst, TD.LOOKS.granadero);
        s.hx = this.rally.x + FORMATION[i][0]; s.hy = this.rally.y + FORMATION[i][1];
        s.idleA = idleA;
        this.soldiers.push(s);
        g.soldiers.push(s);
      }
    }
  }

  Tower.prototype.syncSoldierStats = function () {
    var st = this.st, s = this.sst, i;
    s.hp = st.sHp; s.dmg = st.sDmg; s.rate = st.sRate; s.armor = st.sArmor; s.type = st.type;
    var look = this.branch === 0 ? TD.LOOKS.guardia : (this.branch === 1 ? TD.LOOKS.asalto : TD.LOOKS.granadero);
    for (i = 0; i < this.soldiers.length; i++) {
      var sd = this.soldiers[i];
      var frac = sd.maxHp > 0 ? sd.hp / sd.maxHp : 1;
      sd.maxHp = st.sHp;
      sd.hp = Math.max(sd.hp, st.sHp * frac);
      sd.setLook(look);
    }
  };

  Tower.prototype.setRally = function (x, y) {
    var i;
    this.rally = { x: x, y: y };
    for (i = 0; i < this.soldiers.length; i++) {
      this.soldiers[i].hx = x + FORMATION[i][0];
      this.soldiers[i].hy = y + FORMATION[i][1];
      this.soldiers[i].release();
    }
  };

  /* ---------- Mejoras ---------- */
  // Rango de mejora más alto habilitado en esta batalla (se desbloquean a lo largo de la campaña)
  Tower.prototype.cap = function () { return TD.upgradeCap(this.key, this.g.idx); };
  // La próxima mejora existe pero todavía no está habilitada en esta batalla
  Tower.prototype.locked = function () { return this.level < 3 && this.level >= this.cap(); };
  // Nivel (índice) en que se habilita la próxima mejora
  Tower.prototype.unlockAt = function () { return TD.UPGRADE_UNLOCK[this.key][Math.min(2, this.level)]; };

  // Costo de la próxima mejora en la rama b (o en la ya elegida). null si está al máximo o bloqueada.
  Tower.prototype.upgradeCost = function (b) {
    if (this.level >= 3 || this.locked()) return null;
    var br = this.branch >= 0 ? this.branch : b;
    return this.def.branches[br].levels[this.level].cost;
  };

  Tower.prototype.upgrade = function (b) {
    var g = this.g, cost = this.upgradeCost(b);
    if (cost == null) return false;
    if (g.gold < cost) { TD.Audio.play('deny'); return false; }
    if (this.branch < 0) this.branch = b;
    g.gold -= cost;
    this.invested += cost;
    this.level++;
    this.st = TD.merge(this.def.base, this.def.branches[this.branch].levels[this.level - 1]);
    this.maxHp = 140 + this.level * 40; this.hp = this.maxHp;
    if (this.key === 'granaderos') this.syncSoldierStats();
    g.addFx({ k: 'ring', x: this.x, y: this.y, r: 46, color: D.GOLD, dur: 0.5, w: 3 });
    g.addFx({ k: 'dust', x: this.x, y: this.y + 4, r: 30, dur: 0.6, seed: this.level });
    this.popT = 0.4;
    for (var sp = 0; sp < 5; sp++) TD.Juice.part(g, { k: 'sparkle', x: this.x + TD.rand(-22, 22), y: this.y - TD.rand(20, 60), vx: 0, vy: -TD.rand(15, 35), life: TD.rand(0.5, 0.9), r: TD.rand(2.5, 4) });
    TD.Audio.play('upgrade');
    if (this.level === 3) {
      this.abCd = 2;
      TD.Logros.bump('maxed');
      TD.Logros.bit('br', TD.TOWER_KEYS.indexOf(this.key) * 2 + this.branch);
      g.setBanner('¡Habilidad desbloqueada: ' + this.def.ability.name + '!');
    }
    return true;
  };

  Tower.prototype.sellValue = function () { return Math.round(this.invested * TD.SELL_RATE); };

  Tower.prototype.title = function () {
    var nm = TD.towerName(this.key, this.g.lvl.act);
    if (this.branch < 0) return nm;
    return nm + ' — ' + this.def.branches[this.branch].name + ' ' + ['I', 'II', 'III'][this.level - 1];
  };

  // Texto de estadísticas para el HUD
  Tower.prototype.info = function () {
    var st = this.st, T = TD.DMG[st.type], s;
    if (this.key === 'granaderos') {
      s = 'Soldados: vida ' + st.sHp + ' · daño ' + st.sDmg + ' (' + TD.DMG_NAMES[st.type] + ') · vuelven en ' + st.respawn + ' s';
    } else {
      s = 'Daño ' + st.dmg + ' (' + TD.DMG_NAMES[st.type] + ') · alcance ' + st.range + ' · cada ' + st.rate + ' s';
      if (st.splash) s += ' · área ' + st.splash;
      if (st.slow && !st.ambush) s += ' · frena ' + Math.round(st.slow * 100) + ' %';
      if (st.crit) s += ' · crítico ' + Math.round(st.crit * 100) + ' %';
      if (st.burn) s += ' · quema ' + st.burn + '/s';
      if (st.back) s += ' · espalda +' + Math.round(st.back * 100) + ' %';
      if (st.naval) s += ' · barcos ×' + st.naval;
    }
    s += '   |   vs. ligera ×' + T.ligera + ' · media ×' + T.media + ' · pesada ×' + T.pesada;
    return s;
  };

  /* ---------- Daño recibido (tiradores enemigos, barcos, jefes) ---------- */
  Tower.prototype.hurt = function (d) {
    if (this.disT > 0) return;
    this.hp -= d;
    this.hurtT = 0.25;
    this.g.addFx({ k: 'smoke', x: this.x + TD.rand(-10, 10), y: this.y - 24, dur: 0.6, r: 4, grow: 8 });
    if (this.hp <= 0) {
      this.hp = 0; this.disT = 5;
      this.g.addText(this.x, this.y - 82, '¡Torre fuera de combate!', '#ffb0a0', 14);
      this.g.addFx({ k: 'boom', x: this.x, y: this.y - 18, r: 30, dur: 0.5 });
      this.g.kick(0.3);
      TD.Audio.play('disabled');
    }
  };

  /* ---------- Selección de blancos ---------- */
  Tower.prototype.pickTargets = function (n, range, landOnly, preferFree) {
    var g = this.g, list = [], i, e;
    for (i = 0; i < g.enemies.length; i++) {
      e = g.enemies[i];
      if (e.dead || e.gone || e.invis > 0) continue;
      if (landOnly && e.def.naval) continue;
      if (TD.dist(this.x, this.y - 8, e.x, e.y) > range + (e.def.naval ? e.r * 0.5 : 0)) continue;
      list.push(e);
    }
    if (list.length > 1) {
      list.sort(function (a, b) {
        if (preferFree) {
          var sa = a.slowT > 0.4 ? 1 : 0, sb = b.slowT > 0.4 ? 1 : 0;
          if (sa !== sb) return sa - sb;
        }
        return (a.path.length - a.d) - (b.path.length - b.d);
      });
    }
    if (list.length > n) list.length = n;
    return list;
  };

  /* ---------- Actualización ---------- */
  Tower.prototype.update = function (dt) {
    var g = this.g, st = this.st, i;
    this.anim += dt;
    if (this.popT > 0) this.popT -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 3.2);
    if (this.buffT > 0) this.buffT -= dt;
    if (this.abCd > 0) { this.abCd -= dt; if (this.abCd <= 0 && this.level >= 3) TD.Audio.play('ready'); }
    if (this.disT > 0) {
      this.disT -= dt;
      if (Math.random() < dt * 5) g.addFx({ k: 'smoke', x: this.x + TD.rand(-12, 12), y: this.y - 26, dur: 0.9, r: 4, grow: 9, color: '#6a6258' });
      if (this.disT <= 0) { this.hp = this.maxHp; g.addText(this.x, this.y - 70, 'Reparada', '#cfe8ff', 13); }
      return;
    }
    if (this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 4 * dt);
    if (this.key !== 'granaderos') this.track(dt);

    if (this.key === 'granaderos') {
      for (i = 0; i < this.soldiers.length; i++) {
        var s = this.soldiers[i];
        if (s.dead) {
          s.respawn -= dt;
          if (s.respawn <= 0) { s.revive(this.x, this.y + 8); g.addFx({ k: 'puff', x: this.x, y: this.y + 4, dur: 0.4, seed: i }); }
        }
      }
      return;
    }

    this.cd -= dt;
    if (this.cd > 0) return;
    var rate = st.rate * (this.buffT > 0 ? 0.7 : 1);
    var tg;
    if (this.key === 'tiradores') {
      tg = this.pickTargets(st.targets, st.range, false, false);
      if (!tg.length) { this.cd = 0.12; return; }
      for (i = 0; i < tg.length; i++) this.fireMusket(tg[i]);
      this.cd = rate;
    } else if (this.key === 'artilleria') {
      tg = this.pickTargets(1, st.range, false, false);
      if (!tg.length) { this.cd = 0.12; return; }
      this.fireCannon(tg[0]);
      this.cd = rate;
    } else {
      tg = this.pickTargets(1, st.range, true, !st.ambush);
      if (!tg.length) { this.cd = 0.12; return; }
      if (st.ambush) this.ambush(tg[0]); else this.throwBolas(tg[0]);
      this.cd = rate;
    }
  };

  // Sigue al blanco con la mirada / el caño entre disparo y disparo y decide la pose
  Tower.prototype.track = function (dt) {
    var e = this.tgt, k = this.key;
    this.since += dt;
    if (e && (e.dead || e.gone || e.invis > 0 || TD.dist(this.x, this.y - 8, e.x, e.y) > this.st.range + 40)) e = this.tgt = null;
    if (!e) {
      this.scanT -= dt;
      if (this.scanT <= 0) {
        this.scanT = 0.25;
        var l = this.pickTargets(1, this.st.range + 25, k === 'gauchos', false);
        if (l.length) e = this.tgt = l[0];
      }
    }
    var reloading = false;
    if (k === 'tiradores') {
      var R = this.lastRate;
      reloading = R > 0.75 && this.since > 0.3 && this.since < R - 0.38;
      this.reload = reloading ? (((this.since - 0.3) / Math.max(0.2, R - 0.68)) * 2) % 1 : -1;
      if (e) {
        this.face = e.x >= this.x ? 1 : -1;
        var H = 44 + (this.branch === 0 ? this.level * 3 : 0);
        var want = Math.atan2(e.cy() - (this.y - H - 18), Math.abs(e.x - this.x) + 1);
        this.aimL += (want - this.aimL) * Math.min(1, dt * 8);
      }
      var up = e && !reloading ? 1 : 0;
      this.aimU += (up - this.aimU) * Math.min(1, dt * (up ? 9 : 6));
    } else if (k === 'artilleria') {
      var R2 = this.lastRate;
      this.reload = R2 > 1.2 && this.since > 0.45 && this.since < R2 - 0.8 ? ((this.since - 0.45) / (R2 - 1.25) * 2) % 1 : -1;
      if (e && this.since > 0.3) {
        var wa = Math.atan2(e.y - 14 - (this.y - 20), e.x - this.x);
        var da = wa - this.aim;
        while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        this.aim += TD.clamp(da, -dt * 3, dt * 3);
      }
    } else if (e) {
      this.face = e.x >= this.x ? 1 : -1;
    }
  };

  Tower.prototype.nShooters = function () {
    var b = this.branch, L = this.level;
    return b === 1 ? (L >= 3 ? 3 : (L >= 1 ? 2 : 1)) : 1;
  };

  // Boca del fusil del tirador i, según hacia dónde apunta
  Tower.prototype.muzzle = function (i) {
    var H = 44 + (this.branch === 0 ? this.level * 3 : 0), n = this.nShooters();
    var sx = ((i == null ? 0 : i % n) - (n - 1) / 2) * 11, a = this.aimL, S = 0.82;
    return {
      x: this.x + sx + this.face * (-1.8 + Math.cos(a) * 21) * S,
      y: this.y - H - 3 + (-18.6 + Math.sin(a) * 21) * S
    };
  };

  Tower.prototype.fireMusket = function (e) {
    var g = this.g, st = this.st, self = this;
    this.face = e.x >= this.x ? 1 : -1;
    var H = 44 + (this.branch === 0 ? this.level * 3 : 0);
    this.aimL = Math.atan2(e.cy() - (this.y - H - 18), Math.abs(e.x - this.x) + 1);
    this.aimU = 1; this.tgt = e; this.since = 0; this.lastRate = st.rate * (this.buffT > 0 ? 0.7 : 1);
    var m = this.muzzle(this.shots);
    var crit = st.crit > 0 && Math.random() < st.crit;
    var dmg = st.dmg * (crit ? st.critMult : 1);
    this.recoil = 1; this.shots++;
    g.addFx({ k: 'flash', x: m.x, y: m.y, ang: Math.atan2(e.cy() - m.y, e.x - m.x), dur: 0.09 });
    g.addFx({ k: 'smoke', x: m.x, y: m.y, dur: 0.5, r: 2.5, grow: 6, rise: 10 });
    g.projs.push(new TD.Proj(g, 'bullet', m.x, m.y, e, e.x, e.cy(), {
      onHit: function (t) { if (t) { t.damage(dmg, st.type, { pierce: st.pierce, crit: crit }); TD.Audio.play('hit'); } }
    }));
    TD.Audio.play('shot');
    return self;
  };

  Tower.prototype.fireCannon = function (e) {
    var g = this.g, st = this.st;
    var sx = this.x, sy = this.y - 20;
    var T = TD.clamp(TD.dist(sx, sy, e.x, e.y) / 300, 0.45, 1.1);
    var p = g.predict(e, T);
    this.aim = Math.atan2(p.y - 14 - sy, p.x - sx);
    this.face = p.x >= sx ? 1 : -1;
    this.recoil = 1; this.shots++;
    this.tgt = e; this.since = 0; this.lastRate = st.rate * (this.buffT > 0 ? 0.7 : 1);
    var mx = sx + Math.cos(this.aim) * 24, my = sy + Math.sin(this.aim) * 24;
    g.addFx({ k: 'flash', x: mx, y: my, ang: this.aim, dur: 0.12, s: 1.8 });
    g.addFx({ k: 'smoke', x: mx, y: my, dur: 0.8, r: 6, grow: 12, rise: 14 });
    var fire = st.type === 'fuego';
    g.projs.push(new TD.Proj(g, 'ball', mx, my, null, p.x, p.y - 4, {
      T: T, size: st.ball || 1, fire: fire, arc: 40 + T * 20,
      onHit: function (x, y) { g.explode(x, y, st.splash, st.dmg, st.type, { burn: st.burn, burnT: st.burnT, naval: st.naval }); }
    }));
    TD.Audio.play('cannon');
  };

  Tower.prototype.throwBolas = function (e) {
    var g = this.g, st = this.st;
    this.face = e.x >= this.x ? 1 : -1;
    this.recoil = 1; this.shots++;
    this.tgt = e; this.since = 0;
    g.projs.push(new TD.Proj(g, 'bola', this.x + 25 + this.face * 6, this.y - 20, e, e.x, e.cy(), {
      onHit: function (t, x, y) {
        if (!t) return;
        t.damage(st.dmg, st.type, {});
        t.slow(st.slow, st.slowT);
        if (st.splash) {
          var i, o;
          for (i = 0; i < g.enemies.length; i++) {
            o = g.enemies[i];
            if (o === t || o.dead || o.def.naval) continue;
            if (TD.dist(o.x, o.y, t.x, t.y) < st.splash) o.slow(st.slow * 0.8, st.slowT * 0.8);
          }
          g.addFx({ k: 'ring', x: t.x, y: t.y, r: st.splash, color: D.CELESTE, dur: 0.4, w: 2, a: 0.6 });
        }
      }
    }));
    TD.Audio.play('bola');
  };

  Tower.prototype.ambush = function (e) {
    var g = this.g, st = this.st, self = this;
    this.face = e.x >= this.x ? 1 : -1;
    this.recoil = 1; this.shots++;
    this.tgt = e; this.since = 0;
    // el gaucho aparece detrás del enemigo (opuesto a su dirección de marcha)
    var bx = e.x - Math.cos(e.ang) * 26, by = e.y - Math.sin(e.ang) * 26 + 2;
    g.addFx({
      k: 'ambush', x: bx, y: by, face: e.x >= bx ? 1 : -1, dur: 0.5, at: 0.16,
      cb: function () {
        if (e.dead || e.gone) return;
        e.damage(st.dmg * (1 + st.back), st.type, {});
        e.slow(st.slow, st.slowT);
        g.addFx({ k: 'slash', x: e.x, y: e.cy(), r: 14, ang: Math.atan2(e.y - by, e.x - bx), dur: 0.22 });
        TD.Audio.play('slash');
      }
    });
    g.addFx({ k: 'dust', x: bx, y: by, r: 14, dur: 0.4, seed: this.shots });
    return self;
  };

  /* ---------- Habilidades activas (rama completa) ---------- */
  Tower.prototype.abilityReady = function () {
    return this.level >= 3 && this.abCd <= 0 && this.disT <= 0;
  };

  Tower.prototype.useAbility = function () {
    var g = this.g, st = this.st, i, e, tg, n = 0;
    if (!this.abilityReady()) return false;
    if (this.key === 'granaderos') {
      // Carga al sable: empuja y aturde
      var rx = this.rally.x, ry = this.rally.y;
      for (i = 0; i < g.enemies.length; i++) {
        e = g.enemies[i];
        if (e.dead || e.def.naval) continue;
        if (TD.dist(rx, ry, e.x, e.y) < 120) {
          if (!e.def.boss) { e.d = Math.max(0, e.d - 70); e.updatePos(); }
          e.stun(2.6);
          e.damage(this.branch === 1 ? 90 : 60, st.type, {});
          n++;
        }
      }
      for (i = 0; i < this.soldiers.length; i++) {
        if (!this.soldiers[i].dead) this.soldiers[i].hp = Math.min(this.soldiers[i].maxHp, this.soldiers[i].hp + this.soldiers[i].maxHp * 0.5);
      }
      g.addFx({ k: 'charge', x: rx, y: ry, face: this.face, dur: 0.8 });
      g.addFx({ k: 'ring', x: rx, y: ry, r: 120, color: D.BLANCO, dur: 0.5, w: 4 });
      g.addFx({ k: 'dust', x: rx, y: ry, r: 80, dur: 0.8, seed: 3 });
      g.addText(rx, ry - 56, '¡A la carga!', '#ffffff', 17);
      g.kick(0.3);
      TD.Audio.play('ability');
    } else if (this.key === 'artilleria') {
      // Descarga de metralla
      tg = this.pickTargets(1, st.range * 1.25, false, false);
      if (!tg.length) { g.addText(this.x, this.y - 70, 'Sin blancos a tiro', '#f0d8c8', 13); return false; }
      e = tg[0];
      this.aim = Math.atan2(e.y - (this.y - 20), e.x - this.x);
      this.recoil = 1;
      var R = this.branch === 1 ? 150 : 130;
      g.addFx({ k: 'pellets', x: this.x, y: this.y - 20, x2: e.x, y2: e.y - 8, dur: 0.35 });
      g.addFx({ k: 'flash', x: this.x + Math.cos(this.aim) * 24, y: this.y - 20 + Math.sin(this.aim) * 24, ang: this.aim, dur: 0.15, s: 2.6 });
      g.explode(e.x, e.y, R, this.branch === 1 ? 150 : 190, st.type, { burn: st.burn, burnT: st.burnT, flat: true, naval: st.naval });
      g.addText(this.x, this.y - 70, '¡Metralla!', '#ffffff', 17);
      TD.Audio.play('cannon');
    } else if (this.key === 'tiradores') {
      // Tiro certero: atraviesa a todos los enemigos en línea
      tg = this.pickTargets(1, st.range * 1.5, false, false);
      if (!tg.length) { g.addText(this.x, this.y - 90, 'Sin blancos a tiro', '#f0d8c8', 13); return false; }
      e = tg[0];
      this.face = e.x >= this.x ? 1 : -1;
      this.aimL = Math.atan2(e.cy() - this.muzzle().y, Math.abs(e.x - this.x) + 1); this.aimU = 1; this.since = 0; this.tgt = e;
      var m = this.muzzle(), ang = Math.atan2(e.cy() - m.y, e.x - m.x);
      var ex = m.x + Math.cos(ang) * 720, ey = m.y + Math.sin(ang) * 720;
      var dx = Math.cos(ang), dy = Math.sin(ang);
      for (i = 0; i < g.enemies.length; i++) {
        var o = g.enemies[i];
        if (o.dead) continue;
        var px = o.x - m.x, py = o.cy() - m.y;
        var along = px * dx + py * dy;
        if (along < 0 || along > 720) continue;
        var perp = Math.abs(px * dy - py * dx);
        if (perp <= 16 + o.r) { o.damage(this.branch === 0 ? 320 : 220, 'perf', { pierce: 0.5 }); n++; }
      }
      this.recoil = 1;
      g.addFx({ k: 'tracer', x: m.x, y: m.y, x2: ex, y2: ey, dur: 0.45, w: 6, color: '#ffe9a0' });
      g.addFx({ k: 'flash', x: m.x, y: m.y, ang: ang, dur: 0.15, s: 2.2 });
      g.addText(this.x, this.y - 96, '¡Tiro certero!', '#ffffff', 17);
      TD.Audio.play('shot');
    } else {
      // Montonera: gauchos a caballo por unos segundos
      var nx = this.near.x, ny = this.near.y;
      for (i = 0; i < 5; i++) {
        var s = new TD.Soldier(g, null, this.x + TD.rand(-10, 10), this.y + TD.rand(0, 12), {
          hp: 150, dmg: this.branch === 1 ? 34 : 24, rate: 0.7, armor: 0.1, type: 'perf', life: 9, spd: 150, engage: 95
        }, TD.LOOKS.gaucho);
        s.hx = nx + (i - 2) * 16 + TD.rand(-4, 4); s.hy = ny + ((i % 2) ? -9 : 9);
        s.r = 10;
        g.soldiers.push(s);
      }
      g.addFx({ k: 'dust', x: nx, y: ny, r: 70, dur: 0.9, seed: 5 });
      g.addText(this.x, this.y - 60, '¡Montonera!', '#ffffff', 17);
      TD.Audio.play('horn');
    }
    this.abCd = this.def.ability.cd;
    TD.Logros.bump('abil');
    return true;
  };

  // Al vender: los soldados se retiran
  Tower.prototype.dismiss = function () {
    var i;
    for (i = 0; i < this.soldiers.length; i++) {
      this.soldiers[i].release();
      this.soldiers[i].dead = true;
      this.soldiers[i].gone = true;
    }
    this.soldiers.length = 0;
  };

  Tower.prototype.draw = function (ctx) { D.tower(ctx, this); };

  TD.Tower = Tower;
})();
