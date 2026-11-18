/* ============================================================
 * endless.js — modo Resistencia: oleadas infinitas en un fortín
 * de la frontera. Se desbloquea al ganar la última batalla del Acto II.
 *
 * La dificultad no sale de Ajustes sino del número de oleada:
 *   oleada 1 = Fácil · oleada 3 = Normal · oleada 8 = Difícil
 * (entre medio se interpola, sin saltos). Desde la 8 la vida de los
 * enemigos sube un poco por oleada, siempre en línea recta (+9 % de la
 * de Difícil por oleada): la 13 es Difícil +45 %, la 20 es +108 %.
 * Nada crece de forma exponencial. El tamaño de las oleadas (vida total
 * de la tropa, sin contar la dificultad) crece por tramos rectos: la
 * pendiente sube en la 20 y en la 25, cuando el jugador ya tiene la
 * economía y los solares para bancarlo. Cada 5 oleadas, un jefe (5 vidas si pasa).
 * Calibrado con tools/balance/endless.js: un jugador común cae entre la 12 y la
 * 20; uno que llena y mejora todo y frena a los jefes pasa la 40 y roza la 55.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD;

  TD.ENDLESS_IDX = 100;           // índice "virtual": no está en TD.LEVELS

  var E = TD.Endless = {
    KNOTS: [[1, 0], [3, 1], [8, 2]],  // [oleada, escalón]: 0 fácil, 1 normal, 2 difícil
    HP_SLOPE: 0.09,                   // vida extra por oleada desde la 8 (sobre la de Difícil)
    BOSS_SLOPE: 0.5,                  // los jefes crecen a la mitad de ese ritmo: no tienen que ser un muro
    DMG_SLOPE: 0.02, DMG_CAP: 1.6,    // daño extra por oleada (tope: +60 %)
    SPD_SLOPE: 0.008, SPD_CAP: 1.3,   // velocidad extra por oleada (tope: +30 %)
    BUDGET0: 540, BUDGET_SLOPE: 150,  // "presupuesto" de la oleada: vida base total de su tropa
    BUDGET_SLOPE2: 300, BUDGET_KNEE: 20,   // + esto por oleada desde la 20 (ya hay economía para bancarlo)
    BUDGET_SLOPE3: 450, BUDGET_KNEE3: 25,  // y esto desde la 25 (con los solares llenos y mejorados)
    ELITE_EVERY: 20,                  // un élite más por grupo cada tantas oleadas
    GROUP_MAX: 36,                    // tope de enemigos por grupo
    BOSS_LIVES: 5,                    // vidas que cuesta un jefe que pasa (en la campaña, 10)
    BOSS_EVERY: 5,
    BOSS_HP0: 200, BOSS_HP_SLOPE: 80,  // vida base del jefe: 200 + 80 por oleada (la 5: 600, la 20: 1.800)
  };

  /* ---------- el nivel ---------- */
  E.LEVEL = {
    act: 1, endless: true, name: 'Resistencia', year: 'Oleadas sin fin', place: 'Fortín de la frontera', theme: 'campo',
    gold: 400, lives: 20, hpMul: 1, mapPos: [410, 624],
    // Dos carriles que se juntan recién al final: los solares del medio alcanzan a los dos
    slots: [[250, 352], [500, 348], [760, 352]],
    paths: [
      { pts: [[-40, 170], [200, 150], [360, 235], [530, 160], [700, 235], [870, 160], [1010, 250], [1090, 360], [1200, 420], [1320, 410]] },
      { pts: [[-40, 530], [180, 565], [350, 470], [520, 545], [700, 465], [870, 555], [1010, 470], [1090, 360], [1200, 420], [1320, 410]] }
    ],
    waves: [],
    stars: [],
    speaker: 'Comandante del fortín',
    talk: 'No vienen a ganar una batalla: vienen a cansarnos. Cada oleada trae más tropa que la anterior. Aguantá todo lo que puedas.',
    rules: [
      'Oleadas sin fin, cada una un poco más dura que la anterior.',
      'Arranca en Fácil, en la oleada 3 ya es Normal y en la 8, Difícil. Después sigue subiendo de a poco.',
      'La dificultad de Ajustes no cuenta acá: la marca la oleada.',
      'Cada 5 oleadas llega un jefe: si pasa, perdés 5 vidas. Tu récord es la cantidad de oleadas superadas.'
    ]
  };

  // ¿Ya se ganó la última batalla del Acto II?
  E.lastActII = function () {
    var i, last = -1;
    for (i = 0; i < TD.LEVELS.length; i++) if (TD.LEVELS[i].act === 1) last = i;
    return last;
  };
  E.unlocked = function () { return TD.Save.medal(E.lastActII()) >= 0; };
  E.best = function () { return TD.Save.data.endless.best | 0; };

  // Definición de un nivel por índice (campaña o Resistencia)
  TD.levelDef = function (idx) { return idx === TD.ENDLESS_IDX ? E.LEVEL : TD.LEVELS[idx]; };

  /* ---------- dificultad por oleada ---------- */
  // Escalón continuo: 0 fácil → 1 normal → 2 difícil, por tramos rectos entre los nudos.
  E.tier = function (w) {
    var K = E.KNOTS, i;
    if (w <= K[0][0]) return K[0][1];
    for (i = 1; i < K.length; i++) {
      if (w <= K[i][0]) return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * (w - K[i - 1][0]) / (K[i][0] - K[i - 1][0]);
    }
    return K[K.length - 1][1];
  };

  // Multiplicadores para la oleada w (mismo formato que TD.DIFFS)
  E.diff = function (w) {
    var p = E.tier(w), lo = Math.min(1, Math.floor(p)), f = p - lo;
    var a = TD.DIFFS[TD.DIFF_KEYS[lo]], b = TD.DIFFS[TD.DIFF_KEYS[lo + 1]];
    function mix(k) { return a[k] + (b[k] - a[k]) * f; }
    var x = Math.max(0, w - E.KNOTS[E.KNOTS.length - 1][0]);
    var hpX = 1 + E.HP_SLOPE * x;
    var key = p < 0.5 ? 'facil' : (p < 1.5 ? 'normal' : 'dificil');
    return {
      name: TD.DIFFS[key].name, key: key, tier: p, extra: hpX - 1,
      hp: mix('hp') * hpX, hpBig: mix('hpBig') * (1 + E.HP_SLOPE * E.BOSS_SLOPE * x),
      dmg: mix('dmg') * Math.min(E.DMG_CAP, 1 + E.DMG_SLOPE * x),
      spd: mix('spd') * Math.min(E.SPD_CAP, 1 + E.SPD_SLOPE * x),
      gold: mix('gold'), color: TD.DIFFS[key].color, bossLoss: false
    };
  };

  /* ---------- generador de oleadas ---------- */
  // Tropa disponible: desde qué oleada aparece y qué tan seguido sale elegida.
  var COMMON = [
    { t: 'realista', from: 1, w: 5 },
    { t: 'casaca', from: 1, w: 4 },
    { t: 'frances', from: 6, w: 4 }
  ];
  var SPECIAL = [
    { t: 'explorador', from: 3, w: 3 },
    { t: 'cazador', from: 4, w: 2 },
    { t: 'caballeria', from: 5, w: 3 },
    { t: 'pesado_brit', from: 5, w: 2 },
    { t: 'pesado', from: 8, w: 2 },
    { t: 'pesado_fr', from: 11, w: 2 },
    { t: 'cirujano', from: 7, w: 1.2, elite: true },
    { t: 'espia', from: 9, w: 1.2, elite: true },
    { t: 'veterano', from: 12, w: 1.2, elite: true }
  ];
  // Jefes de tierra, de menos a más vida (los "mayores" restan 20 vidas: quedan afuera)
  var BOSSES = ['jefe1', 'jefe2', 'jefe4', 'jefe6', 'jefe7', 'jefe10'];

  function pickW(list, r, skip) {
    var tot = 0, i, x;
    for (i = 0; i < list.length; i++) if (!skip[list[i].t]) tot += list[i].w;
    if (tot <= 0) return null;
    x = r() * tot;
    for (i = 0; i < list.length; i++) {
      if (skip[list[i].t]) continue;
      x -= list[i].w;
      if (x <= 0) return list[i];
    }
    return null;
  }
  // Lo disponible en la oleada w. Con las oleadas, la tropa pesada sale más seguido:
  // así las oleadas tardías traen enemigos más duros en vez de multitudes interminables.
  function avail(list, w) {
    return list.filter(function (o) { return w >= o.from; }).map(function (o) {
      return { t: o.t, elite: o.elite, w: o.w * (!o.elite && TD.ENEMIES[o.t].hp >= 300 ? 1 + w / 15 : 1) };
    });
  }

  // Grupo: n enemigos repartidos en una duración razonable
  function group(type, n, delay, path) {
    var fast = TD.ENEMIES[type].spd > 60;
    var dur = Math.min(20, 3 + n * (fast ? 0.45 : 0.75));
    var gap = n > 1 ? TD.clamp(dur / (n - 1), fast ? 0.32 : 0.45, 4) : 1;
    return { type: type, n: n, gap: Math.round(gap * 100) / 100, delay: delay, path: path };
  }

  // Oleada número w (desde 1). Siempre la misma para el mismo número: los récords se comparan parejo.
  E.makeWave = function (w) {
    var r = TD.rng(w * 7919 + 13), groups = [], skip = {}, i;
    var budget = E.BUDGET0 + E.BUDGET_SLOPE * (w - 1) + E.BUDGET_SLOPE2 * Math.max(0, w - E.BUDGET_KNEE) +
      E.BUDGET_SLOPE3 * Math.max(0, w - E.BUDGET_KNEE3);
    var boss = w % E.BOSS_EVERY === 0;
    var twoPaths = w >= 4, path = twoPaths ? (r() < 0.5 ? 0 : 1) : 0;
    function nextPath() { if (twoPaths) path = 1 - path; return path; }
    if (boss) budget *= 0.6;            // el jefe ocupa el resto

    var specials = avail(SPECIAL, w);
    var kinds = Math.min(specials.length, (w >= 3 ? 1 : 0) + (w >= 5 ? 1 : 0) + (w >= 12 ? 1 : 0) + (w >= 22 ? 1 : 0));
    var commonShare = kinds ? TD.clamp(0.8 - w * 0.02, 0.35, 0.8) : 1;     // al principio, casi todo infantería

    // tropa especial (lo que no entra por el tope de un grupo pasa al siguiente o a la infantería)
    var sBudget = budget * (1 - commonShare), spent = 0, delay = 3, sp, share, hp, n;
    for (i = 0; i < kinds; i++) {
      sp = pickW(specials, r, skip);
      if (!sp) break;
      skip[sp.t] = true;
      share = i === kinds - 1 ? sBudget : sBudget / (kinds - i) * (0.8 + r() * 0.4);
      hp = TD.ENEMIES[sp.t].hp;
      n = TD.clamp(Math.round(share / hp), 1, E.GROUP_MAX);
      if (sp.elite) n = Math.min(n, 1 + Math.floor(w / E.ELITE_EVERY));
      sBudget -= n * hp; spent += n * hp;
      groups.push(group(sp.t, n, Math.round(delay), nextPath()));
      delay += 3 + r() * 4;
    }

    // infantería común: lo que queda, en uno o dos grupos (uno por camino)
    var cm = pickW(avail(COMMON, w), r, {}), cBudget = Math.max(budget * 0.25, budget - spent);
    var nC = TD.clamp(Math.round(cBudget / TD.ENEMIES[cm.t].hp), 3, E.GROUP_MAX * 2);
    if (twoPaths && nC >= 12) {
      var cm2 = pickW(avail(COMMON, w), r, {}) || cm;
      groups.unshift(group(cm2.t, Math.floor(nC / 2), 1.5, nextPath()));
      groups.unshift(group(cm.t, Math.ceil(nC / 2), 0, nextPath()));
    } else {
      groups.unshift(group(cm.t, nC, 0, nextPath()));
    }

    if (boss) {
      // el aspecto va cambiando, pero la vida la marca la oleada (sin saltos de un jefe a otro)
      var bi = Math.min(BOSSES.length - 1, w / E.BOSS_EVERY - 1), bt = BOSSES[bi];
      groups.push({ type: bt, n: 1, gap: 1, delay: Math.round(delay + 4), path: w / E.BOSS_EVERY % 2 ? 0 : 1,
        hpMul: (E.BOSS_HP0 + E.BOSS_HP_SLOPE * w) / TD.ENEMIES[bt].hp });
    }

    return { pause: boss ? 18 : 15, bonus: Math.min(120, 20 + 3 * w), groups: groups, boss: boss };
  };

  // Copia fresca del nivel para una partida, con las dos primeras oleadas listas
  E.makeLevel = function () {
    var L = {}, k;
    for (k in E.LEVEL) if (Object.prototype.hasOwnProperty.call(E.LEVEL, k)) L[k] = E.LEVEL[k];
    L.waves = [];
    E.ensure(L, 1);
    return L;
  };
  // Genera oleadas hasta tener el índice idx (desde 0)
  E.ensure = function (L, idx) {
    while (L.waves.length <= idx) L.waves.push(E.makeWave(L.waves.length + 1));
  };
})();
