/* Bot que juega una batalla sin dibujar nada. Se inyecta en la página real del juego.
 * window.SIM.run({level, diff, genome, seed, diffs}) -> resultado
 * genome: { hero, heroPos:[pi,frac], heroUps:[...], early:k, plan:[ ['B',type,rank] | ['U',towerIdx,branch] ] } */
(function () {
  'use strict';
  var TD = window.TD;
  var noop = function () {};
  TD.Audio.play = noop;
  ['bump', 'onKill', 'onWin', 'onLose', 'onGold', 'onSell', 'onHeroFall', 'ability', 'grant', 'check', 'flush', 'max', 'bit'].forEach(function (k) { TD.Logros[k] = noop; });
  TD.Save.save = noop;
  TD.Draw.background = function () { return null; };
  // nada visual: solo la simulación
  ['part', 'hit', 'addDmg', 'flushDmg', 'tickDmg', 'explosion', 'trail', 'fall', 'sink', 'coin', 'kick'].forEach(function (k) { TD.Juice[k] = noop; });
  var addFx0 = TD.Game.prototype.addFx;
  TD.Game.prototype.addFx = function (f) { if (f.cb) addFx0.call(this, f); };
  TD.Game.prototype.addText = noop;
  TD.Game.prototype.setBanner = noop;

  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // cobertura de un solar: largo de camino dentro del alcance r (only: solo ese camino)
  function coverage(g, s, r, naval, only) {
    var c = 0, p, d, pt = {};
    for (p = 0; p < g.paths.length; p++) {
      if (!!g.paths[p].naval !== !!naval) continue;
      if (only != null && p !== only) continue;
      for (d = 0; d < g.paths[p].length; d += 10) {
        g.paths[p].at(d, pt);
        if (pt.x < 0 || pt.x > TD.W) continue;
        if (TD.dist(s.x, s.y - 8, pt.x, pt.y) <= r) c += 10;
      }
    }
    return c;
  }

  // Carriles separados (Resistencia): alterna el mejor solar de cada camino
  function rankLanes(g) {
    var lists = g.paths.map(function (path, pi) {
      var l = g.slots.map(function (s) { return { s: s, c: coverage(g, s, 170, false, pi) }; }).filter(function (o) { return o.c > 0; });
      l.sort(function (a, b) { return b.c - a.c; });
      return l.map(function (o) { return o.s; });
    });
    var out = [], used = [], k = 0, guard = 0;
    while (out.length < g.slots.length && guard++ < 1000) {
      var l = lists[k % lists.length], j;
      for (j = 0; j < l.length; j++) if (used.indexOf(l[j]) < 0) { out.push(l[j]); used.push(l[j]); break; }
      k++;
      if (lists.every(function (ll) { return ll.every(function (s) { return used.indexOf(s) >= 0; }); })) break;
    }
    g.slots.forEach(function (s) { if (used.indexOf(s) < 0) out.push(s); });
    return { land: out, naval: [] };
  }

  function rankSlots(g) {
    var land = g.slots.map(function (s) { return { s: s, c: coverage(g, s, 170, false) }; });
    land.sort(function (a, b) { return b.c - a.c; });
    var nav = g.slots.map(function (s) { return { s: s, c: coverage(g, s, 185, true) }; }).filter(function (o) { return o.c > 0; });
    nav.sort(function (a, b) { return b.c - a.c; });
    return { land: land.map(function (o) { return o.s; }), naval: nav.map(function (o) { return o.s; }) };
  }

  function near(g, x, y, r, pred) {
    var n = 0, i, e;
    for (i = 0; i < g.enemies.length; i++) {
      e = g.enemies[i];
      if (e.dead || e.gone) continue;
      if (TD.dist(x, y, e.x, e.y) < r && (!pred || pred(e))) n++;
    }
    return n;
  }
  function land(e) { return !e.def.naval; }
  function big(e) { return !e.def.naval && (e.def.boss || e.def.elite || e.maxHp > 400); }

  function run(cfg) {
    var saveRandom = Math.random, k;
    Math.random = mulberry(cfg.seed || 1);
    var oldDiffs = {};
    if (cfg.diffs) for (k in cfg.diffs) { oldDiffs[k] = TD.DIFFS[k]; TD.DIFFS[k] = Object.assign({}, TD.DIFFS[k], cfg.diffs[k]); }
    TD.Save.data.diff = cfg.diff;
    var oldLvl = {}, LV = TD.levelDef(cfg.level);
    if (cfg.lvl) for (k in cfg.lvl) { oldLvl[k] = LV[k]; LV[k] = cfg.lvl[k]; }
    var gn = cfg.genome, g = new TD.Game(cfg.level, gn.hero || 'sanmartin');
    var ranks = gn.lanes ? rankLanes(g) : rankSlots(g), h = g.hero, dt = 1 / 40, pi = 0, tick = 0, i, tw, guard = 0;
    var total = 0;
    g.lvl.waves.forEach(function (w) { w.groups.forEach(function (gr) { total += gr.n; }); });

    // héroe
    var lp = g.paths.filter(function (p) { return !p.naval; });
    var hp = gn.heroPos || [0, 0.62], hpath = lp[hp[0] % lp.length], pt = hpath.at(hpath.length * hp[1], {});
    h.hx = pt.x; h.hy = pt.y; h.x = pt.x; h.y = pt.y;
    var ups = gn.heroUps || [1, 0, 1, 2, 0], upi = 0;

    var plan = gn.plan.slice(), ahead = gn.ahead ? 3 : 0;
    // un paso del plan: 1 hecho, 0 falta oro, -1 no se puede (se descarta)
    function tryStep(st) {
      var s, t;
      if (st[0] === 'B') {
        if (g.gold < TD.TOWERS[st[1]].cost) return 0;
        s = st[3] ? pickSlot(ranks.naval, st[2]) : null;
        if (!s) s = pickSlot(ranks.land, st[2]);
        if (!s) return -1;
        g.build(s, st[1], true);
        return 1;
      }
      t = g.towers[st[1]];
      if (!t) return -2;                 // todavía no existe esa torre
      if (t.level >= 3 || (t.locked && t.locked())) return -1;   // al máximo o todavía no habilitada en este nivel
      if (g.gold < t.upgradeCost(st[2])) return 0;
      t.upgrade(st[2]);
      return 1;
    }
    function doPlan() {
      var r, j, moved = true;
      while (moved && pi < plan.length) {
        moved = false;
        r = tryStep(plan[pi]);
        if (r === 1 || r === -1 || r === -2) { pi++; moved = true; continue; }
        // falta oro para el paso que toca: con `ahead`, adelanta alguno de los próximos que sí alcance
        for (j = pi + 1; j <= pi + ahead && j < plan.length; j++) {
          if (plan[j][0] === 'U' && plan[j][1] >= g.towers.length) continue;
          r = tryStep(plan[j]);
          if (r === 1) { plan.splice(j, 1); moved = true; break; }
        }
      }
    }
    function pickSlot(list, rank) {
      var free = list.filter(function (s) { return !s.tower; });
      return free.length ? free[Math.min(rank, free.length - 1)] : null;
    }
    function heroFollow() {
      var best = null, bd = -1, e, q;
      if (h.dead) return;
      for (i = 0; i < g.enemies.length; i++) {
        e = g.enemies[i];
        if (e.dead || e.gone || e.def.naval || e.invis > 0) continue;
        q = e.d / e.path.length;
        if (q > bd && q > 0.12 && q < 0.93) { bd = q; best = e; }
      }
      if (best && TD.dist(h.hx, h.hy, best.x, best.y) > 60 && !h.target) { var c = g.clampLand(best.x, best.y); h.hx = c.x; h.hy = c.y; }
    }
    var bossDmg = 0, bossSeen = null;
    function abilities() {
      var hr;
      if (g.boss) { bossSeen = g.boss; }
      if (gn.follow) heroFollow();
      if (h.pendingUps > 0) { for (i = 0; i < 6 && h.pendingUps > 0; i++) { if (!h.choose(ups[upi % ups.length])) { h.choose(0) || h.choose(1) || h.choose(2); } upi++; } }
      if (!h.dead && h.abCd <= 0) {
        if (h.key === 'sanmartin') { if (near(g, h.x, h.y, 120, land) >= 3 || near(g, h.x, h.y, 120, big) >= 1) h.useAbility(); }
        else if (h.key === 'guemes') { if (near(g, h.x, h.y, 165, land) >= 4 || near(g, h.x, h.y, 165, big) >= 1) h.useAbility(); }
        else if (g.enemies.length >= 5) h.useAbility();
      }
      for (i = 0; i < g.towers.length; i++) {
        tw = g.towers[i];
        if (!tw.abilityReady()) continue;
        if (tw.key === 'granaderos') { if (near(g, tw.rally.x, tw.rally.y, 110, land) >= 2) tw.useAbility(); }
        else if (tw.key === 'artilleria') {
          hr = tw.pickTargets(1, tw.st.range * 1.25, false, false);
          if (hr.length && (near(g, hr[0].x, hr[0].y, 110) >= 3 || hr[0].maxHp > 500)) tw.useAbility();
        } else if (tw.key === 'tiradores') {
          hr = tw.pickTargets(1, tw.st.range * 1.5, false, false);
          if (hr.length && hr[0].hp > 150) tw.useAbility();
        } else if (near(g, tw.near.x, tw.near.y, 100, land) >= 2) tw.useAbility();
      }
    }

    doPlan();
    g.callWave(false);
    var maxT = cfg.maxT || 60 * 40, log = [], lastW = 0;
    while (g.state === 'running' && g.time < maxT) {
      g.step(dt);
      tick++;
      if (g.waveIdx !== lastW) { lastW = g.waveIdx; log.push('o' + g.waveIdx + ' t' + Math.round(g.time) + ' v' + g.lives + ' $' + Math.round(g.gold) + ' T' + g.towers.length + ' p' + pi); }
      if (tick % 8 === 0) {
        doPlan();
        abilities();
        if (gn.early != null && g.canCall() && g.spawners.length === 0 && g.nextTimer > 5 && g.enemies.length <= gn.early) g.callWave(false);
      }
      if (++guard > 400000) break;
    }
    var res = {
      win: g.state === 'won', lives: g.lives, cleared: g.cleared, kills: g.stats.kills, total: total, wave: g.waveIdx, waves: g.lvl.waves.length,
      time: Math.round(g.time), gold: g.gold, towers: g.towers.length, heroDeaths: g.stats.heroDeaths, planDone: pi, early: g.stats.early,
      leaked: g.stats.leaked, navalLeaked: g.stats.navalLeaked, tw: cfg.log ? g.towers.map(function (t) { return t.key.slice(0, 3) + (t.branch < 0 ? '' : t.branch) + t.level + '@' + t.x + ',' + t.y; }) : undefined, log: cfg.log ? log : undefined,
      stars: g.result && g.result.win ? g.result.stars : 0, slots: g.slots.length
    };
    if (bossSeen) bossDmg = bossSeen.dead ? 1 : 1 - Math.max(0, bossSeen.hp) / bossSeen.maxHp;
    res.boss = +bossDmg.toFixed(2);
    res.fit = res.win ? 100 + res.lives + (cfg.starFit ? 40 * res.stars : 0) : 50 * Math.min(1, res.kills / total) + (res.wave / res.waves) * 20 + 20 * bossDmg;
    Math.random = saveRandom;
    for (k in oldDiffs) TD.DIFFS[k] = oldDiffs[k];
    for (k in oldLvl) { if (oldLvl[k] === undefined) delete LV[k]; else LV[k] = oldLvl[k]; }
    return res;
  }

  window.SIM = { run: run };
})();
