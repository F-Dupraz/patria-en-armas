/* Simulador de balance: abre el juego real en Chromium (Playwright) y lo hace jugar a un bot
 * (bot.js), sin dibujar. No forma parte del juego: sirve para medir la dificultad.
 *
 *   node sim.js base [dificultades]            estrategias genéricas en los 12 niveles
 *   node sim.js search <dif> [gens] [niveles]  busca la mejor estrategia de cada nivel
 *   node sim.js limit <dif> [gens] [niveles]   multiplica la vida de esa dificultad hasta que
 *                                              el buscador deja de ganar: el «techo» del nivel
 *   node sim.js show <dif> <nivel>             repite la mejor estrategia guardada, con detalle
 *
 * Niveles: índices desde 0 separados por coma (ej. 8,9,11). Variables de entorno:
 *   DIFFS='{"dificil":{"dmg":1.5}}'  pisa multiplicadores de TD.DIFFS sin tocar el código
 *   DUMP=1 / BESTSEED=1              guarda / reutiliza la mejor estrategia (best-*.json)
 *   STARFIT=1                        la búsqueda también premia las estrellas
 *
 * El techo es un piso de lo ganable: el bot no mueve al héroe a mano ni vende torres.
 * Un techo de 1,00 significa que la batalla ya está al límite con los valores del juego. */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = process.env.GAME_ROOT || path.resolve(__dirname, '..', '..');
const BOT = fs.readFileSync(path.join(__dirname, 'bot.js'), 'utf8');
const DIFFS = process.env.DIFFS ? JSON.parse(process.env.DIFFS) : null;
const NP = +(process.env.NP || 4);

let rs = 12345;
function rnd() { rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0; return rs / 4294967296; }
function ri(n) { return (rnd() * n) | 0; }
const TYPES = ['granaderos', 'artilleria', 'tiradores', 'gauchos'];

function compile(gn) {
  const seen = {}, order = [], plan = [];
  gn.seq.forEach(function (ti) {
    const t = gn.towers[ti];
    if (!t) return;
    if (seen[ti] == null) { seen[ti] = { idx: order.length, n: 0 }; order.push(ti); plan.push(['B', t.type, t.rank, t.naval ? 1 : 0]); }
    else if (seen[ti].n < 3) { seen[ti].n++; plan.push(['U', seen[ti].idx, t.branch]); }
  });
  return { hero: gn.hero, heroPos: gn.heroPos, heroUps: gn.heroUps, early: gn.early, follow: gn.follow, ahead: gn.ahead, plan: plan };
}

