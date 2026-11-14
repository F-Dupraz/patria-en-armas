/* ============================================================
 * ui.js — pantallas y HUD, todo dibujado en el canvas:
 * menú, selección de héroe, mapa de campaña, enciclopedia,
 * HUD de batalla, pausa, victoria, derrota y tutorial.
 * Interfaz en modo inmediato: cada cuadro se dibujan los botones
 * y se registran sus zonas de clic.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD, D = TD.Draw;
  var TAU = Math.PI * 2;
  var W = TD.W, H = TD.H;

  var UI = {
    screen: 'menu', t: 0, zones: [], mx: -999, my: -999,
    game: null, modal: null, modalT: 0, starSnd: 0,
    mapSel: 0, encyTab: 0, encySel: 0, confirmReset: 0,
    tut: null, heroBack: 'menu'
  };
  TD.UI = UI;

  /* ---------------- sistema de botones ---------------- */
  UI.zone = function (x, y, w, h, cb) { UI.zones.push({ x: x, y: y, w: w, h: h, cb: cb || null }); };

  UI.hover = function (x, y, w, h) { return UI.mx >= x && UI.mx <= x + w && UI.my >= y && UI.my <= y + h; };

  UI.button = function (ctx, x, y, w, h, label, cb, o) {
    o = o || {};
    var hov = !o.disabled && UI.hover(x, y, w, h);
    D.button(ctx, x, y, w, h, hov, o);
    if (label) {
      var size = o.size || 18;
      fit(ctx, label, x + w / 2, y + h / 2 + size * 0.34, w - 14, size, o.disabled ? '#8b7a5c' : (o.color || D.INK), 'center', true);
    }
    UI.zone(x, y, w, h, o.disabled ? null : cb);
    return hov;
  };

  // Texto de una línea que se achica hasta entrar en maxW
  function fit(ctx, s, x, y, maxW, size, color, align, bold, italic) {
    D.font(ctx, size, bold, italic);
    while (size > 9 && ctx.measureText(s).width > maxW) { size -= 1; D.font(ctx, size, bold, italic); }
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color || D.INK;
    ctx.fillText(s, x, y);
  }

  function dim(ctx, a) {
    ctx.fillStyle = 'rgba(30,20,10,' + (a == null ? 0.55 : a) + ')';
    ctx.fillRect(0, 0, W, H);
    UI.zones.length = 0;
    UI.zone(0, 0, W, H, null);       // el modal bloquea los clics de abajo
  }

  function heroKey() { return TD.Save.data.hero || 'sanmartin'; }

  /* ---------------- navegación ---------------- */
  UI.go = function (screen) {
    UI.screen = screen; UI.modal = null; UI.confirmReset = 0;
    if (screen !== 'game') UI.game = null;
  };

  UI.startLevel = function (idx) {
    UI.game = new TD.Game(idx, heroKey());
    UI.screen = 'game';
    UI.modal = 'brief'; UI.modalT = 0;
    UI.tut = (TD.LEVELS[idx].tutorial && !TD.Save.data.tutorialDone) ? { step: 0, t: 0 } : null;
  };

  UI.togglePause = function () {
    var g = UI.game;
    if (!g || g.state === 'won' || g.state === 'lost') return;
    if (UI.modal === 'pause') { UI.modal = null; g.paused = false; TD.Audio.play('resume'); }
    else if (!UI.modal) { UI.modal = 'pause'; g.paused = true; TD.Audio.play('pause'); }
  };

  /* ---------------- actualización ---------------- */
  // Qué suena: menú y mapa → tema del menú; batalla → marcha (calma, oleada o jefe); final → silencio.
  function updateMusic(g) {
    var A = TD.Audio;
    if (UI.screen !== 'game' || !g) { A.setTrack('menu'); A.setMuffle(false); return; }
    var over = g.state === 'won' || g.state === 'lost' || UI.modal === 'end';
    A.setTrack(over ? null : 'battle');
    A.setMuffle(UI.modal === 'pause');
    var lvl = 0;
    if (g.boss && !g.boss.dead && !g.boss.gone) lvl = 2;
    else if (g.state === 'running' && (g.enemies.length > 0 || g.spawners.length > 0)) lvl = 1;
    A.setIntensity(lvl);
  }

  UI.update = function (dt) {
    UI.t += dt; UI.modalT += dt;
    if (UI.confirmReset > 0) UI.confirmReset -= dt;
    var g = UI.game;
    updateMusic(g);
    if (UI.screen !== 'game' || !g) return;
    g.mx = UI.mx; g.my = UI.my;
    if (!UI.modal) {
      g.update(dt);
      if (g.hero.pendingUps > 0 && g.state === 'running') { UI.modal = 'levelup'; UI.modalT = 0; }
    }
    if ((g.state === 'won' || g.state === 'lost') && UI.modal !== 'end') { UI.modal = 'end'; UI.modalT = 0; UI.starSnd = 0; }
    if (UI.tut && !UI.modal) updateTutorial(dt, g);
  };

  /* ---------------- tutorial (nivel 1) ---------------- */
  var TUT = [
    'Tocá un solar vacío (los círculos de piedra con banderín) para elegir dónde construir.',
    'Ahora elegí una torre en la barra de abajo. Los Tiradores (tecla 3) son un buen comienzo.',
    'Si te alcanza el oro, construí otra defensa. Después tocá «Llamar oleada» (o Espacio) para empezar.',
    'Cada enemigo abatido da oro. Tocá una torre para mejorarla: cada una tiene dos ramas distintas.',
    'Podés adelantar la próxima oleada para ganar oro extra. Tocá a tu héroe y después el mapa para moverlo. P o Esc pausan.'
  ];

  function updateTutorial(dt, g) {
    var tu = UI.tut, i, up = false;
    tu.t += dt;
    for (i = 0; i < g.towers.length; i++) if (g.towers[i].level > 0) up = true;
    if (tu.step === 0 && ((g.sel && g.sel.slot) || g.towers.length > 0 || g.armed)) { tu.step = 1; tu.t = 0; }
    if (tu.step === 1 && g.towers.length > 0) { tu.step = 2; tu.t = 0; }
    if (tu.step <= 2 && g.waveIdx >= 1) { tu.step = 3; tu.t = 0; }
    if (tu.step === 3 && (up || g.waveIdx >= 3)) { tu.step = 4; tu.t = 0; }
    if (tu.step === 4 && tu.t > 14) endTutorial();
  }

  function endTutorial() {
    UI.tut = null;
    TD.Save.data.tutorialDone = true;
    TD.Save.save();
  }

  function arrow(ctx, x, y) {
    var b = Math.sin(UI.t * 6) * 5;
    ctx.fillStyle = D.GOLD; ctx.strokeStyle = D.INK; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + b); ctx.lineTo(x - 13, y - 18 + b); ctx.lineTo(x - 5, y - 18 + b); ctx.lineTo(x - 5, y - 36 + b);
    ctx.lineTo(x + 5, y - 36 + b); ctx.lineTo(x + 5, y - 18 + b); ctx.lineTo(x + 13, y - 18 + b);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  function drawTutorial(ctx, g) {
    var tu = UI.tut, x = 300, y = 54, w = 680, h = 62;
    D.panel(ctx, x, y, w, h, 0.96);
    D.text(ctx, 'Instrucción ' + (tu.step + 1) + ' de ' + TUT.length, x + 16, y + 20, 12, D.INK2, 'left', true);
    D.wrap(ctx, TUT[tu.step], x + 16, y + 38, w - 70, 17, 14, D.INK, 'left', false);
    UI.button(ctx, x + w - 44, y + 8, 34, 26, '×', endTutorial, { size: 18 });
    if (tu.step === 0 && g.slots.length) arrow(ctx, g.slots[0].x, g.slots[0].y - 30);
    else if (tu.step === 1) arrow(ctx, 232 + 2 * 184 + 89, TD.BAR_Y);
    else if (tu.step === 2 && g.towers.length >= 2) arrow(ctx, 1126, TD.BAR_Y);
    else if (tu.step === 2) arrow(ctx, 1126, TD.BAR_Y);
    else if (tu.step === 3 && g.towers.length) arrow(ctx, g.towers[0].x, g.towers[0].y - 96);
  }

  /* ================================================================
   *                             MENÚ
   * ================================================================ */
  var MARCH_A = { kind: 'inf', coat: '#1f3a6e', pants: '#f1ecdc', hat: 'morrion', trim: '#f6f2e4', plume: '#cf2b2b', weapon: 'musket', walk: true, face: 1, s: 1.6, t: 0 };
  var MARCH_B = { kind: 'inf', coat: '#74acdf', pants: '#f1ecdc', hat: 'shako', trim: '#f6f2e4', plume: '#f6f2e4', weapon: 'musket', walk: true, face: 1, s: 1.6, t: 0 };
  var MARCH_G = { kind: 'cav', coat: '#8a5a2b', pants: '#3a2a1a', hat: 'gaucho', hatc: '#2a1c12', horse: '#6b4423', weapon: 'lanza', poncho: '#b3142a', walk: true, face: 1, s: 1.6, t: 0 };

  function drawMenu(ctx) {
    var i, t = UI.t;
    D.parchment(ctx);
    // franjas celeste y blanca
    ctx.fillStyle = 'rgba(116,172,223,0.35)'; ctx.fillRect(22, 150, W - 44, 46); ctx.fillRect(22, 242, W - 44, 46);
    ctx.fillStyle = 'rgba(246,242,228,0.55)'; ctx.fillRect(22, 196, W - 44, 46);
    D.sun(ctx, W / 2, 104, 34, t);
    D.font(ctx, 78, true);
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.lineWidth = 8; ctx.strokeStyle = D.PARCH; ctx.strokeText('PATRIA EN ARMAS', W / 2, 246);
    ctx.fillStyle = D.INK; ctx.fillText('PATRIA EN ARMAS', W / 2, 246);
    D.text(ctx, 'Tower Defense de las Invasiones Inglesas, la Independencia y la Vuelta de Obligado', W / 2, 322, 21, D.INK2, 'center', false, true);

    var bx = W / 2 - 150, by = 356;
    UI.button(ctx, bx, by, 300, 54, 'Jugar', function () {
      if (TD.Save.data.hero) UI.go('map'); else { UI.heroBack = 'menu'; UI.go('hero'); }
    }, { primary: true, size: 24 });
    UI.button(ctx, bx, by + 66, 300, 46, 'Enciclopedia', function () { UI.go('ency'); }, { size: 20 });
    UI.button(ctx, bx, by + 122, 144, 46, 'Sonido: ' + (TD.Audio.on ? 'sí' : 'no'), function () { TD.Audio.setOn(!TD.Audio.on); }, { size: 18 });
    UI.button(ctx, bx + 156, by + 122, 144, 46, 'Música: ' + (TD.Audio.music ? 'sí' : 'no'), function () { TD.Audio.setMusic(!TD.Audio.music); }, { size: 18 });
    UI.button(ctx, bx, by + 178, 300, 40, UI.confirmReset > 0 ? '¿Seguro? Tocá de nuevo para borrar' : 'Borrar progreso', function () {
      if (UI.confirmReset > 0) { TD.Save.reset(); TD.Audio.sync(); UI.confirmReset = 0; }
      else UI.confirmReset = 4;
    }, { size: 15, danger: UI.confirmReset > 0 });

    // desfile
    ctx.fillStyle = 'rgba(59,42,26,0.18)'; ctx.fillRect(22, 652, W - 44, 3);
    for (i = 0; i < 9; i++) {
      var o = i % 3 === 2 ? MARCH_G : (i % 2 ? MARCH_B : MARCH_A);
      o.t = t + i * 0.37;
      var x = ((t * 46 + i * 150) % (W + 200)) - 100;
      D.shadow(ctx, x, 652, 14, 4);
      D.unit(ctx, x, 650, o);
    }
    D.flagPole(ctx, 120, 652, 150, 'arg', t, 84, 54, 1);
    D.flagPole(ctx, W - 120, 652, 150, 'arg', t + 1, 84, 54, -1);
    D.star(ctx, 1150, 62, 12, true);
    D.text(ctx, TD.Save.totalStars() + ' / ' + (TD.LEVELS.length * 3), 1170, 69, 19, D.INK, 'left', true);
    D.text(ctx, 'Mouse o táctil · 1-4 torres · Espacio oleada · P/Esc pausa · F velocidad · Q habilidad de torre · H héroe', W / 2, 690, 13, D.INK2, 'center');
  }

  /* ================================================================
   *                      SELECCIÓN DE HÉROE
   * ================================================================ */
  var HERO_FIG = {};
  function heroFig(key, t, s) {
    var look = TD.HEROES[key].look, k;
    for (k in HERO_FIG) if (Object.prototype.hasOwnProperty.call(HERO_FIG, k)) delete HERO_FIG[k];
    for (k in look) if (Object.prototype.hasOwnProperty.call(look, k)) HERO_FIG[k] = look[k];
    HERO_FIG.s = s; HERO_FIG.t = t; HERO_FIG.face = 1; HERO_FIG.walk = false; HERO_FIG.atk = 0;
    return HERO_FIG;
  }

  // Presencia histórica de cada héroe en cada acto (ver epochs en data.js)
  var EPOCH_COL = { yes: '#5cb24a', part: '#e9c64a', no: '#cf5a4a' };
  var EPOCH_TAG = ['I', 'II', 'III'];

  function drawHeroSelect(ctx) {
    var t = UI.t;
    D.parchment(ctx);
    D.text(ctx, 'Elegí tu héroe', W / 2, 52, 36, D.INK, 'center', true);
    D.text(ctx, 'Te acompaña en toda la campaña. Podés cambiarlo cuando quieras desde el mapa.', W / 2, 78, 15, D.INK2, 'center', false, true);
    TD.HERO_KEYS.forEach(function (key, n) {
      var def = TD.HEROES[key], x = 60 + n * 395, y = 94, w = 370, h = 560;
      var cur = TD.Save.data.hero === key;
      D.panel(ctx, x, y, w, h);
      if (cur) { ctx.strokeStyle = '#2f6ea8'; ctx.lineWidth = 4; D.rr(ctx, x - 3, y - 3, w + 6, h + 6, 12); ctx.stroke(); }
      // retrato
      ctx.fillStyle = 'rgba(116,172,223,0.3)';
      ctx.beginPath(); ctx.arc(x + w / 2, y + 88, 76, 0, TAU); ctx.fill();
      ctx.strokeStyle = D.INK2; ctx.lineWidth = 2; ctx.stroke();
      var o = heroFig(key, t, key === 'guemes' ? 2.4 : 3.0);
      o.atk = UI.hover(x, y, w, h) ? (t * 1.2) % 1 : 0;
      D.shadow(ctx, x + w / 2, y + 150, 42, 9);
      D.unit(ctx, x + w / 2 - (key === 'guemes' ? 8 : 0), y + 148, o);
      D.text(ctx, def.name, x + w / 2, y + 196, 30, D.INK, 'center', true);
      D.text(ctx, def.title, x + w / 2, y + 220, 15, D.INK2, 'center', false, true);
      var yy = D.wrap(ctx, def.bio, x + 24, y + 250, w - 48, 20, 15, D.INK, 'left');
      yy += 6;
      D.text(ctx, 'Habilidad: ' + def.ability.name, x + 24, yy, 16, '#2f5f8f', 'left', true);
      yy = D.wrap(ctx, def.ability.desc, x + 24, yy + 22, w - 48, 20, 15, D.INK, 'left');

      // ¿En qué actos estuvo realmente?
      yy += 8;
      ctx.strokeStyle = 'rgba(59,42,26,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 24, yy - 12); ctx.lineTo(x + w - 24, yy - 12); ctx.stroke();
      D.text(ctx, 'En la historia real', x + 24, yy + 4, 14, D.INK, 'left', true);
      def.epochs.forEach(function (ep, i) {
        var ry = yy + 14 + i * 24;
        ctx.fillStyle = EPOCH_COL[ep.s]; D.rr(ctx, x + 24, ry, 34, 18, 5); ctx.fill();
        ctx.strokeStyle = D.INK2; ctx.lineWidth = 1; D.rr(ctx, x + 24, ry, 34, 18, 5); ctx.stroke();
        D.text(ctx, EPOCH_TAG[i], x + 41, ry + 14, 13, ep.s === 'no' ? '#fff' : D.INK, 'center', true);
        fit(ctx, ep.t, x + 66, ry + 14, w - 66 - 20, 12.5, D.INK, 'left');
      });

      D.text(ctx, 'Vida ' + def.hp + ' · Daño ' + def.dmg + ' (' + TD.DMG_NAMES[def.type] + ') · Vel. ' + def.spd, x + w / 2, y + h - 62, 13, D.INK2, 'center');
      UI.button(ctx, x + 60, y + h - 50, w - 120, 38, cur ? 'Seguir con ' + def.name : 'Elegir a ' + def.name, function () {
        TD.Save.data.hero = key; TD.Save.save();
        UI.go('map');
      }, { primary: true, size: 17 });
    });

    // aviso: la selección no refleja la historia
    ctx.fillStyle = 'rgba(179,20,42,0.12)'; D.rr(ctx, 60, 664, W - 120, 46, 8); ctx.fill();
    ctx.strokeStyle = D.PUNZO; ctx.lineWidth = 2; D.rr(ctx, 60, 664, W - 120, 46, 8); ctx.stroke();
    D.text(ctx, 'Esta selección de héroes no representa la realidad: es solamente para fines del juego.', W / 2, 685, 16, D.INK, 'center', true);
    D.text(ctx, 'Actos: I · 1806-07   II · 1812-18   III · 1845        Verde: estuvo · Amarillo: estuvo en parte · Rojo: no estuvo', W / 2, 702, 12, D.INK2, 'center');
    UI.button(ctx, 40, 34, 120, 38, '← Volver', function () { UI.go(UI.heroBack); }, { size: 16 });
  }

  /* ================================================================
   *                       MAPA DE CAMPAÑA
   * ================================================================ */
  var ACT_COLORS = ['#cf2b2b', '#74acdf', '#b3142a'];

  function drawMapArt(ctx) {
    var i, y;
    // marco del mapa
    ctx.save();
    D.rr(ctx, 30, 90, 800, 600, 10); ctx.clip();
    ctx.fillStyle = '#dfcb97'; ctx.fillRect(30, 90, 800, 600);
    // océanos
    ctx.fillStyle = 'rgba(116,172,223,0.38)';
    ctx.beginPath(); ctx.moveTo(30, 90); ctx.lineTo(120, 90); ctx.quadraticCurveTo(70, 300, 95, 520); ctx.quadraticCurveTo(110, 620, 150, 690); ctx.lineTo(30, 690); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(830, 90); ctx.lineTo(730, 90); ctx.quadraticCurveTo(780, 250, 745, 420); ctx.quadraticCurveTo(735, 500, 700, 548);
    ctx.lineTo(755, 600); ctx.quadraticCurveTo(790, 650, 740, 690); ctx.lineTo(830, 690); ctx.closePath(); ctx.fill();
    // costas
    ctx.strokeStyle = D.INK2; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(120, 90); ctx.quadraticCurveTo(70, 300, 95, 520); ctx.quadraticCurveTo(110, 620, 150, 690); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(730, 90); ctx.quadraticCurveTo(780, 250, 745, 420); ctx.quadraticCurveTo(735, 500, 700, 548); ctx.lineTo(755, 600); ctx.quadraticCurveTo(790, 650, 740, 690); ctx.stroke();
    // olas
    ctx.strokeStyle = 'rgba(59,42,26,0.25)'; ctx.lineWidth = 1;
    for (i = 0; i < 16; i++) {
      var ox = i % 2 ? 40 + (i * 13) % 40 : 770 + (i * 17) % 50, oy = 120 + i * 35;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(ox + 6, oy - 4, ox + 12, oy); ctx.quadraticCurveTo(ox + 18, oy + 4, ox + 24, oy); ctx.stroke();
    }
    // río Paraná
    ctx.strokeStyle = 'rgba(70,120,170,0.7)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(660, 90); ctx.quadraticCurveTo(640, 220, 612, 300); ctx.quadraticCurveTo(598, 380, 604, 440); ctx.quadraticCurveTo(600, 500, 650, 525); ctx.lineTo(700, 548); ctx.stroke();
    // cordillera
    for (y = 110; y < 690; y += 30) {
      var cx = 222 + Math.sin(y * 0.02) * 12;
      ctx.fillStyle = '#b3a58a';
      ctx.beginPath(); ctx.moveTo(cx - 15, y + 12); ctx.lineTo(cx, y - 12); ctx.lineTo(cx + 15, y + 12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = D.INK2; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#f6f2e4';
      ctx.beginPath(); ctx.moveTo(cx - 5, y - 4); ctx.lineTo(cx, y - 12); ctx.lineTo(cx + 5, y - 4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = D.INK; ctx.lineWidth = 2.5; D.rr(ctx, 30, 90, 800, 600, 10); ctx.stroke();
    // rótulos
    D.text(ctx, 'Océano', 50, 640, 13, 'rgba(59,42,26,0.6)', 'left', false, true);
    D.text(ctx, 'Pacífico', 50, 656, 13, 'rgba(59,42,26,0.6)', 'left', false, true);
    D.text(ctx, 'Océano Atlántico', 818, 672, 13, 'rgba(59,42,26,0.6)', 'right', false, true);
    D.text(ctx, 'CHILE', 150, 290, 15, 'rgba(59,42,26,0.55)', 'center', true);
    D.text(ctx, 'Cordillera de los Andes', 250, 600, 13, 'rgba(59,42,26,0.6)', 'left', false, true);
    D.text(ctx, 'PROVINCIAS UNIDAS', 440, 300, 17, 'rgba(59,42,26,0.4)', 'center', true);
    D.text(ctx, 'Río Paraná', 668, 250, 13, 'rgba(47,95,143,0.9)', 'left', false, true);
    D.text(ctx, 'Río de la Plata', 824, 560, 12, 'rgba(47,95,143,0.9)', 'right', false, true);
    D.text(ctx, 'Buenos Aires', 560, 610, 14, D.INK, 'center', true);
    D.text(ctx, 'Tucumán', 432, 140, 14, D.INK, 'center', true);
    D.text(ctx, 'San Lorenzo', 520, 318, 14, D.INK, 'center', true);
    D.text(ctx, 'Vuelta de Obligado', 470, 452, 14, D.INK, 'center', true);
    D.text(ctx, 'Mendoza', 300, 440, 13, D.INK2, 'center');
    D.text(ctx, 'Santiago', 150, 480, 13, D.INK2, 'center');
    // rosa de los vientos
    ctx.save(); ctx.translate(760, 150);
    ctx.strokeStyle = D.INK2; ctx.lineWidth = 1.2; ctx.fillStyle = D.INK2;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.stroke();
    for (i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(5, 0); ctx.lineTo(-5, 0); ctx.closePath(); if (i === 3) ctx.fill(); else ctx.stroke();
    }
    ctx.restore();
    D.text(ctx, 'N', 760, 116, 13, D.INK, 'center', true);
  }

  function drawMap(ctx) {
    var i, S = TD.Save.data, t = UI.t;
    D.parchment(ctx);
    D.text(ctx, 'Campaña', 640, 66, 34, D.INK, 'center', true);
    UI.button(ctx, 40, 34, 110, 38, '← Menú', function () { UI.go('menu'); }, { size: 16 });
    UI.button(ctx, 160, 34, 230, 38, 'Héroe: ' + TD.HEROES[heroKey()].name, function () { UI.heroBack = 'map'; UI.go('hero'); }, { size: 16 });
    UI.button(ctx, 400, 34, 150, 38, 'Enciclopedia', function () { UI.go('ency'); }, { size: 16 });
    D.star(ctx, 1150, 54, 13, true);
    D.text(ctx, TD.Save.totalStars() + ' / ' + (TD.LEVELS.length * 3), 1170, 61, 20, D.INK, 'left', true);

    drawMapArt(ctx);

    // ruta punteada
    ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(59,42,26,0.75)'; ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (i = 0; i < TD.LEVELS.length; i++) {
      var mp = TD.LEVELS[i].mapPos;
      if (i === 0) ctx.moveTo(mp[0], mp[1]); else ctx.lineTo(mp[0], mp[1]);
    }
    ctx.stroke(); ctx.setLineDash([]);

    // nodos
    TD.LEVELS.forEach(function (lvl, n) {
      var x = lvl.mapPos[0], y = lvl.mapPos[1], open = n < S.unlocked, st = S.stars[String(n)] | 0, k;
      if (n === UI.mapSel) {
        ctx.strokeStyle = D.GOLD; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x, y, 22 + Math.sin(t * 5) * 2, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,20,10,0.3)'; ctx.beginPath(); ctx.arc(x + 2, y + 3, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = open ? '#f6f2e4' : '#b8ab8c';
      ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.fill();
      ctx.strokeStyle = open ? ACT_COLORS[lvl.act] : '#7d7054'; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = D.INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 18, 0, TAU); ctx.stroke();
      D.text(ctx, String(n + 1), x, y + 6, 17, open ? D.INK : '#7d7054', 'center', true);
      if (open && S.stars[String(n)] != null) {
        for (k = 0; k < 3; k++) D.star(ctx, x - 11 + k * 11, y + 26, 5, k < st);
      }
      UI.zone(x - 22, y - 22, 44, 50, function () { UI.mapSel = n; TD.Audio.play('click'); });
    });

    // panel del nivel elegido
    var lvl = TD.LEVELS[UI.mapSel], px = 850, py = 90, pw = 400, ph = 600, k2;
    var open = UI.mapSel < S.unlocked;
    D.panel(ctx, px, py, pw, ph);
    D.text(ctx, TD.ACTS[lvl.act].name, px + pw / 2, py + 34, 15, ACT_COLORS[lvl.act] === '#74acdf' ? '#2f6ea8' : ACT_COLORS[lvl.act], 'center', true);
    fit(ctx, (UI.mapSel + 1) + '. ' + lvl.name, px + pw / 2, py + 72, pw - 40, 30, D.INK, 'center', true);
    D.text(ctx, lvl.year + ' · ' + lvl.place, px + pw / 2, py + 96, 15, D.INK2, 'center', false, true);
    for (k2 = 0; k2 < 3; k2++) D.star(ctx, px + pw / 2 - 34 + k2 * 34, py + 128, 14, k2 < (S.stars[String(UI.mapSel)] | 0));
    ctx.strokeStyle = 'rgba(59,42,26,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 30, py + 156); ctx.lineTo(px + pw - 30, py + 156); ctx.stroke();
    D.text(ctx, lvl.speaker + ':', px + 28, py + 184, 15, D.INK, 'left', true);
    var yy = D.wrap(ctx, '—' + lvl.talk, px + 28, py + 206, pw - 56, 21, 15, D.INK, 'left', false, true);
    yy += 14;
    D.text(ctx, 'Objetivos de estrellas', px + 28, yy, 16, D.INK, 'left', true);
    yy += 26;
    lvl.stars.forEach(function (o) {
      D.star(ctx, px + 38, yy - 5, 8, false);
      D.text(ctx, TD.objectiveText(o), px + 56, yy, 15, D.INK, 'left');
      yy += 26;
    });
    yy += 6;
    D.text(ctx, lvl.waves.length + ' oleadas · ' + lvl.gold + ' de oro inicial · ' + lvl.lives + ' vidas', px + 28, yy, 14, D.INK2, 'left');
    if (open) {
      UI.button(ctx, px + 50, py + ph - 140, pw - 100, 56, '¡A la batalla!', function () { UI.startLevel(UI.mapSel); }, { primary: true, size: 24 });
    } else {
      UI.button(ctx, px + 50, py + ph - 140, pw - 100, 56, 'Bloqueado', null, { disabled: true, size: 22 });
      D.text(ctx, 'Ganá la batalla anterior para desbloquearla.', px + pw / 2, py + ph - 62, 14, D.INK2, 'center', false, true);
    }
    UI.button(ctx, px + 50, py + ph - 48, pw - 100, 32, 'Ver ficha histórica', function () { UI.encyTab = 0; UI.encySel = UI.mapSel; UI.go('ency'); }, { size: 14 });
  }

  /* ================================================================
   *                         ENCICLOPEDIA
   * ================================================================ */
  var ENC_FIG = {};
  function drawEncy(ctx) {
    var i, k;
    D.parchment(ctx);
    D.text(ctx, 'Enciclopedia', 640, 66, 34, D.INK, 'center', true);
    UI.button(ctx, 40, 34, 120, 38, '← Volver', function () { UI.go(TD.Save.data.hero ? 'map' : 'menu'); }, { size: 16 });
    UI.button(ctx, 880, 34, 170, 38, 'Batallas', function () { UI.encyTab = 0; }, { size: 16, active: UI.encyTab === 0 });
    UI.button(ctx, 1060, 34, 180, 38, 'Guía de combate', function () { UI.encyTab = 1; }, { size: 16, active: UI.encyTab === 1 });

    if (UI.encyTab === 0) {
      D.panel(ctx, 40, 92, 400, 598);
      var y = 108, lastAct = -1;
      TD.LEVELS.forEach(function (lvl, n) {
        if (lvl.act !== lastAct) {
          lastAct = lvl.act;
          D.text(ctx, TD.ACTS[lvl.act].name, 58, y + 18, 14, D.INK2, 'left', true);
          y += 26;
        }
        UI.button(ctx, 56, y, 368, 34, (n + 1) + '. ' + lvl.name + ' (' + lvl.year + ')', function () { UI.encySel = n; }, { size: 15, active: UI.encySel === n });
        y += 39;
      });
      var lv = TD.LEVELS[UI.encySel];
      D.panel(ctx, 460, 92, 780, 598);
      D.text(ctx, TD.ACTS[lv.act].name + ' · ' + TD.ACTS[lv.act].years, 850, 132, 15, D.INK2, 'center', true);
      D.text(ctx, lv.name, 850, 180, 38, D.INK, 'center', true);
      D.text(ctx, lv.year + ' · ' + lv.place, 850, 210, 17, D.INK2, 'center', false, true);
      ctx.strokeStyle = 'rgba(59,42,26,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(520, 232); ctx.lineTo(1180, 232); ctx.stroke();
      var yy = 276;
      lv.info.forEach(function (line) {
        ctx.fillStyle = D.PUNZO; ctx.beginPath(); ctx.arc(512, yy - 6, 4, 0, TAU); ctx.fill();
        yy = D.wrap(ctx, line, 530, yy, 660, 27, 19, D.INK, 'left') + 18;
      });
      D.flagPole(ctx, 1180, 660, 70, TD.flagFor(lv), UI.t, 44, 28, -1);
      D.text(ctx, 'Datos generales de contexto. El terreno y las tropas del juego son aproximados.', 850, 668, 13, D.INK2, 'center', false, true);
    } else {
      // tabla de daño contra armadura
      D.panel(ctx, 40, 92, 560, 250);
      D.text(ctx, 'Daño contra armadura', 320, 126, 20, D.INK, 'center', true);
      var cols = TD.ARMORS, rows = ['cont', 'perf', 'fuego'];
      for (i = 0; i < 3; i++) D.text(ctx, 'Armadura ' + cols[i], 270 + i * 120, 160, 14, D.INK2, 'center', true);
      rows.forEach(function (r, ri) {
        var ry = 196 + ri * 38;
        D.text(ctx, TD.DMG_NAMES[r].charAt(0).toUpperCase() + TD.DMG_NAMES[r].slice(1), 64, ry, 16, D.INK, 'left', true);
        for (k = 0; k < 3; k++) {
          var m = TD.DMG[r][cols[k]];
          ctx.fillStyle = m >= 1.25 ? 'rgba(92,178,74,0.4)' : (m <= 0.75 ? 'rgba(207,43,43,0.3)' : 'rgba(107,82,54,0.15)');
          D.rr(ctx, 220 + k * 120, ry - 22, 100, 30, 6); ctx.fill();
          D.text(ctx, '×' + m, 270 + k * 120, ry, 17, D.INK, 'center', true);
        }
      });
      D.text(ctx, 'Verde: «¡Muy eficaz!» · Rojo: «Resiste». Mirá el texto flotante durante el combate.', 320, 322, 13, D.INK2, 'center', false, true);

      // torres
      D.panel(ctx, 40, 356, 560, 334);
      D.text(ctx, 'Torres', 320, 388, 20, D.INK, 'center', true);
      TD.TOWER_KEYS.forEach(function (key, n) {
        var def = TD.TOWERS[key], ty = 420 + n * 68;
        D.towerPreview(ctx, key, -1, 0, 84, ty + 30, 0.72, UI.t);
        D.text(ctx, TD.towerName(key) + ' — ' + def.cost + ' de oro · daño ' + TD.DMG_NAMES[def.base.type], 130, ty, 15, D.INK, 'left', true);
        fit(ctx, def.branches[0].name + ': ' + def.branches[0].desc, 130, ty + 17, 450, 13, D.INK, 'left');
        fit(ctx, def.branches[1].name + ': ' + def.branches[1].desc, 130, ty + 32, 450, 13, D.INK, 'left');
        fit(ctx, 'Habilidad (rama completa): ' + def.ability.name, 130, ty + 47, 450, 12, '#2f5f8f', 'left', true);
      });

      // enemigos
      D.panel(ctx, 620, 92, 620, 598);
      D.text(ctx, 'Enemigos', 930, 126, 20, D.INK, 'center', true);
      var list = ['casaca', 'realista', 'frances', 'explorador', 'caballeria', 'pesado', 'cazador', 'cirujano', 'espia', 'veterano', 'lancha', 'bergantin', 'vapor'];
      list.forEach(function (id, n) {
        var def = TD.ENEMIES[id], col = n % 2, row = (n / 2) | 0, ex = 640 + col * 300, ey = 150 + row * 72;
        for (k in ENC_FIG) if (Object.prototype.hasOwnProperty.call(ENC_FIG, k)) delete ENC_FIG[k];
        for (k in def.look) if (Object.prototype.hasOwnProperty.call(def.look, k)) ENC_FIG[k] = def.look[k];
        ENC_FIG.t = UI.t; ENC_FIG.face = 1; ENC_FIG.walk = false; ENC_FIG.atk = 0;
        if (def.naval) { ENC_FIG.s = 0.55; ENC_FIG.noWake = true; D.ship(ctx, ex + 34, ey + 44, ENC_FIG); }
        else { ENC_FIG.s = (ENC_FIG.s || 1) * 1.15; D.unit(ctx, ex + 30, ey + 52, ENC_FIG); }
        D.text(ctx, def.name, ex + 70, ey + 22, 15, D.INK, 'left', true);
        D.text(ctx, def.trait + ' · armadura ' + def.armor, ex + 70, ey + 40, 13, D.INK2, 'left');
        D.text(ctx, 'Vida ' + def.hp + ' · vel. ' + def.spd + ' · oro ' + def.gold, ex + 70, ey + 56, 13, D.INK2, 'left');
      });
      D.text(ctx, 'Jefes: uno por batalla, con tres fases (al 66 % y al 33 % de vida).', 930, 672, 13, D.INK2, 'center', false, true);
    }
  }

  /* ================================================================
   *                         HUD DE BATALLA
   * ================================================================ */
  function iconPause(ctx, x, y) { ctx.fillStyle = D.INK; ctx.fillRect(x - 6, y - 8, 4.5, 16); ctx.fillRect(x + 1.5, y - 8, 4.5, 16); }
  function iconSound(ctx, x, y, on) {
    ctx.fillStyle = D.INK; ctx.strokeStyle = D.INK; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 9, y - 3); ctx.lineTo(x - 5, y - 3); ctx.lineTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.lineTo(x - 5, y + 3); ctx.lineTo(x - 9, y + 3); ctx.closePath(); ctx.fill();
    if (on) { ctx.beginPath(); ctx.arc(x + 1, y, 5, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 1, y, 9, -0.8, 0.8); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(x + 3, y - 5); ctx.lineTo(x + 11, y + 5); ctx.moveTo(x + 11, y - 5); ctx.lineTo(x + 3, y + 5); ctx.stroke(); }
  }

  function iconNote(ctx, x, y, on) {
    ctx.fillStyle = D.INK; ctx.strokeStyle = D.INK; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(x - 4, y + 6, 4.6, 3.4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 0.2, y + 5); ctx.lineTo(x + 0.2, y - 8); ctx.lineTo(x + 7, y - 5); ctx.stroke();
    if (!on) { ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 10, y + 10); ctx.lineTo(x + 10, y - 10); ctx.stroke(); }
  }

  function towerButton(ctx, g, key, n, x, y, w, h) {
    var def = TD.TOWERS[key], can = g.gold >= def.cost;
    var active = g.armed === key;
    var hov = UI.hover(x, y, w, h);
    D.button(ctx, x, y, w, h, hov && can, { disabled: !can, active: active });
    D.towerIcon(ctx, key, x + 26, y + h / 2, 1.5);
    fit(ctx, TD.towerName(key, g.lvl.act), x + 52, y + 26, w - 60, 15, can ? D.INK : '#8b7a5c', 'left', true);
    D.coin(ctx, x + 60, y + 45, 7);
    D.text(ctx, String(def.cost), x + 72, y + 50, 15, can ? D.INK : '#a0522d', 'left', true);
    D.text(ctx, '[' + (n + 1) + ']', x + w - 10, y + 50, 13, D.INK2, 'right', true);
    UI.zone(x, y, w, h, function () { UI.pickTower(key); });
    return hov;
  }

  // Elegir una torre (botón o teclas 1-4)
  UI.pickTower = function (key) {
    var g = UI.game;
    if (!g || UI.modal) return;
    if (g.sel && g.sel.slot && !g.sel.slot.tower) {
      g.build(g.sel.slot, key, false);
    } else {
      g.armed = g.armed === key ? null : key;
      if (g.armed) { g.sel = null; g.mode = null; }
      TD.Audio.play('click');
    }
  };

  function upgradeButton(ctx, g, tw, b, x, y, w, h, keyHint) {
    var br = tw.def.branches[b], cost = tw.upgradeCost(b), can = g.gold >= cost;
    var hov = UI.hover(x, y, w, h);
    D.button(ctx, x, y, w, h, hov && can, { disabled: !can });
    var lvlTxt = ['I', 'II', 'III'][tw.level];
    fit(ctx, br.name + ' ' + lvlTxt + (keyHint ? '  [' + keyHint + ']' : ''), x + 12, y + 22, w - 90, 16, can ? D.INK : '#8b7a5c', 'left', true);
    D.coin(ctx, x + w - 62, y + 17, 7);
    D.text(ctx, String(cost), x + w - 50, y + 22, 15, can ? D.INK : '#a0522d', 'left', true);
    D.wrap(ctx, br.desc, x + 12, y + 40, w - 22, 14, 12, can ? D.INK2 : '#8b7a5c', 'left');
    UI.zone(x, y, w, h, function () {
      if (!tw.upgrade(b)) { g.addText(tw.x, tw.y - 80, 'Te falta oro', '#ffb0a0', 14); }
    });
  }

  function cooldownOverlay(ctx, x, y, w, h, frac) {
    if (frac <= 0) return;
    ctx.fillStyle = 'rgba(30,20,10,0.5)';
    D.rr(ctx, x, y, w * Math.min(1, frac), h, 8); ctx.fill();
  }

  function drawHUD(ctx, g) {
    var i, lvl = g.lvl, t = UI.t, BY = TD.BAR_Y;

    // --- marcadores de entrada (llaman la oleada) ---
    if (g.canCall() && !UI.modal) {
      var next = lvl.waves[g.waveIdx], used = {};
      for (i = 0; i < next.groups.length; i++) used[next.groups[i].path] = true;
      g.entries.forEach(function (en) {
        if (!used[en.pi]) return;
        var r = 17 + Math.sin(t * 5) * 2;
        ctx.fillStyle = 'rgba(179,20,42,0.92)'; ctx.strokeStyle = D.BLANCO; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(en.x, en.y, r, 0, TAU); ctx.fill(); ctx.stroke();
        D.towerIcon(ctx, 'granaderos', en.x, en.y, 0.9);
        if (g.state === 'running' && g.nextTimer > 0) {
          ctx.strokeStyle = D.GOLD; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(en.x, en.y, r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, g.nextTimer / 30)); ctx.stroke();
        }
        UI.zone(en.x - 24, en.y - 24, 48, 48, function () { g.callWave(false); });
      });
    }

    // --- barra superior ---
    ctx.fillStyle = 'rgba(46,32,18,0.92)'; ctx.fillRect(0, 0, W, TD.TOP_H);
    ctx.fillStyle = D.GOLD; ctx.fillRect(0, TD.TOP_H - 2, W, 2);
    UI.zone(0, 0, W, TD.TOP_H, null);
    var flash = g.lifeFlash > 0 ? 1 + g.lifeFlash : 1;
    D.heart(ctx, 28, 22, 10 * flash);
    D.text(ctx, String(g.lives), 46, 29, 22, g.lives <= 5 ? '#ff9a8a' : D.PARCH, 'left', true);
    D.coin(ctx, 112, 22, 11);
    D.text(ctx, String(Math.floor(g.gold)), 130, 29, 22, '#ffd76a', 'left', true);
    D.text(ctx, 'Oleada ' + g.waveIdx + ' / ' + lvl.waves.length, 230, 29, 19, D.PARCH, 'left', true);
    fit(ctx, lvl.name + ' · ' + lvl.year, W / 2, 29, 420, 20, D.PARCH, 'center', true, true);
    // botones de sistema
    UI.button(ctx, W - 52, 6, 44, 32, '', UI.togglePause);
    iconPause(ctx, W - 30, 22);
    UI.button(ctx, W - 104, 6, 44, 32, 'x' + g.speed, function () { g.speed = g.speed === 1 ? 2 : 1; TD.Audio.play('click'); }, { size: 17, active: g.speed === 2 });
    UI.button(ctx, W - 156, 6, 44, 32, '', function () { TD.Audio.setOn(!TD.Audio.on); });
    iconSound(ctx, W - 136, 22, TD.Audio.on);
    UI.button(ctx, W - 208, 6, 44, 32, '', function () { TD.Audio.setMusic(!TD.Audio.music); });
    iconNote(ctx, W - 186, 22, TD.Audio.music);

    // --- barra del jefe ---
    if (g.boss && !g.boss.dead && !g.boss.gone) {
      var b = g.boss, bw = 440, bx = W / 2 - bw / 2, by = 52;
      ctx.fillStyle = 'rgba(46,32,18,0.88)'; D.rr(ctx, bx, by, bw, 34, 8); ctx.fill();
      ctx.strokeStyle = D.GOLD; ctx.lineWidth = 1.5; ctx.stroke();
      fit(ctx, b.def.name + ' — fase ' + b.phase + ' de 3', W / 2, by + 15, bw - 20, 13, D.PARCH, 'center', true);
      ctx.fillStyle = '#3a1410'; ctx.fillRect(bx + 14, by + 20, bw - 28, 8);
      ctx.fillStyle = b.phase === 3 ? '#ff5a3a' : (b.phase === 2 ? '#e0762f' : D.SCARLET);
      ctx.fillRect(bx + 14, by + 20, (bw - 28) * Math.max(0, b.hp / b.maxHp), 8);
      ctx.fillStyle = D.PARCH;
      ctx.fillRect(bx + 14 + (bw - 28) * 0.66 - 1, by + 18, 2, 12);
      ctx.fillRect(bx + 14 + (bw - 28) * 0.33 - 1, by + 18, 2, 12);
    }

    // --- cartel ---
    if (g.banner && !UI.modal) {
      var bn = g.banner, a = Math.min(1, bn.t * 5, (bn.dur - bn.t) * 3);
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      D.font(ctx, 22, true);
      var tw2 = Math.min(900, ctx.measureText(bn.text).width + 70), ty = g.boss ? 98 : 62;
      if (UI.tut) ty = 124;
      ctx.fillStyle = 'rgba(46,32,18,0.85)';
      ctx.beginPath(); ctx.moveTo(W / 2 - tw2 / 2 - 14, ty + 18); ctx.lineTo(W / 2 - tw2 / 2, ty); ctx.lineTo(W / 2 + tw2 / 2, ty); ctx.lineTo(W / 2 + tw2 / 2 + 14, ty + 18); ctx.lineTo(W / 2 + tw2 / 2, ty + 36); ctx.lineTo(W / 2 - tw2 / 2, ty + 36); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = D.GOLD; ctx.lineWidth = 1.5; ctx.stroke();
      fit(ctx, bn.text, W / 2, ty + 25, tw2 - 30, 22, D.PARCH, 'center', true);
      ctx.restore();
    }

    // --- franja de información ---
    var info = '', sel = g.sel;
    if (g.mode === 'rally') info = 'Tocá dónde querés que formen los granaderos (dentro del alcance del cuartel).';
    else if (sel && sel.tower) info = sel.tower.title() + '  ·  ' + sel.tower.info();
    else if (g.armed) {
      var ad = TD.TOWERS[g.armed], am = TD.DMG[ad.base.type];
      info = ad.name + ': ' + ad.desc + '  |  ' + TD.DMG_NAMES[ad.base.type] + ' — ligera ×' + am.ligera + ' · media ×' + am.media + ' · pesada ×' + am.pesada + '  →  tocá un solar';
    }
    else if (sel && sel.slot) info = 'Elegí qué construir en este solar (botones de abajo o teclas 1 a 4).';
    else if (sel && sel.hero) info = g.hero.def.name + ' — nivel ' + g.hero.level + '. Tocá el mapa para moverlo. Habilidad [H]: ' + g.hero.def.ability.desc;
    else if (sel && sel.enemy) {
      var se = sel.enemy;
      info = se.def.name + ' — ' + se.def.trait + ' · armadura ' + se.def.armor + ' · vida ' + Math.max(0, Math.ceil(se.hp)) + '/' + se.maxHp + ' · velocidad ' + se.def.spd + ' · oro ' + se.def.gold;
    }
    else if (g.canCall()) info = 'Próxima oleada: ' + TD.waveSummary(lvl.waves[g.waveIdx]);
    else if (g.state === 'running') info = 'Última oleada en curso: ¡aguantá la línea!';
    if (info) {
      ctx.fillStyle = 'rgba(46,32,18,0.8)'; ctx.fillRect(0, BY - 28, W, 28);
      fit(ctx, info, 14, BY - 9, W - 28, 14, D.PARCH, 'left', false);
    }

    // --- barra inferior ---
    var gr = ctx.createLinearGradient(0, BY, 0, H);
    gr.addColorStop(0, '#4a3520'); gr.addColorStop(1, '#2e2012');
    ctx.fillStyle = gr; ctx.fillRect(0, BY, W, H - BY);
    ctx.fillStyle = D.GOLD; ctx.fillRect(0, BY, W, 2);
    UI.zone(0, BY - 28, W, H - BY + 28, null);

    // héroe
    var h = g.hero, hsel = sel && sel.hero;
    ctx.fillStyle = hsel ? '#b9d8f2' : D.PARCH2;
    ctx.beginPath(); ctx.arc(46, BY + 40, 32, 0, TAU); ctx.fill();
    ctx.strokeStyle = hsel ? '#2f6ea8' : D.GOLD; ctx.lineWidth = 3; ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.arc(46, BY + 40, 30, 0, TAU); ctx.clip();
    var ho = heroFig(h.key, t, h.key === 'guemes' ? 1.25 : 1.7);
    if (h.dead) ctx.globalAlpha = 0.35;
    D.unit(ctx, h.key === 'guemes' ? 42 : 46, BY + (h.key === 'guemes' ? 66 : 76), ho);
    ctx.restore();
    if (h.dead) {
      D.textO(ctx, h.reviveT > 0 ? String(Math.ceil(h.reviveT)) : 'oro', 46, BY + 48, 22, '#ffd76a');
    }
    UI.zone(12, BY + 6, 70, 68, function () {
      if (h.dead) return;
      g.sel = (g.sel && g.sel.hero) ? null : { hero: true };
      g.armed = null; g.mode = null;
      TD.Audio.play('click');
    });
    fit(ctx, h.def.name + ' · Nv ' + h.level, 88, BY + 20, 126, 14, D.PARCH, 'left', true);
    ctx.fillStyle = '#1e140a'; ctx.fillRect(88, BY + 26, 126, 7);
    ctx.fillStyle = D.CELESTE; ctx.fillRect(88, BY + 26, 126 * (h.dead ? 0 : Math.max(0, h.hp / h.maxHp)), 7);
    var xpA = h.level >= 6 ? 1 : (h.xp - (h.level > 1 ? TD.HERO_XP[h.level - 2] : 0)) / (TD.HERO_XP[h.level - 1] - (h.level > 1 ? TD.HERO_XP[h.level - 2] : 0));
    ctx.fillStyle = '#1e140a'; ctx.fillRect(88, BY + 35, 126, 4);
    ctx.fillStyle = D.GOLD; ctx.fillRect(88, BY + 35, 126 * TD.clamp(xpA, 0, 1), 4);
    var hReady = !h.dead && h.abCd <= 0;
    UI.button(ctx, 88, BY + 44, 126, 30, hReady ? h.def.ability.name + ' [H]' : (h.dead ? 'Caído' : Math.ceil(h.abCd) + ' s'), function () { h.useAbility(); }, { size: 12, disabled: !hReady, primary: hReady });
    if (!h.dead && h.abCd > 0) cooldownOverlay(ctx, 88, BY + 44, 126, 30, h.abCd / h.abilityCd());

    // zona de contexto
    var cx = 232, cy = BY + 8, ch = 64;
    if (sel && sel.tower) {
      var tw = sel.tower, x = cx;
      if (tw.level < 3) {
        if (tw.branch < 0) {
          upgradeButton(ctx, g, tw, 0, x, cy, 216, ch, 'Z'); x += 224;
          upgradeButton(ctx, g, tw, 1, x, cy, 216, ch, 'X'); x += 224;
        } else {
          upgradeButton(ctx, g, tw, tw.branch, x, cy, 300, ch, 'Z'); x += 308;
        }
      } else {
        var ready = tw.abilityReady();
        var hv = UI.hover(x, cy, 300, ch);
        D.button(ctx, x, cy, 300, ch, hv && ready, { disabled: !ready, primary: ready });
        fit(ctx, tw.def.ability.name + '  [Q]', x + 12, cy + 24, 276, 17, ready ? D.INK : '#6b5236', 'left', true);
        D.wrap(ctx, ready ? tw.def.ability.desc : (tw.disT > 0 ? 'Torre fuera de combate' : 'Lista en ' + Math.ceil(tw.abCd) + ' s'), x + 12, cy + 42, 280, 14, 12, D.INK2, 'left');
        if (!ready && tw.abCd > 0) cooldownOverlay(ctx, x, cy, 300, ch, tw.abCd / tw.def.ability.cd);
        UI.zone(x, cy, 300, ch, function () { tw.useAbility(); });
        x += 308;
      }
      if (tw.key === 'granaderos') {
        UI.button(ctx, x, cy, 108, ch, 'Reunión [R]', function () { g.mode = g.mode === 'rally' ? null : 'rally'; }, { size: 15, active: g.mode === 'rally' });
        x += 114;
      }
      UI.button(ctx, x, cy, 118, ch, 'Vender +' + tw.sellValue(), function () { g.sell(tw); }, { size: 15, danger: true });
      x += 124;
      UI.button(ctx, x, cy, 40, ch, '×', function () { g.sel = null; g.mode = null; }, { size: 20 });
    } else {
      TD.TOWER_KEYS.forEach(function (key, n) { towerButton(ctx, g, key, n, cx + n * 184, cy, 178, ch); });
    }

    // llamar oleada
    var wx = 980, ww = 292;
    if (g.canCall()) {
      var hovW = UI.hover(wx, cy, ww, ch);
      D.button(ctx, wx, cy, ww, ch, hovW, { primary: true });
      if (g.state === 'prep') {
        D.text(ctx, '¡Llamar oleada!', wx + ww / 2, cy + 28, 21, D.INK, 'center', true);
        D.text(ctx, 'Espacio · empieza el combate', wx + ww / 2, cy + 49, 13, D.INK, 'center');
      } else {
        D.text(ctx, 'Llamar oleada ' + (g.waveIdx + 1), wx + ww / 2, cy + 27, 19, D.INK, 'center', true);
        var eb = g.earlyBonus();
        D.text(ctx, 'llega en ' + Math.max(0, Math.ceil(g.nextTimer)) + ' s' + (eb > 0 ? ' · adelantar: +' + eb + ' de oro' : ''), wx + ww / 2, cy + 49, 13, D.INK, 'center');
      }
      UI.zone(wx, cy, ww, ch, function () { g.callWave(false); });
    } else {
      UI.button(ctx, wx, cy, ww, ch, 'Última oleada en curso', null, { disabled: true, size: 17 });
    }
  }

  /* ---------------- modales de batalla ---------------- */
  function drawBrief(ctx, g) {
    var lvl = g.lvl, w = 640, h = 420, x = W / 2 - w / 2, y = H / 2 - h / 2, yy;
    dim(ctx, 0.5);
    D.panel(ctx, x, y, w, h);
    D.text(ctx, TD.ACTS[lvl.act].name, W / 2, y + 40, 16, D.INK2, 'center', true);
    D.text(ctx, lvl.name, W / 2, y + 86, 40, D.INK, 'center', true);
    D.text(ctx, lvl.year + ' · ' + lvl.place, W / 2, y + 112, 17, D.INK2, 'center', false, true);
    ctx.strokeStyle = 'rgba(59,42,26,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 50, y + 130); ctx.lineTo(x + w - 50, y + 130); ctx.stroke();
    D.text(ctx, lvl.speaker + ':', x + 44, y + 162, 16, D.INK, 'left', true);
    yy = D.wrap(ctx, '—' + lvl.talk, x + 44, y + 186, w - 88, 23, 17, D.INK, 'left', false, true);
    yy += 12;
    D.text(ctx, 'Objetivos de estrellas', x + 44, yy, 16, D.INK, 'left', true);
    yy += 26;
    lvl.stars.forEach(function (o) {
      D.star(ctx, x + 54, yy - 5, 8, true);
      D.text(ctx, TD.objectiveText(o), x + 72, yy, 16, D.INK, 'left');
      yy += 25;
    });
    UI.button(ctx, x + 60, y + h - 70, 200, 46, 'Volver al mapa', function () { UI.go('map'); }, { size: 17 });
    UI.button(ctx, x + w - 320, y + h - 70, 260, 46, '¡A las armas!', function () { UI.modal = null; }, { primary: true, size: 22 });
  }

  function drawPause(ctx, g) {
    var w = 420, h = 372, x = W / 2 - w / 2, y = H / 2 - h / 2;
    dim(ctx, 0.55);
    D.panel(ctx, x, y, w, h);
    D.text(ctx, 'Pausa', W / 2, y + 62, 40, D.INK, 'center', true);
    UI.button(ctx, x + 60, y + 92, w - 120, 50, 'Continuar', UI.togglePause, { primary: true, size: 21 });
    UI.button(ctx, x + 60, y + 154, w - 120, 44, 'Reiniciar batalla', function () { UI.startLevel(g.idx); }, { size: 18 });
    UI.button(ctx, x + 60, y + 208, 142, 44, 'Sonido: ' + (TD.Audio.on ? 'sí' : 'no'), function () { TD.Audio.setOn(!TD.Audio.on); }, { size: 16 });
    UI.button(ctx, x + 218, y + 208, 142, 44, 'Música: ' + (TD.Audio.music ? 'sí' : 'no'), function () { TD.Audio.setMusic(!TD.Audio.music); }, { size: 16 });
    UI.button(ctx, x + 60, y + 262, w - 120, 44, 'Volver al mapa', function () { UI.go('map'); }, { size: 18 });
    D.text(ctx, 'P o Esc para volver al combate', W / 2, y + h - 26, 14, D.INK2, 'center', false, true);
  }

  function drawLevelUp(ctx, g) {
    var hr = g.hero, w = 800, h = 340, x = W / 2 - w / 2, y = H / 2 - h / 2;
    dim(ctx, 0.45);
    D.panel(ctx, x, y, w, h);
    D.text(ctx, '¡' + hr.def.name + ' sube al nivel ' + (hr.level - hr.pendingUps + 1) + '!', W / 2, y + 50, 30, D.INK, 'center', true);
    D.text(ctx, 'Elegí una mejora', W / 2, y + 78, 17, D.INK2, 'center', false, true);
    hr.def.tree.forEach(function (opt, n) {
      var bx = x + 34 + n * 248, by = y + 100, bw = 236, bh = 200, k;
      var maxed = hr.ranks[n] >= 3;
      var hov = !maxed && UI.hover(bx, by, bw, bh);
      D.button(ctx, bx, by, bw, bh, hov, { disabled: maxed, primary: hov });
      D.text(ctx, opt.name, bx + bw / 2, by + 44, 24, D.INK, 'center', true);
      D.wrap(ctx, opt.desc, bx + bw / 2, by + 84, bw - 36, 22, 16, D.INK, 'center');
      for (k = 0; k < 3; k++) D.star(ctx, bx + bw / 2 - 28 + k * 28, by + 158, 10, k < hr.ranks[n]);
      D.text(ctx, maxed ? 'Al máximo' : 'Rango ' + hr.ranks[n] + ' de 3', bx + bw / 2, by + 188, 13, D.INK2, 'center');
      UI.zone(bx, by, bw, bh, maxed ? null : function () {
        if (hr.choose(n)) { TD.Audio.play('upgrade'); if (hr.pendingUps <= 0) UI.modal = null; }
      });
    });
  }

  function drawEnd(ctx, g) {
    var res = g.result || { win: false, stars: 0, met: [] }, lvl = g.lvl, i;
    dim(ctx, 0.6);
    if (res.win) {
      var w = 620, h = 460, x = W / 2 - w / 2, y = H / 2 - h / 2;
      D.panel(ctx, x, y, w, h);
      D.text(ctx, '¡Victoria!', W / 2, y + 66, 46, D.INK, 'center', true);
      D.text(ctx, lvl.name + ' · ' + lvl.year, W / 2, y + 94, 17, D.INK2, 'center', false, true);
      for (i = 0; i < 3; i++) {
        var pop = TD.clamp((UI.modalT - 0.3 - i * 0.35) * 4, 0, 1);
        var sc = i < res.stars ? (pop < 1 ? 0.4 + pop * 0.9 : 1) : 1;
        D.star(ctx, W / 2 - 80 + i * 80, y + 150, 30 * sc, i < res.stars && pop > 0);
        if (i < res.stars && pop > 0 && UI.starSnd <= i) { UI.starSnd = i + 1; TD.Audio.play('star', i); }
      }
      lvl.stars.forEach(function (o, n) {
        var yy = y + 222 + n * 30, ok = res.met[n];
        D.star(ctx, x + 96, yy - 6, 9, ok);
        D.text(ctx, TD.objectiveText(o), x + 116, yy, 17, ok ? D.INK : '#8b7a5c', 'left', ok);
        D.text(ctx, ok ? 'cumplido' : 'pendiente', x + w - 80, yy, 14, ok ? D.GREEN : '#a0522d', 'right', true);
      });
      if (g.idx === TD.LEVELS.length - 1) {
        D.text(ctx, '¡Completaste la campaña! La barranca aguantó.', W / 2, y + 330, 18, '#2f5f8f', 'center', true);
      } else {
        D.text(ctx, 'Vidas: ' + g.lives + ' · Enemigos abatidos: ' + g.stats.kills, W / 2, y + 330, 15, D.INK2, 'center');
      }
      var bw = 170, bx = x + 32;
      UI.button(ctx, bx, y + h - 76, bw, 48, 'Mapa', function () { UI.mapSel = Math.min(TD.LEVELS.length - 1, g.idx + 1); UI.go('map'); }, { size: 18 });
      UI.button(ctx, bx + bw + 12, y + h - 76, bw, 48, 'Reintentar', function () { UI.startLevel(g.idx); }, { size: 18 });
      if (g.idx < TD.LEVELS.length - 1) {
        UI.button(ctx, bx + (bw + 12) * 2, y + h - 76, bw + 28, 48, 'Siguiente batalla', function () { UI.mapSel = g.idx + 1; UI.startLevel(g.idx + 1); }, { primary: true, size: 18 });
      } else {
        UI.button(ctx, bx + (bw + 12) * 2, y + h - 76, bw + 28, 48, 'Enciclopedia', function () { UI.encyTab = 0; UI.encySel = g.idx; UI.go('ency'); }, { primary: true, size: 18 });
      }
    } else {
      var w2 = 540, h2 = 310, x2 = W / 2 - w2 / 2, y2 = H / 2 - h2 / 2;
      D.panel(ctx, x2, y2, w2, h2);
      D.text(ctx, 'Derrota', W / 2, y2 + 70, 46, D.PUNZO, 'center', true);
      D.wrap(ctx, 'El enemigo rompió la línea en la oleada ' + g.waveIdx + ' de ' + lvl.waves.length + '. A reorganizarse: probá otra combinación de torres y mirá qué armadura traen.', W / 2, y2 + 112, w2 - 80, 23, 16, D.INK, 'center', false, true);
      UI.button(ctx, x2 + 50, y2 + h2 - 84, 200, 50, 'Mapa', function () { UI.go('map'); }, { size: 19 });
      UI.button(ctx, x2 + w2 - 270, y2 + h2 - 84, 220, 50, 'Reintentar', function () { UI.startLevel(g.idx); }, { primary: true, size: 21 });
    }
  }

  function drawGame(ctx) {
    var g = UI.game;
    if (!g) return;
    g.render(ctx);
    drawHUD(ctx, g);
    if (UI.tut && !UI.modal) drawTutorial(ctx, g);
    if (UI.modal === 'brief') drawBrief(ctx, g);
    else if (UI.modal === 'pause') drawPause(ctx, g);
    else if (UI.modal === 'levelup') drawLevelUp(ctx, g);
    else if (UI.modal === 'end') drawEnd(ctx, g);
  }

  /* ---------------- dibujo general ---------------- */
  UI.draw = function (ctx) {
    UI.zones.length = 0;
    switch (UI.screen) {
      case 'menu': drawMenu(ctx); break;
      case 'hero': drawHeroSelect(ctx); break;
      case 'map': drawMap(ctx); break;
      case 'ency': drawEncy(ctx); break;
      case 'game': drawGame(ctx); break;
    }
  };

  /* ---------------- entrada ---------------- */
  UI.move = function (x, y) { UI.mx = x; UI.my = y; };

  UI.click = function (x, y) {
    var i, z;
    UI.mx = x; UI.my = y;
    TD.Audio.init();
    for (i = UI.zones.length - 1; i >= 0; i--) {
      z = UI.zones[i];
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
        if (z.cb) {
          if (UI.screen !== 'game') TD.Audio.play('click');
          z.cb();
        }
        return;
      }
    }
    if (UI.screen === 'game' && UI.game && !UI.modal) UI.game.click(x, y);
  };

  UI.key = function (key) {
    var g = UI.game, k = key.length === 1 ? key.toLowerCase() : key;
    TD.Audio.init();
    if (UI.screen !== 'game' || !g) {
      if (k === 'Escape') {
        if (UI.screen === 'hero') UI.go(UI.heroBack);
        else if (UI.screen === 'map') UI.go('menu');
        else if (UI.screen === 'ency') UI.go(TD.Save.data.hero ? 'map' : 'menu');
      } else if ((k === 'Enter' || k === ' ') && UI.screen === 'map' && UI.mapSel < TD.Save.data.unlocked) {
        UI.startLevel(UI.mapSel);
      }
      return;
    }
    if (UI.modal === 'brief') { if (k === 'Enter' || k === ' ') UI.modal = null; return; }
    if (UI.modal === 'levelup') {
      if (k === '1' || k === '2' || k === '3') { if (g.hero.choose(+k - 1) && g.hero.pendingUps <= 0) UI.modal = null; }
      return;
    }
    if (UI.modal === 'end') return;
    if (k === 'p' || k === 'Escape') { UI.togglePause(); return; }
    if (UI.modal) return;
    var tw = g.sel && g.sel.tower;
    switch (k) {
      case '1': case '2': case '3': case '4': UI.pickTower(TD.TOWER_KEYS[+k - 1]); break;
      case ' ': g.callWave(false); break;
      case 'f': g.speed = g.speed === 1 ? 2 : 1; break;
      case 'h': g.hero.useAbility(); break;
      case 'q': if (tw) tw.useAbility(); break;
      case 'z': if (tw && tw.level < 3) tw.upgrade(tw.branch >= 0 ? tw.branch : 0); break;
      case 'x': if (tw && tw.level < 3 && tw.branch < 0) tw.upgrade(1); break;
      case 'r': if (tw && tw.key === 'granaderos') g.mode = g.mode === 'rally' ? null : 'rally'; break;
      default: break;
    }
  };

  UI.init = function () {
    TD.Save.load();
    TD.Audio.sync();
    UI.mapSel = Math.min(TD.LEVELS.length - 1, Math.max(0, TD.Save.data.unlocked - 1));
  };
})();
