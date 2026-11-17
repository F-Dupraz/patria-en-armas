/* Simulador del modo Resistencia: el bot (bot.js) juega oleadas sin fin y se mide
 * hasta qué oleada llega y cuántas vidas pierde en cada una. Sirve para ver que la
 * dificultad crezca de a poco (sin saltos) y que la partida termine en algún momento.
 *
 *   node endless.js [semillas] [héroes]      ej.: node endless.js 1,2,3 sanmartin,guemes
 *
 * Estrategia: llena todos los solares en tandas de tres (infantería, cañón, fusiles, gauchos)
 * y va mejorando todo de a un nivel por tanda. No mueve al héroe ni vende torres. */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = process.env.GAME_ROOT || path.resolve(__dirname, '..', '..');
const BOT = fs.readFileSync(path.join(__dirname, 'bot.js'), 'utf8');

const COMP = [['tiradores', 0], ['granaderos', 0], ['artilleria', 1], ['gauchos', 0], ['tiradores', 1], ['artilleria', 0], ['granaderos', 1], ['tiradores', 0], ['gauchos', 1], ['artilleria', 1]];

// CASUAL=1: un jugador común: usa 10 solares como mucho y mejora cada torre solo dos veces
function plan(nSlots) {
  const casual = !!process.env.CASUAL, rounds = casual ? 1 : 3;
  if (casual) nSlots = Math.min(nSlots, 10);
  const out = [], built = [];
  for (let i = 0; i < nSlots; i += 3) {
    for (let k = i; k < Math.min(nSlots, i + 3); k++) { const c = COMP[k % COMP.length]; out.push(['B', c[0], 0, 0]); built.push(c[1]); }
    for (let k = 0; k < built.length; k++) out.push(['U', k, built[k]]);
  }
  for (let r = 0; r < rounds; r++) for (let k = 0; k < built.length; k++) out.push(['U', k, built[k]]);
  return out;
}

(async function () {
  const seeds = (process.argv[2] || '1,2,3').split(',').map(Number);
  const heroes = (process.argv[3] || 'sanmartin').split(',');
  const browser = await chromium.launch();
  const p = await browser.newPage();
  await p.goto('file://' + ROOT + '/index.html');
  await p.waitForFunction('window.TD && TD.Game && TD.UI');
  await p.addScriptTag({ content: BOT });
  // PARAMS='{"HP_SLOPE":0.07}' pisa los parámetros de TD.Endless sin tocar el código
  if (process.env.PARAMS) await p.evaluate(function (o) { Object.assign(TD.Endless, o); }, JSON.parse(process.env.PARAMS));
  const nSlots = await p.evaluate(function () { return new TD.Game(TD.ENDLESS_IDX, 'sanmartin').slots.length; });
  console.log('solares: ' + nSlots);
  for (const hero of heroes) {
    for (const seed of seeds) {
      const cfg = { level: 100, diff: 'normal', seed: seed, log: true, maxT: 60 * 60 * 3,
        genome: { hero: hero, heroPos: [0, 0.62], heroUps: [1, 0, 1, 2, 0], early: null, ahead: true, follow: false, lanes: !!process.env.LANES, plan: plan(nSlots) } };
      const r = await p.evaluate(function (c) {
        // vidas en el momento de superar cada oleada
        var orig = TD.Game.prototype.endlessCleared, lv = [];
        TD.Game.prototype.endlessCleared = function () { lv.push(this.lives); orig.call(this); };
        var res = window.SIM.run(c);
        TD.Game.prototype.endlessCleared = orig;
        res.livesAt = lv;
        return res;
      }, cfg);
      const lives = [20].concat(r.livesAt);
      const lost = lives.map(function (v, i) { return i ? lives[i - 1] - v : 0; }).slice(1);
      console.log(hero.padEnd(10) + ' semilla ' + seed + ': superó ' + r.cleared + ' oleadas (llegó a la ' + r.wave + '), ' + r.kills + ' bajas, ' + r.towers + ' torres, ' + Math.round(r.time / 60) + ' min');
      console.log('   vidas perdidas por oleada: ' + lost.join(' '));
    }
  }
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