// plantillas "de jugador razonable": composición + forma de gastar
function template(kind, naval, nSlots) {
  const comps = {
    mixto: [['tiradores', 0, 0], ['granaderos', 0, 0], ['artilleria', 0, 1], ['gauchos', 0, 0], ['tiradores', 0, 1], ['artilleria', 0, 0], ['granaderos', 0, 1], ['tiradores', 0, 0], ['artilleria', 0, 1], ['gauchos', 0, 1], ['tiradores', 0, 0], ['artilleria', 0, 1]],
    fusil: [['tiradores', 0, 0], ['tiradores', 0, 0], ['granaderos', 0, 0], ['tiradores', 0, 1], ['artilleria', 0, 1], ['tiradores', 0, 0], ['gauchos', 0, 0], ['tiradores', 0, 0], ['artilleria', 0, 1], ['tiradores', 0, 1], ['granaderos', 0, 0], ['tiradores', 0, 0]],
    foco: [['tiradores', 0, 0], ['granaderos', 0, 0], ['tiradores', 0, 0], ['artilleria', 0, 1], ['gauchos', 0, 0], ['tiradores', 0, 0], ['granaderos', 0, 0], ['artilleria', 0, 1]],
    canon: [['artilleria', 0, 1], ['granaderos', 0, 0], ['artilleria', 0, 0], ['tiradores', 0, 0], ['gauchos', 0, 0], ['artilleria', 0, 1], ['tiradores', 0, 0], ['granaderos', 0, 0], ['artilleria', 0, 1], ['tiradores', 0, 0], ['artilleria', 0, 0], ['gauchos', 0, 0]]
  };
  const base = comps[kind.split('-')[0]], shape = kind.split('-')[1];
  const n = Math.min(base.length, nSlots);
  const towers = base.slice(0, n).map(function (c, i) {
    const nv = naval && (kind.indexOf('foco') === 0 ? c[0] === 'tiradores' : (c[0] === 'artilleria' || (c[0] === 'tiradores' && i % 2 === 0)));
    return { type: c[0], rank: c[1], branch: c[2], naval: nv };
  });
  let seq = [], i, k;
  if (shape === 'ancho') { for (i = 0; i < n; i++) seq.push(i); for (k = 0; k < 3; k++) for (i = 0; i < n; i++) seq.push(i); }
  else if (shape === 'alto') { for (i = 0; i < n; i++) seq.push(i, i, i, i); }
  else if (shape === 'par') { for (i = 0; i < n; i += 2) { for (k = i; k < Math.min(n, i + 2); k++) seq.push(k); for (let u = 0; u < 3; u++) for (k = i; k < Math.min(n, i + 2); k++) seq.push(k); } }
  else { // escalonado: de a 3 torres, una mejora cada tanda
    for (i = 0; i < n; i += 3) { for (k = i; k < Math.min(n, i + 3); k++) seq.push(k); for (k = 0; k < Math.min(n, i + 3); k++) seq.push(k); }
    for (k = 0; k < 2; k++) for (i = 0; i < n; i++) seq.push(i);
  }
  return { hero: 'sanmartin', heroPos: [0, 0.62], heroUps: [1, 0, 1, 2, 0], early: null, ahead: true, follow: false, towers: towers, seq: seq };
}
const TEMPLATES = ['mixto-esc', 'mixto-ancho', 'mixto-alto', 'fusil-esc', 'canon-esc', 'foco-par', 'foco-esc', 'fusil-par'];

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function mutate(g0, naval, nSlots) {
  const g = clone(g0);
  const m = 1 + ri(3);
  for (let q = 0; q < m; q++) {
    const r = rnd();
    const ti = ri(g.towers.length), t = g.towers[ti];
    if (r < 0.2) { const a = ri(g.seq.length), b = Math.max(0, Math.min(g.seq.length - 1, a + ri(9) - 4)); const x = g.seq[a]; g.seq.splice(a, 1); g.seq.splice(b, 0, x); }
    else if (r < 0.35) t.type = TYPES[ri(4)];
    else if (r < 0.47) t.branch = 1 - t.branch;
    else if (r < 0.59) t.rank = ri(Math.min(6, nSlots));
    else if (r < 0.65) t.naval = naval ? !t.naval : false;
    else if (r < 0.73) g.heroPos = [ri(3), 0.15 + rnd() * 0.75];
    else if (r < 0.77) g.hero = ['sanmartin', 'belgrano', 'guemes'][ri(3)];
    else if (r < 0.80) g.early = [null, 0, 2, 5, 10][ri(5)];
    else if (r < 0.81) g.follow = !g.follow;
    else if (r < 0.82) g.ahead = !g.ahead;
    else if (r < 0.86) g.heroUps = [ri(3), ri(3), ri(3), ri(3), ri(3)];
    else if (r < 0.93 && g.towers.length < nSlots) { // torre nueva
      g.towers.push({ type: TYPES[ri(4)], rank: ri(4), branch: ri(2), naval: naval && rnd() < 0.4 });
      const at = ri(g.seq.length + 1);
      for (let k = 0; k < 4; k++) g.seq.splice(Math.min(g.seq.length, at + k * (1 + ri(4))), 0, g.towers.length - 1);
    } else if (g.towers.length > 3) { // adelantar todas las mejoras de una torre
      const first = g.seq.indexOf(ti);
      g.seq = g.seq.filter(function (x, i) { return x !== ti || i === first; });
      g.seq.splice(first + 1, 0, ti, ti, ti);
    }
  }
  return g;
}

