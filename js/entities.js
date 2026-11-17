/* ============================================================
 * entities.js — enemigos (comunes, élites, jefes, navales),
 * soldados propios, héroe y proyectiles.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD, D = TD.Draw;
  var TAU = Math.PI * 2;
  var TMP = {};
  var J = TD.Juice;

  /* Orientación: cada unidad tiene un ángulo de mirada (dirA) que gira de a poco
   * hacia el deseado. De ahí salen la vista (perfil / frente / espaldas), el lado
   * (face) y un leve "afinamiento" (fw) mientras gira, que se lee como un giro. */
  function angWrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
  function steer(u, want, side, dt) {
    var d = angWrap(want - u.dirA);
    // media vuelta: gira pasando por el frente (mirando a cámara), como un muñeco de verdad
    if (Math.abs(d) > 2.9) d = (angWrap(Math.PI / 2 - u.dirA) >= 0 ? 1 : -1) * Math.abs(d);
    var mx = 11 * dt, st = d > mx ? mx : (d < -mx ? -mx : d);
    u.dirA = angWrap(u.dirA + st);
    var rate = dt > 0 ? Math.abs(st) / dt : 0;
    var fwT = 1 - 0.42 * Math.min(1, rate / 8);
    u.fw += (fwT - u.fw) * Math.min(1, dt * 18);
    var cx = Math.cos(u.dirA), cy = Math.sin(u.dirA);
    if (side) u.view = 0;
    else if (u.view === 0) { if (Math.abs(cy) > 0.8) u.view = cy > 0 ? 1 : -1; }
    else if (Math.abs(cy) < 0.64) u.view = 0;
    else u.view = cy > 0 ? 1 : -1;
    if (cx > 0.08) u.face = 1; else if (cx < -0.08) u.face = -1;
  }
  TD.steer = steer;

  /* =========================== ENEMIGO =========================== */
  function Enemy(g, type, pi, wi, d0) {
    var def = TD.ENEMIES[type], k;
    this.g = g; this.type = type; this.def = def;
    this.pi = pi; this.path = g.paths[pi]; this.wi = wi;
    this.maxHp = Math.round(def.hp * (g.lvl.hpMul || 1) * TD.diffHp(g.spawnDm || g.dm, def));      // spawnDm: Resistencia (la vida de su oleada)
    this.hp = this.maxHp;
    this.d = d0 || 0;
    this.off = (def.naval || def.boss) ? 0 : TD.rand(-9, 9);
    this.r = def.r || 9;
    this.spdMul = 1;
    this.slowF = 0; this.slowT = 0; this.stunT = 0; this.burnT = 0; this.burnDps = 0;
    this.blocker = null;
    this.atkT = TD.rand(0, 0.5); this.rangedT = TD.rand(0.6, 1.6);
    this.invis = 0; this.invisCd = 4; this.healT = 2.5; this.sinceHit = 99; this.effT = 0;
    this.phase = 1; this.towerT = 2;
    this.dead = false; this.gone = false; this.moving = true;
    this.anim = Math.random() * 10; this.atkAnim = 0; this.hitFlash = 0;
    this.x = 0; this.y = 0; this.ang = 0; this.face = 1;
    this.dirA = null; this.view = 0; this.fw = 1; this.hurtT = 0;
    this.aimA = 0; this.aimU = 0; this.shot = null; this.lookX = 0; this.wind = 0; this.ready = false;
    // copia del aspecto con campos dinámicos (evita crear objetos por cuadro)
    this.o = {};
    for (k in def.look) if (Object.prototype.hasOwnProperty.call(def.look, k)) this.o[k] = def.look[k];
    var s = this.o.s || 1;
    if (def.naval) this.h = { lancha: 34, bergantin: 50, vapor: 50, insignia: 62 }[this.o.ship] || 40;
    else this.h = (this.o.kind === 'cav' ? 44 : 38) * s;
    this.updatePos();
  }

  Enemy.prototype.updatePos = function () {
    var p = this.path.at(this.d, TMP);
    this.ang = p.ang;
    var c = Math.cos(p.ang), s = Math.sin(p.ang);
    this.x = p.x - s * this.off;
    this.y = p.y + c * this.off;
    if (this.dirA == null) this.dirA = p.ang;
    if (this.def.naval || this.dirA === p.ang) { if (c > 0.15) this.face = 1; else if (c < -0.15) this.face = -1; }
  };

  // Boca del arma según la pose (fusil apuntando o pistola del jefe)
  Enemy.prototype.muzzle = function (out) {
    var s = this.o.s || 1, a = this.aimA, cav = this.o.kind === 'cav';
    var bx = cav ? -1.6 : -1.8, by = cav ? -32.3 : -18.6, L = this.def.boss ? 15 : 21;
    out.x = this.x + this.face * (bx + Math.cos(a) * L) * s;
    out.y = this.y + (by + Math.sin(a) * L) * s;
    return out;
  };

  // Elevación del arma hacia un punto (en el espacio de perfil de la figura)
  Enemy.prototype.aimAt = function (tx, ty) {
    var sy = this.cy() - 2;
    this.aimA = Math.atan2(ty - sy, Math.abs(tx - this.x) + 1);
  };

  // Centro aproximado del cuerpo (para apuntar)
  Enemy.prototype.cy = function () { return this.def.naval ? this.y - 8 : this.y - this.h * 0.42; };

  Enemy.prototype.slow = function (f, t) {
    if (this.def.naval) return;
    if (this.def.boss) f *= 0.5;
    if (f > this.slowF) this.slowF = f;
    if (t > this.slowT) this.slowT = t;
  };

  Enemy.prototype.stun = function (t) {
    if (this.def.naval) return;
    if (this.def.boss) t *= 0.3;
    if (t > this.stunT) this.stunT = t;
  };

  /* Aplica daño con la tabla tipo/armadura. o: pierce, crit, quiet, hero */
  Enemy.prototype.damage = function (amt, type, o) {
    if (this.dead) return 0;
    o = o || {};
    var m = TD.DMG[type][this.def.armor];
    if (o.pierce) m += o.pierce * 0.5;
    var dealt = amt * m;
    this.hp -= dealt;
    this.sinceHit = 0;
    this.hitFlash = 0.1;
    if (!o.aoe || this.hurtT <= 0) this.hurtT = 0.2;
    // la eficacia se ve en las chispas y el número, sin carteles de texto
    if (!o.aoe && !(o.quiet && Math.random() < 0.5)) J.hit(this.g, this, m, o.crit, type);
    J.addDmg(this.g, this, dealt, m, o.crit);
    if (this.hp <= 0) this.die(o);
    return dealt;
  };

  Enemy.prototype.die = function (o) {
    if (this.dead) return;
    this.dead = true;
    if (this.blocker) {
      if (this.blocker.target === this) this.blocker.target = null;
      this.blocker = null;
    }
    this.g.onKill(this, o || {});
  };

  Enemy.prototype.summon = function () {
    var b = this.def.boss, i;
    for (i = 0; i < b.n; i++) {
      this.g.spawnEnemy(b.summon, this.pi, -1, Math.max(0, this.d - 24 - i * (this.def.naval ? 46 : 16)));
    }
    this.g.addFx({ k: 'ring', x: this.x, y: this.y, r: 90, color: '#ffb347', dur: 0.7, w: 4 });
  };

  Enemy.prototype.bossLogic = function (dt) {
    var g = this.g, def = this.def, f = this.hp / this.maxHp, i;
    if (this.phase === 1 && f < 0.66) {
      this.phase = 2; this.spdMul = 1.3;
      this.summon();
      g.setBanner('¡' + def.name + ' aprieta el paso y pide refuerzos!');
      TD.Audio.play('horn');
      g.kick(0.3); g.hitStop(0.08);
    } else if (this.phase === 2 && f < 0.33) {
      this.phase = 3; this.spdMul = 1.55;
      this.summon();
      g.setBanner('¡' + def.name + ' ataca las torres!');
      TD.Audio.play('horn');
      g.kick(0.45); g.hitStop(0.08);
      if (!def.naval) {
        for (i = 0; i < g.soldiers.length; i++) {
          var s = g.soldiers[i];
          if (!s.dead && TD.dist(s.x, s.y, this.x, this.y) < 110) s.stunT = 2;
        }
      }
    }
    if (this.phase === 3) {
      this.towerT -= dt;
      if (this.towerT <= 0) {
        this.towerT = def.naval ? 1.8 : 2.4;
        var tw = g.nearestTower(this.x, this.y, 290);
        if (tw) {
          if (def.naval) { g.enemyShootTower(this, tw, def.boss.towerDmg); this.atkAnim = 1; }
          else if (!this.shot) this.shot = { tgt: tw, soldier: false, ph: 0, t: 0.4, dmg: def.boss.towerDmg };
        }
      }
    }
  };

  Enemy.prototype.eliteLogic = function (dt) {
    var g = this.g, i, e;
    switch (this.def.elite) {
      case 'heal':
        this.healT -= dt;
        if (this.healT <= 0) {
          this.healT = 3.5;
          var any = false;
          for (i = 0; i < g.enemies.length; i++) {
            e = g.enemies[i];
            if (e === this || e.dead || e.def.naval || e.hp >= e.maxHp) continue;
            if (TD.dist(e.x, e.y, this.x, this.y) < 120) {
              e.hp = Math.min(e.maxHp, e.hp + Math.min(70, e.maxHp * 0.12));
              g.addFx({ k: 'heal', x: e.x, y: e.y - e.h, dur: 0.8 });
              any = true;
            }
          }
          if (any) g.addFx({ k: 'ring', x: this.x, y: this.y, r: 120, color: '#7fd66a', dur: 0.6, w: 2, a: 0.6 });
        }
        break;
      case 'invis':
        if (this.invis > 0) {
          this.invis -= dt;
        } else {
          this.invisCd -= dt;
          if (this.invisCd <= 0) {
            this.invis = 3.5; this.invisCd = 9;
            if (this.blocker) { if (this.blocker.target === this) this.blocker.target = null; this.blocker = null; }
            g.addFx({ k: 'puff', x: this.x, y: this.y - 10, dur: 0.5, color: '#6a5a7a', seed: this.anim });
          }
        }
        break;
      case 'regen':
        if (this.sinceHit > 2.5 && this.hp < this.maxHp) {
          this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.05 * dt);
          this.regenFx = (this.regenFx || 0) - dt;
          if (this.regenFx <= 0) { this.regenFx = 0.7; g.addFx({ k: 'heal', x: this.x, y: this.y - this.h, dur: 0.7 }); }
        }
        break;
    }
  };

  // Disparo en curso: se frena, gira hacia el blanco, apunta, dispara y baja el arma.
  Enemy.prototype.shotLogic = function (dt) {
    var g = this.g, sh = this.shot, tg = sh.tgt;
    sh.t -= dt;
    if (sh.ph === 0) {
      if (sh.soldier ? (tg.dead || tg.gone) : tg.disT > 0) { this.shot = null; this.rangedT = Math.min(this.rangedT, 0.25); return; }
      this.lookX = tg.x;
      this.aimAt(tg.x, sh.soldier ? tg.y - 14 : tg.y - 28);
      if (sh.t <= 0) {
        if (sh.soldier) g.enemyShootSoldier(this, tg, sh.dmg); else g.enemyShootTower(this, tg, sh.dmg);
        this.atkAnim = 1; sh.ph = 1; sh.t = 0.22;
      }
    } else if (sh.t <= 0) this.shot = null;
  };

  // Enemigos con ataque a distancia: priorizan soldados, luego torres.
  Enemy.prototype.rangedLogic = function (dt) {
    var g = this.g, r = this.def.ranged, i, s, d;
    this.rangedT -= dt;
    if (this.shot || this.rangedT > 0) return;
    if (this.def.naval) {
      var tn = g.nearestTower(this.x, this.y, r.range);
      if (tn) { this.rangedT = r.rate; this.atkAnim = 1; g.enemyShootTower(this, tn, r.towerDmg); }
      else this.rangedT = 0.35;
      return;
    }
    if (r.dmg) {
      var tgt = null, best = r.range;
      for (i = 0; i < g.soldiers.length; i++) {
        s = g.soldiers[i];
        if (s.dead) continue;
        d = TD.dist(this.x, this.y, s.x, s.y);
        if (d < best) { best = d; tgt = s; }
      }
      if (tgt) {
        this.rangedT = r.rate;
        this.shot = { tgt: tgt, soldier: true, ph: 0, t: 0.34, dmg: r.dmg };
        return;
      }
    }
    var tw = g.nearestTower(this.x, this.y, r.range);
    if (tw) {
      this.rangedT = r.rate;
      this.shot = { tgt: tw, soldier: false, ph: 0, t: 0.34, dmg: r.towerDmg };
      return;
    }
    this.rangedT = 0.35;
  };

  Enemy.prototype.update = function (dt) {
    var g = this.g, def = this.def;
    this.anim += dt; this.sinceHit += dt; this.effT -= dt; this.hitFlash -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    J.tickDmg(g, this, dt);
    if (this.atkAnim > 0) this.atkAnim = Math.max(0, this.atkAnim - dt * 3.5);
    if (this.burnT > 0) {
      this.burnT -= dt;
      this.hp -= this.burnDps * TD.DMG.fuego[def.armor] * dt;
      this.sinceHit = 0;
      if (this.hp <= 0) { this.die({}); return; }
    }
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowF = 0; }
    if (def.boss) this.bossLogic(dt);
    if (def.elite) this.eliteLogic(dt);
    if (this.dead) return;
    this.wind = 0; this.ready = false;
    if (this.stunT > 0) { this.stunT -= dt; this.moving = false; this.shot = null; return; }

    var b = this.blocker, held = false, contact = false;
    if (b && (b.dead || b.target !== this)) this.blocker = b = null;
    if (b) {
      var dd = TD.dist(this.x, this.y, b.x, b.y);
      if (dd < 66) { held = true; contact = dd < this.r + 24; }
    }
    // a quemarropa pelea con la bayoneta; si no, dispara
    if (contact && !def.naval && !def.boss) this.shot = null;
    else if (def.ranged) this.rangedLogic(dt);
    if (this.shot) this.shotLogic(dt);

    var want = this.ang, side = false;
    if (held) {
      this.moving = false;
      if (contact) {
        side = true; want = b.x >= this.x ? 0 : Math.PI;
        this.ready = true;
        this.atkT -= dt;
        this.wind = TD.clamp(1 - this.atkT / 0.3, 0, 1);
        if (this.atkT <= 0) {
          this.atkT = def.rate || 1;
          this.atkAnim = 1; this.wind = 0;
          b.hurt((def.dmg || 5) * g.dm.dmg, this);
        }
      } else want = Math.atan2(b.y - this.y, b.x - this.x);
    } else if (this.shot) {
      this.moving = false;
      side = true; want = this.lookX >= this.x ? 0 : Math.PI;
    } else {
      var v = def.spd * g.dm.spd * this.spdMul * (1 - this.slowF);
      if (def.naval && g.lvl.chainX && Math.abs(this.x - g.lvl.chainX) < 34) v *= 0.3;     // las cadenas frenan a los barcos
      this.d += v * dt;
      this.moving = true;
      this.updatePos();
      want = this.ang;
    }
    if (!def.naval) {
      steer(this, want, side, dt);
      var up = this.shot ? 1 : 0;
      this.aimU += (up - this.aimU) * Math.min(1, dt * (up ? 9 : 6));
    }
    if (this.moving && this.d >= this.path.length) g.enemyReached(this);
  };

  function drawShip(c, e) { D.ship(c, e.x, e.y, e.o); }
  function drawUnit(c, u) { D.unit(c, u.x, u.y, u.o); }

  Enemy.prototype.draw = function (ctx) {
    var def = this.def, o = this.o, x = this.x, y = this.y, t = this.anim, i;
    var fl = this.hitFlash > 0 && this.invis <= 0 ? this.hitFlash / 0.1 : 0;
    o.face = this.face; o.t = t; o.walk = this.moving; o.atk = this.atkAnim;
    o.alpha = this.invis > 0 ? 0.28 : 1;
    if (!def.naval) {
      o.view = this.view; o.fw = this.fw; o.ready = this.ready; o.wind = this.wind;
      o.hurt = this.hurtT > 0 ? this.hurtT / 0.2 : 0;
      o.spd = 0.6 + def.spd / 90;
      o.aimA = this.aimA;
      if (def.boss) { o.pistol = this.aimU; o.aimUp = 0; } else o.aimUp = this.aimU;
      o.dizzy = this.stunT > 0;
    }
    o.sq = def.naval ? 0 : fl * 0.1;
    if (def.boss && !def.naval) {
      ctx.strokeStyle = 'rgba(207,43,43,' + (0.5 + Math.sin(t * 5) * 0.2) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y, 30, 12, 0, 0, TAU); ctx.stroke();
    }
    if (def.naval) {
      J.drawFlashed(ctx, x, y, 80, 90, 16, fl * 0.55, drawShip, this);
    } else {
      D.shadow(ctx, x, y + 1, this.r * 1.05, this.r * 0.42);
      if (this.slowT > 0) {
        ctx.strokeStyle = 'rgba(116,172,223,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y - 3, this.r * 0.9, 3.5, 0, 0, TAU); ctx.stroke();
      }
      J.drawFlashed(ctx, x, y, 42, this.h + 26, 6, fl * 0.75, drawUnit, this);
    }
    if (this.burnT > 0) {
      ctx.fillStyle = '#ff9b2f';
      for (i = 0; i < 2; i++) {
        var fx = x - 5 + i * 9, fy = this.cy() + 4;
        ctx.beginPath(); ctx.moveTo(fx - 3, fy); ctx.quadraticCurveTo(fx + Math.sin(t * 12 + i) * 2, fy - 12, fx, fy - 13 - Math.sin(t * 9 + i) * 2); ctx.quadraticCurveTo(fx + 3, fy - 6, fx + 3, fy); ctx.closePath(); ctx.fill();
      }
    }
    if (this.stunT > 0) {
      for (i = 0; i < 3; i++) {
        var a = t * 6 + i * TAU / 3;
        D.star(ctx, x + Math.cos(a) * 9, y - this.h - 2 + Math.sin(a) * 3, 3.2, true);
      }
    }
    if (def.elite && this.invis <= 0) {
      ctx.fillStyle = D.GOLD; ctx.strokeStyle = D.INK; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 6, y - this.h - 9); ctx.lineTo(x, y - this.h - 14); ctx.lineTo(x + 6, y - this.h - 9); ctx.lineTo(x, y - this.h - 11.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (!def.boss && this.hp < this.maxHp && this.invis <= 0) {
      D.hpBar(ctx, x, y - this.h - 5, def.naval ? 44 : (def.elite ? 30 : 20), this.hp / this.maxHp);
    }
  };

  TD.Enemy = Enemy;

  /* =========================== SOLDADO =========================== */
  // st: hp, dmg, rate, armor, type, spd, engage, life (temporal), regen
  function Soldier(g, tower, x, y, st, look) {
    var k;
    this.g = g; this.tower = tower;
    this.x = x; this.y = y; this.hx = x; this.hy = y;
    this.st = st;
    this.maxHp = st.hp; this.hp = st.hp;
    this.target = null; this.atkT = 0;
    this.dead = false; this.respawn = 0; this.idleT = 0;
    this.face = 1; this.anim = Math.random() * 5; this.atkAnim = 0; this.stunT = 0; this.moving = false;
    this.temp = !!st.life; this.life = st.life || 0;
    this.fo = TD.rand(-7, 7);
    this.spd = st.spd || 105; this.engage = st.engage || 62;
    this.r = 8; this.isHero = false; this.gone = false; this.hitFlash = 0;
    this.dirA = 0; this.view = 0; this.fw = 1; this.hurtT = 0; this.wind = 0; this.ready = false;
    this.mvA = 0; this.idleA = null; this.eTgt = null; this.eSide = 1;
    this.o = {};
    for (k in look) if (Object.prototype.hasOwnProperty.call(look, k)) this.o[k] = look[k];
    this.h = (this.o.kind === 'cav' ? 44 : 38) * (this.o.s || 1);
  }

  Soldier.prototype.setLook = function (look) {
    var k;
    for (k in this.o) if (Object.prototype.hasOwnProperty.call(this.o, k)) delete this.o[k];
    for (k in look) if (Object.prototype.hasOwnProperty.call(look, k)) this.o[k] = look[k];
    this.h = (this.o.kind === 'cav' ? 44 : 38) * (this.o.s || 1);
  };

  Soldier.prototype.release = function () {
    var e = this.target;
    if (e && e.blocker === this) e.blocker = null;
    this.target = null;
  };

  Soldier.prototype.findTarget = function () {
    var g = this.g, best = null, bestD = Infinity, help = null, helpD = Infinity, i, e, d;
    for (i = 0; i < g.enemies.length; i++) {
      e = g.enemies[i];
      if (e.dead || e.gone || e.def.naval || e.invis > 0) continue;
      if (TD.dist(this.hx, this.hy, e.x, e.y) > this.engage) continue;
      d = TD.dist(this.x, this.y, e.x, e.y);
      if (!e.blocker) { if (d < bestD) { bestD = d; best = e; } }
      else if (d < helpD) { helpD = d; help = e; }
    }
    return best || help;
  };

  Soldier.prototype.moveTo = function (tx, ty, dt) {
    var dx = tx - this.x, dy = ty - this.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 3) { this.moving = false; return true; }
    var step = this.spd * dt;
    if (step >= d) { this.x = tx; this.y = ty; this.moving = false; return true; }
    this.x += dx / d * step; this.y += dy / d * step;
    this.mvA = Math.atan2(dy, dx);
    this.moving = true;
    return false;
  };

  Soldier.prototype.hurt = function (dmg) {
    if (this.dead) return;
    this.hp -= dmg * (1 - (this.st.armor || 0));
    this.idleT = 0;
    this.hitFlash = 0.08;
    this.hurtT = 0.18;
    if (this.hp <= 0) this.die();
  };

  Soldier.prototype.die = function () {
    this.dead = true;
    this.release();
    J.fall(this.g, this);
    if (this.tower) this.respawn = this.tower.st.respawn;
    else if (!this.isHero) this.gone = true;
  };

  Soldier.prototype.revive = function (x, y) {
    this.dead = false; this.hp = this.maxHp; this.x = x; this.y = y; this.target = null; this.stunT = 0; this.idleT = 0;
  };

  // Hacia dónde mira cuando está quieto: al enemigo más cercano o hacia donde vienen.
  Soldier.prototype.idleLook = function () {
    var g = this.g, i, e, best = null, bd = this.engage + 90, d;
    for (i = 0; i < g.enemies.length; i++) {
      e = g.enemies[i];
      if (e.dead || e.gone || e.def.naval || e.invis > 0) continue;
      d = TD.dist(this.x, this.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) { this.lookSide = true; return best.x >= this.x ? 0 : Math.PI; }
    if (this.idleA != null) { this.lookSide = false; return this.idleA; }
    this.lookSide = true;
    return this.face > 0 ? 0 : Math.PI;
  };

  Soldier.prototype.update = function (dt) {
    if (this.dead) return;
    this.anim += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.atkAnim > 0) this.atkAnim = Math.max(0, this.atkAnim - dt * 3.5);
    this.wind = 0; this.ready = false;
    if (this.temp) {
      this.life -= dt;
      if (this.life <= 0) { this.dead = true; this.gone = true; this.release(); this.g.addFx({ k: 'puff', x: this.x, y: this.y, dur: 0.5, seed: this.anim }); return; }
    }
    if (this.stunT > 0) { this.stunT -= dt; this.moving = false; return; }

    var want = this.dirA, side = false;
    var e = this.target;
    if (e && (e.dead || e.gone || e.invis > 0 || TD.dist(this.hx, this.hy, e.x, e.y) > this.engage + 55)) {
      this.release(); e = null;
    }
    if (!e) {
      e = this.findTarget();
      if (e) { this.target = e; if (!e.blocker) e.blocker = this; }
    }
    if (e) {
      this.idleT = 0;
      // se planta al costado del enemigo, cara a cara (el de adelante) o flanqueando
      if (this.eTgt !== e) { this.eTgt = e; this.eSide = this.x >= e.x ? 1 : -1; }
      var sd = this.eSide, tx, ty;
      if (e.blocker === this) { tx = e.x + sd * (e.r + 10); ty = e.y + 1; }
      else {
        var fb = e.blocker, fs = fb && fb.eTgt === e ? fb.eSide : -sd;
        if (fs === sd) { tx = e.x + sd * (e.r + 6); ty = e.y + (this.fo > 0 ? 1 : -1) * (e.r * 0.5 + 6); }
        else { tx = e.x + sd * (e.r + 10); ty = e.y + this.fo * 0.4; }
      }
      var arrived = this.moveTo(tx, ty, dt);
      if (arrived || TD.dist(this.x, this.y, e.x, e.y) < e.r + 16) {
        side = true; want = e.x >= this.x ? 0 : Math.PI;
        this.ready = true;
        this.atkT -= dt;
        this.wind = TD.clamp(1 - this.atkT / 0.3, 0, 1);
        if (this.atkT <= 0) {
          this.atkT = this.st.rate;
          this.atkAnim = 1; this.wind = 0;
          e.damage(this.st.dmg, this.st.type || 'cont', { hero: this.isHero, quiet: !this.isHero && Math.random() < 0.6 });
          if (this.isHero) { TD.Audio.play('slash'); this.g.addFx({ k: 'slash', x: e.x, y: e.cy(), r: 13, ang: this.face > 0 ? 0 : Math.PI, dur: 0.22 }); }
        }
      } else want = this.mvA;
    } else {
      this.eTgt = null;
      var home = this.moveTo(this.hx, this.hy, dt);
      if (home) {
        this.idleT += dt;
        if (this.idleT > 2 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.07 * dt);
        want = this.idleLook(); side = this.lookSide;
      } else want = this.mvA;
    }
    steer(this, want, side, dt);
    if (this.st.regen && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.st.regen * dt);
  };

  Soldier.prototype.draw = function (ctx) {
    if (this.dead) return;
    var o = this.o, i;
    o.face = this.face; o.t = this.anim; o.walk = this.moving; o.atk = this.atkAnim;
    o.alpha = this.temp && this.life < 1 ? Math.max(0.2, this.life) : 1;
    o.view = this.view; o.fw = this.fw; o.ready = this.ready; o.wind = this.wind;
    o.hurt = this.hurtT > 0 ? this.hurtT / 0.18 : 0;
    o.spd = 0.6 + this.spd / 140;
    o.dizzy = this.stunT > 0;
    var fl = this.hitFlash > 0 ? this.hitFlash / 0.08 : 0;
    o.sq = fl * 0.08;
    D.shadow(ctx, this.x, this.y + 1, this.isHero ? 13 : 8, this.isHero ? 5 : 3.5);
    if (this.isHero) {
      ctx.strokeStyle = 'rgba(224,174,50,' + (0.65 + Math.sin(this.anim * 4) * 0.2) + ')'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(this.x, this.y, 17, 7, 0, 0, TAU); ctx.stroke();
    }
    J.drawFlashed(ctx, this.x, this.y, 42, this.h + 26, 6, fl * 0.6, drawUnit, this);
    if (this.stunT > 0) {
      for (i = 0; i < 3; i++) {
        var a = this.anim * 6 + i * TAU / 3;
        D.star(ctx, this.x + Math.cos(a) * 8, this.y - this.h - 2 + Math.sin(a) * 3, 3, true);
      }
    }
    if (this.hp < this.maxHp || this.isHero) D.hpBar(ctx, this.x, this.y - this.h - 5, this.isHero ? 30 : 18, this.hp / this.maxHp, this.isHero ? '#74acdf' : '#5cb24a');
  };

  TD.Soldier = Soldier;

  /* =========================== HÉROE =========================== */
  function Hero(g, key, x, y) {
    var def = TD.HEROES[key];
    Soldier.call(this, g, null, x, y, {
      hp: def.hp, dmg: def.dmg, rate: def.rate, armor: def.armor, type: def.type,
      spd: def.spd, engage: 80, regen: def.regen
    }, def.look);
    this.isHero = true; this.key = key; this.def = def;
    this.level = 1; this.xp = 0; this.ranks = [0, 0, 0]; this.pendingUps = 0;
    this.pow = 1; this.cdMul = 1;
    this.abCd = 6; this.reviveT = 0;
    this.r = 10;
  }
  Hero.prototype = Object.create(Soldier.prototype);
  Hero.prototype.constructor = Hero;

  Hero.prototype.reviveCost = function () { return 20 + this.level * 5; };
  Hero.prototype.abilityCd = function () { return this.def.ability.cd * this.cdMul; };

  Hero.prototype.die = function () {
    this.dead = true;
    this.release();
    this.reviveT = 10;
    this.g.stats.heroDeaths++;
    J.fall(this.g, this, { dur: 1.8, keepHat: true });
    this.g.kick(0.25);
    this.g.setBanner(this.def.name + ' cayó: vuelve en unos segundos (cuesta ' + this.reviveCost() + ' de oro).');
    if (this.g.sel && this.g.sel.hero) this.g.sel = null;
  };

  Hero.prototype.addXp = function (n) {
    if (this.level >= 6) return;
    this.xp += n;
    while (this.level < 6 && this.xp >= TD.HERO_XP[this.level - 1]) {
      this.level++;
      this.pendingUps++;
      TD.Logros.max('heroLvl', this.level);
      this.maxHp = Math.round(this.maxHp * 1.08);
      this.st.dmg *= 1.06;
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3);
      this.g.addText(this.x, this.y - this.h - 16, '¡Nivel ' + this.level + '!', '#ffd76a', 16);
      this.g.addFx({ k: 'ring', x: this.x, y: this.y, r: 46, color: D.GOLD, dur: 0.6, w: 3 });
      for (var sp = 0; sp < 6; sp++) J.part(this.g, { k: 'sparkle', x: this.x + TD.rand(-16, 16), y: this.y - TD.rand(10, 40), vx: 0, vy: -TD.rand(20, 45), life: TD.rand(0.6, 1), r: TD.rand(2.5, 4) });
      TD.Audio.play('levelup');
    }
  };

  // Elige una de las tres ramas del árbol (0 vida, 1 daño, 2 habilidad)
  Hero.prototype.choose = function (i) {
    if (this.pendingUps <= 0 || this.ranks[i] >= 3) return false;
    this.ranks[i]++;
    this.pendingUps--;
    if (i === 0) { this.maxHp = Math.round(this.maxHp * 1.25); this.hp = this.maxHp; this.st.regen += 4; }
    else if (i === 1) { this.st.dmg *= 1.25; this.st.rate *= 0.93; }
    else { this.pow += 0.3; this.cdMul *= 0.88; }
    return true;
  };

  Hero.prototype.update = function (dt) {
    var g = this.g;
    if (this.abCd > 0) { this.abCd -= dt; if (this.abCd <= 0 && !this.dead) TD.Audio.play('ready'); }
    if (this.dead) {
      this.reviveT -= dt;
      if (this.reviveT <= 0 && g.gold >= this.reviveCost()) {
        g.gold -= this.reviveCost();
        this.revive(this.hx, this.hy);
        g.addFx({ k: 'ring', x: this.x, y: this.y, r: 50, color: D.CELESTE, dur: 0.6 });
        this.hitFlash = 0.08;
        g.addText(this.x, this.y - 50, '¡' + this.def.name + ' vuelve al combate!', '#ffffff', 14);
      }
      return;
    }
    Soldier.prototype.update.call(this, dt);
  };

  Hero.prototype.useAbility = function () {
    var g = this.g, i, e, n = 0;
    if (this.dead || this.abCd > 0) return false;
    var x = this.x, y = this.y, pow = this.pow;
    if (this.key === 'sanmartin') {
      for (i = 0; i < g.enemies.length; i++) {
        e = g.enemies[i];
        if (e.dead || e.def.naval) continue;
        if (TD.dist(x, y, e.x, e.y) < 130) { e.stun(1.6 * pow); e.damage(95 * pow, 'perf', { hero: true }); n++; }
      }
      g.addFx({ k: 'charge', x: x, y: y, face: this.face, dur: 0.9 });
      g.addFx({ k: 'dust', x: x, y: y, r: 90, dur: 0.9, seed: 2 });
      g.kick(0.35); g.hitStop(0.06);
      g.addText(x, y - 60, '¡Carga de granaderos!', '#ffffff', 16);
    } else if (this.key === 'belgrano') {
      for (i = 0; i < g.towers.length; i++) {
        if (TD.dist(x, y, g.towers[i].x, g.towers[i].y) < 260) g.towers[i].buffT = 8 * pow;
      }
      for (i = 0; i < g.soldiers.length; i++) {
        var s = g.soldiers[i];
        if (!s.dead && TD.dist(x, y, s.x, s.y) < 260) { s.hp = Math.min(s.maxHp, s.hp + s.maxHp * 0.6); g.addFx({ k: 'heal', x: s.x, y: s.y - 30, dur: 0.8 }); }
      }
      g.addFx({ k: 'flag', x: x, y: y, dur: 2.2 });
      g.addFx({ k: 'ring', x: x, y: y, r: 260, color: D.CELESTE, dur: 0.9, w: 4 });
      g.addText(x, y - 78, '¡Jurar la bandera!', '#ffffff', 16);
    } else {
      for (i = 0; i < g.enemies.length; i++) {
        e = g.enemies[i];
        if (e.dead || e.def.naval) continue;
        if (TD.dist(x, y, e.x, e.y) < 175) { e.slow(0.6, 5 * pow); e.damage(60 * pow, 'perf', { hero: true }); n++; }
      }
      g.addFx({ k: 'riders', x: x, y: y, r: 150, dur: 1.4 });
      g.addFx({ k: 'ring', x: x, y: y, r: 175, color: '#e9c64a', dur: 0.8, w: 3 });
      g.addText(x, y - 60, '¡Guerra gaucha!', '#ffffff', 16);
    }
    this.abCd = this.abilityCd();
    TD.Logros.bump('abil');
    TD.Audio.play('ability');
    return true;
  };

  TD.Hero = Hero;

  /* =========================== PROYECTIL =========================== */
  // kind: 'bullet' | 'eshot' | 'ball' | 'shell' | 'bola'
  function Proj(g, kind, x, y, target, tx, ty, o) {
    this.g = g; this.kind = kind;
    this.x = x; this.y = y; this.sx = x; this.sy = y;
    this.target = target;
    this.tx = tx; this.ty = ty;
    this.o = o || {};
    this.dead = false; this.t = 0; this.spin = 0;
    if (kind === 'ball' || kind === 'shell') {
      this.T = this.o.T || TD.clamp(TD.dist(x, y, tx, ty) / 300, 0.45, 1.1);
      this.arc = this.o.arc || 46;
    } else {
      this.speed = kind === 'bola' ? 420 : 900;
    }
  }

  Proj.prototype.update = function (dt) {
    this.t += dt;
    if (this.kind === 'ball' || this.kind === 'shell') {
      var p = this.t / this.T;
      if (p >= 1) {
        this.dead = true;
        if (this.o.onHit) this.o.onHit(this.tx, this.ty);
        return;
      }
      this.x = TD.lerp(this.sx, this.tx, p);
      this.y = TD.lerp(this.sy, this.ty, p) - this.arc * 4 * p * (1 - p);
      J.trail(this.g, this);
      return;
    }
    var tg = this.target;
    if (tg && !tg.dead && !tg.gone) {
      this.tx = tg.x; this.ty = tg.cy ? tg.cy() : tg.y - 16;
    }
    var dx = this.tx - this.x, dy = this.ty - this.y, d = Math.sqrt(dx * dx + dy * dy);
    var step = this.speed * dt;
    this.spin += dt * 16;
    if (d <= step + 2) {
      this.dead = true;
      if (this.o.onHit) this.o.onHit(tg && !tg.dead && !tg.gone ? tg : null, this.tx, this.ty);
      return;
    }
    this.px = this.x; this.py = this.y;
    this.x += dx / d * step; this.y += dy / d * step;
  };

  Proj.prototype.draw = function (ctx) {
    var k = this.kind;
    if (k === 'ball' || k === 'shell') {
      var p = this.t / this.T, r = (k === 'shell' ? 3.2 : 3.6) * (this.o.size || 1);
      // sombra sobre el suelo
      ctx.fillStyle = 'rgba(30,20,10,0.25)';
      ctx.beginPath(); ctx.ellipse(TD.lerp(this.sx, this.tx, p), TD.lerp(this.sy, this.ty, p) + 3, r * 1.1, r * 0.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = this.o.fire ? '#ff7a2a' : '#26262a';
      ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, TAU); ctx.fill();
      if (this.o.fire) { ctx.fillStyle = 'rgba(255,220,120,0.8)'; ctx.beginPath(); ctx.arc(this.x, this.y, r * 0.55, 0, TAU); ctx.fill(); }
    } else if (k === 'bola') {
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1;
      var a = this.spin;
      ctx.beginPath(); ctx.moveTo(this.x + Math.cos(a) * 6, this.y + Math.sin(a) * 6); ctx.lineTo(this.x - Math.cos(a) * 6, this.y - Math.sin(a) * 6); ctx.stroke();
      ctx.fillStyle = '#e8e2d2';
      ctx.beginPath(); ctx.arc(this.x + Math.cos(a) * 6, this.y + Math.sin(a) * 6, 2.6, 0, TAU); ctx.arc(this.x - Math.cos(a) * 6, this.y - Math.sin(a) * 6, 2.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = D.INK; ctx.lineWidth = 0.7; ctx.stroke();
    } else {
      var dx = this.tx - this.x, dy = this.ty - this.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      ctx.strokeStyle = k === 'eshot' ? 'rgba(255,200,160,0.95)' : 'rgba(255,246,200,0.95)';
      ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - dx / d * 14, this.y - dy / d * 14); ctx.stroke();
    }
  };

  TD.Proj = Proj;
})();