async function main() {
  const browser = await chromium.launch();
  const pages = [];
  for (let i = 0; i < NP; i++) {
    const p = await browser.newPage();
    await p.goto('file://' + ROOT + '/index.html');
    await p.waitForFunction('window.TD && TD.Game && TD.UI');
    await p.addScriptTag({ content: BOT });
    pages.push(p);
  }
  const info = await pages[0].evaluate(function () {
    return TD.LEVELS.map(function (l, i) { var g = new TD.Game(i, 'sanmartin'); return { name: l.name, slots: g.slots.length, naval: l.paths.some(function (p) { return p.naval; }) }; });
  });

  const baseDiffs = await pages[0].evaluate(function () { return TD.DIFFS; });

  // cola de trabajos repartida entre las páginas
  async function runAll(jobs) {
    const out = new Array(jobs.length); let next = 0;
    await Promise.all(pages.map(async function (p) {
      for (;;) { const i = next++; if (i >= jobs.length) return; out[i] = await p.evaluate(function (c) { return window.SIM.run(c); }, jobs[i]); }
    }));
    return out;
  }
  let LVL = null;
  // SCALE multiplica la vida de la dificultad que se está probando (modo `limit`)
  let SCALE = 1;
  function job(level, diff, gn, seed) {
    let d = DIFFS;
    if (SCALE !== 1) {
      const b = Object.assign({}, baseDiffs[diff], DIFFS && DIFFS[diff]);
      d = Object.assign({}, DIFFS); d[diff] = Object.assign({}, b, { hp: b.hp * SCALE, hpBig: b.hpBig * SCALE });
    }
    return { level: level, diff: diff, genome: compile(gn), seed: seed, diffs: d, lvl: LVL, starFit: !!process.env.STARFIT };
  }
  async function evalGenomes(level, diff, gns, seeds) {
    const jobs = [];
    gns.forEach(function (g) { seeds.forEach(function (s) { jobs.push(job(level, diff, g, s)); }); });
    const res = await runAll(jobs);
    return gns.map(function (g, i) {
      const rr = res.slice(i * seeds.length, (i + 1) * seeds.length);
      return { g: g, rr: rr, fit: rr.reduce(function (a, r) { return a + r.fit; }, 0) / rr.length, wins: rr.filter(function (r) { return r.win; }).length, lives: Math.round(rr.reduce(function (a, r) { return a + r.lives; }, 0) / rr.length) };
    });
  }

  function fmt(L, r) {
    return (L + 1 + ' ' + info[L].name).padEnd(30) + ' plantilla ' + r.tplBest.toFixed(0).padStart(4) + ' | mejor ' + r.best.fit.toFixed(0).padStart(4) +
      ' | 1.ª victoria gen ' + String(r.firstWin).padStart(3) + ' | ganadoras ' + String(r.winners).padStart(3) + '/' + r.tried +
      ' | confirma ' + r.conf.wins + '/6 vidas ' + r.conf.lives + ' estrellas ' + r.conf.rr.map(function (x) { return x.stars; }).join('') +
      ' | ' + r.best.g.hero + ' torres ' + r.conf.rr[0].towers + ' t=' + r.conf.rr[0].time + 's';
  }
  async function search(L, diff, gens, seedG, rseed) {
    const LAMBDA = 8, seeds = [1, 2];
    rs = rseed || 1000 + L;
    const init = TEMPLATES.map(function (k) { return template(k, info[L].naval, info[L].slots); });
    if (process.env.BESTSEED) { try { seedG = JSON.parse(fs.readFileSync(path.join(__dirname, 'best-' + diff + '-' + L + '.json'), 'utf8')); } catch (e) { /* sin semilla */ } }
    if (seedG) { init.push(seedG); for (let k = 0; k < 7; k++) init.push(mutate(seedG, info[L].naval, info[L].slots)); }
    let pop = await evalGenomes(L, diff, init, seeds);
    pop.sort(function (a, b) { return b.fit - a.fit; });
    let best = pop[0], firstWin = best.wins === seeds.length ? 0 : -1, tried = init.length, winners = pop.filter(function (e) { return e.wins === seeds.length; }).length;
    const tplBest = best.fit;
    pop = pop.slice(0, 4);
    for (let gen = 1; gen <= gens; gen++) {
      const kids = [];
      for (let k = 0; k < LAMBDA; k++) kids.push(mutate(k < 5 ? best.g : pop[Math.min(pop.length - 1, 1 + ri(3))].g, info[L].naval, info[L].slots));
      const ev = await evalGenomes(L, diff, kids, seeds);
      tried += kids.length;
      winners += ev.filter(function (e) { return e.wins === seeds.length; }).length;
      pop = pop.concat(ev).sort(function (a, b) { return b.fit - a.fit; }).slice(0, 4);
      if (pop[0].fit > best.fit) best = pop[0];
      if (firstWin < 0 && best.wins === seeds.length) firstWin = gen;
    }
    // confirmación con semillas nuevas, sobre los 3 mejores
    let conf = null, cbest = best;
    for (const c of pop.slice(0, 3)) {
      const cf = (await evalGenomes(L, diff, [c.g], [11, 12, 13, 14, 15, 16]))[0];
      if (!conf || cf.wins > conf.wins || (cf.wins === conf.wins && cf.lives > conf.lives)) { conf = cf; cbest = c; }
    }
    return { best: cbest, conf: conf, firstWin: firstWin, winners: winners, tried: tried, tplBest: tplBest };
  }

  const mode = process.argv[2] || 'base';
  const levels = (process.argv[5] || process.env.LEVELS || '0,1,2,3,4,5,6,7,8,9,10,11').split(',').map(Number);
  const t0 = Date.now();

  if (mode === 'base') {
    const diffs = (process.argv[3] || 'facil,normal,dificil').split(',');
    console.log('nivel'.padEnd(30) + diffs.map(function (d) { return d.padEnd(34); }).join(''));
    for (const L of levels) {
      let line = (L + 1 + ' ' + info[L].name).padEnd(30);
      for (const d of diffs) {
        const ev = await evalGenomes(L, d, TEMPLATES.map(function (k) { return template(k, info[L].naval, info[L].slots); }), [1, 2, 3]);
        // por plantilla: victorias/3 y vidas medias
        line += ev.map(function (e) { return e.wins + '/' + String(e.lives).padStart(2); }).join(' ').padEnd(34);
      }
      console.log(line);
    }
  } else if (mode === 'show') {
    const diff = process.argv[3], L = +process.argv[4];
    const gn = process.env.SHOWLIM ? JSON.parse(fs.readFileSync(path.join(__dirname, 'lim-' + diff + '-' + L + '.json'), 'utf8')).g : JSON.parse(fs.readFileSync(path.join(__dirname, 'best-' + diff + '-' + L + '.json'), 'utf8'));
    if (process.env.LVLJSON) LVL = JSON.parse(process.env.LVLJSON);
    console.log(JSON.stringify(compile(gn)));
    for (const seed of [11, 12]) { const j = job(L, diff, gn, seed); j.log = true; const r = (await runAll([j]))[0]; console.log(JSON.stringify(r)); }
  } else if (mode === 'search') {
    const diff = process.argv[3] || 'dificil', gens = +(process.argv[4] || 20);
    for (const L of levels) {
      let sg = null;
      if (process.env.SEED) { try { sg = JSON.parse(fs.readFileSync(path.join(__dirname, 'lim-' + process.env.SEED + '-' + L + '.json'), 'utf8')).g; } catch (e) { sg = null; } }
      const r = await search(L, diff, gens, sg);
      console.log(fmt(L, r));
      if (process.env.DUMP) fs.writeFileSync(path.join(__dirname, 'best-' + diff + '-' + L + '.json'), JSON.stringify(r.best.g));
    }
  } else if (mode === 'limit') {
    // sube la vida de los enemigos (× la de esa dificultad) hasta que el buscador deja de ganar: ese es el techo
    const diff = process.argv[3] || 'dificil', gens = +(process.argv[4] || 15);
    const STEP = 1.2, START = +(process.env.START || 1);
    for (const L of levels) {
      let seedG = null, out = [], sc = START, lo = 0, hi = 0, loG = null;
      async function probe(x, big) {
        SCALE = x;
        let r = await search(L, diff, big ? gens * 2 : gens, seedG);
        if (r.conf.wins < 4) { // reintento con otra tirada antes de darlo por perdido
          rs = 777 + L; const r2 = await search(L, diff, gens * 2, seedG, 5000 + L);
          if (r2.conf.wins > r.conf.wins) r = r2;
        }
        out.push(x.toFixed(2) + ':' + r.conf.wins + '/6v' + r.conf.lives + '(' + r.winners + '/' + r.tried + ')');
        if (r.conf.wins >= 4) { seedG = r.best.g; if (x > lo) { lo = x; loG = r.best.g; } return true; }
        return false;
      }
      // baja hasta ganar, después sube hasta perder
      let first = true;
      while (sc > 0.45 && !(await probe(sc, first))) { hi = sc; sc /= STEP; first = false; }
      if (lo > 0 && !hi) { sc = lo * STEP; while (sc < +(process.env.MAXSC || 6) && (await probe(sc, false))) sc *= STEP; hi = sc; }
      // un paso de afinado en el medio
      if (lo > 0) { const mid = Math.sqrt(lo * hi); if (!(await probe(mid, false))) hi = mid; }
      SCALE = 1;
      console.log((L + 1 + ' ' + info[L].name).padEnd(30) + ' techo ' + lo.toFixed(2) + ' (falla en ' + hi.toFixed(2) + ')   ' + out.join('  '));
      if (loG) fs.writeFileSync(path.join(__dirname, 'lim-' + diff + '-' + L + '.json'), JSON.stringify({ lo: lo, g: loG }));
    }
  }
  console.error('tiempo: ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  await browser.close();
}
main().catch(function (e) { console.error(e); process.exit(1); });
