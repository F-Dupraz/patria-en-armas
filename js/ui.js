/* ============================================================
 * ui.js — pantallas y HUD, todo dibujado en el canvas:
 * menú, selección de héroe, mapa de campaña, enciclopedia, condecoraciones,
 * HUD de batalla, pausa, victoria, derrota y tutorial.
 * Interfaz en modo inmediato: cada cuadro se dibujan los botones
 * y se registran sus zonas de clic.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD, D = TD.Draw;
  var TAU = Math.PI * 2;
  // W y H son el tamaño de la vista: 1280x720 en PC y tablet; en celular (modo compacto, C)
  // 480 de alto y un ancho variable. Se actualizan en cada cuadro (ver syncView).
  var V = TD.View, W = TD.W, H = TD.H, C = false;
  function syncView() { W = V.w; H = V.h; C = V.compact; }

  var UI = {
    screen: 'menu', t: 0, zones: [], mx: -999, my: -999,
    game: null, modal: null, modalT: 0, starSnd: 0, settings: false, drag: null,
    mapSel: 0, encyTab: 0, encySel: 0, confirmReset: 0,
    tut: null, heroBack: 'menu',
    logTab: 0, logBack: 'menu', logNew: {},
    heroSel: -1, logPage: 0, iosHelp: false,     // solo para el diseño compacto / instalación
    buildOpen: false, infoKey: '', infoT: 0
  };
  TD.UI = UI;

  /* ---------------- sistema de botones ---------------- */
  // Transformación en curso (escala + desplazamiento): permite dibujar un bloque achicado
  // o el mundo dentro de un recuadro, con sus botones y zonas de clic en el lugar correcto.
  var TF = { s: 1, x: 0, y: 0 };
  function push(ctx, s, x, y) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); TF.s = s; TF.x = x; TF.y = y; }
  function pop(ctx) { ctx.restore(); TF.s = 1; TF.x = 0; TF.y = 0; }

  UI.zone = function (x, y, w, h, cb) {
    UI.zones.push({ x: x * TF.s + TF.x, y: y * TF.s + TF.y, w: w * TF.s, h: h * TF.s, cb: cb || null });
  };

  UI.hover = function (x, y, w, h) {
    var mx = (UI.mx - TF.x) / TF.s, my = (UI.my - TF.y) / TF.s;
    return mx >= x && mx <= x + w && my >= y && my <= y + h;
  };

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

  // Cuántos renglones ocupa s con la fuente ya puesta
  function countLines(ctx, s, maxW) {
    var words = String(s).split(' '), line = '', n = 0, i, test;
    for (i = 0; i < words.length; i++) {
      test = line ? line + ' ' + words[i] : words[i];
      if (line && ctx.measureText(test).width > maxW) { n++; line = words[i]; } else line = test;
    }
    return n + (line ? 1 : 0);
  }

  // Texto con saltos de línea que se achica hasta entrar en maxLines renglones
  function wrapMax(ctx, s, x, y, maxW, lh, size, color, maxLines, align, bold, italic) {
    var k = 1;
    D.font(ctx, size, bold, italic);
    while (size * k > 9.5 && countLines(ctx, s, maxW) > maxLines) { k -= 0.04; D.font(ctx, size * k, bold, italic); }
    return D.wrap(ctx, s, x, y, maxW, lh * k, size * k, color, align, bold, italic);
  }

  function dim(ctx, a) {
    ctx.fillStyle = 'rgba(30,20,10,' + (a == null ? 0.55 : a) + ')';
    ctx.fillRect(0, 0, W, H);
    UI.zones.length = 0;
    UI.zone(0, 0, W, H, null);       // el modal bloquea los clics de abajo
  }

  function heroKey() { return TD.Save.data.hero || 'sanmartin'; }

  /* ---------------- navegación ---------------- */
  // Todo cambio de pantalla pasa por un fundido breve
  UI.go = function (screen) {
    TD.Juice.transition(function () { goNow(screen); });
  };
  function goNow(screen) {
    TD.Logros.flush();                 // contadores de la batalla que se deja
    UI.screen = screen; UI.modal = null; UI.confirmReset = 0; UI.settings = false;
    UI.iosHelp = false; UI.heroSel = -1; UI.logPage = 0; UI.buildOpen = false;
    if (screen !== 'game') UI.game = null;
  }

  // Libro de condecoraciones: se abre en el metal que tenga medallas recién ganadas
  UI.openLogros = function (from) {
    UI.logBack = from;
    TD.Juice.transition(function () {
      var L = TD.Logros, n;
      for (n = 2; n >= 0; n--) if (L.count(n).fresh) UI.logTab = n;
      UI.logNew = L.markSeen();
      goNow('logros');
    });
  };

  UI.startLevel = function (idx) {
    TD.Juice.transition(function () { startNow(idx); });
  };
  function startNow(idx) {
    TD.Logros.flush();
    UI.game = new TD.Game(idx, heroKey());
    UI.screen = 'game'; UI.buildOpen = false; UI.infoKey = '';
    UI.modal = 'brief'; UI.modalT = 0;
    UI.tut = (TD.LEVELS[idx].tutorial && !TD.Save.data.tutorialDone) ? { step: 0, t: 0 } : null;
  }

  // Cambia la dificultad (también en plena batalla: rige desde ese mismo instante)
  UI.setDiff = function (key) {
    var g = UI.game;
    if (!TD.DIFFS[key] || TD.diffKey() === key) return;
    TD.Save.data.diff = key; TD.Save.save();
    if (UI.screen === 'game' && g) {
      if (g.state !== 'won' && g.state !== 'lost') g.setDiff(key);
      TD.Audio.play('click');
    }
  };

  // Botón con el emblema de la dificultad actual: abre los ajustes
  function diffChip(ctx, x, y, w, h, label, size) {
    var key = TD.diffKey(), hov = UI.hover(x, y, w, h);
    D.button(ctx, x, y, w, h, hov);
    D.diffIcon(ctx, key, x + h / 2 + 2, y + h / 2, (h - 8) / 54, false, hov ? Math.sin(UI.t * 9) * 0.12 : 0);
    fit(ctx, label + TD.DIFFS[key].name, x + h + 6, y + h / 2 + size * 0.34, w - h - 14, size, D.INK, 'left', true);
    UI.zone(x, y, w, h, function () { UI.settings = true; if (UI.screen === 'game') TD.Audio.play('click'); });
  }

  /* ---------------- el mundo dentro de la vista ---------------- */
  // Diseño compacto de batalla: el mapa ocupa toda la pantalla debajo de la barra superior (CT).
  // Lo demás flota encima y solo cuando hace falta: el héroe abajo a la izquierda, el botón
  // «Construir» abajo a la derecha y una bandeja (CSH de alto) con las torres o las mejoras,
  // que se abre al tocar un solar, una torre o ese botón. El mundo de 1280x720 se achica lo
  // justo para que entre lo mismo que dejan ver las barras del diseño clásico.
  var CT = 46, CSH = 100;
  var WT = { f: 1, ox: 0, oy: 0, ax: 0, ay: 0, aw: TD.W, ah: TD.H };
  function worldLayout() {
    if (!C) { WT.f = 1; WT.ox = 0; WT.oy = 0; WT.ax = 0; WT.ay = 0; WT.aw = W; WT.ah = H; return WT; }
    var vis = TD.BAR_Y - 28 - TD.TOP_H;                 // alto del mundo que queda a la vista en el diseño clásico
    var ah = H - CT, f = Math.min(W / TD.W, ah / vis);
    WT.f = f; WT.ay = CT; WT.ah = ah;
    WT.ox = (W - TD.W * f) / 2;
    WT.oy = CT + (ah - vis * f) / 2 - TD.TOP_H * f;
    // en pantallas muy apaisadas sobran franjas a los costados: el mundo se recorta a su ancho
    WT.ax = Math.max(0, WT.ox); WT.aw = Math.min(W, TD.W * f);
    return WT;
  }

  /* ---------------- bandeja de construcción (solo diseño compacto) ---------------- */
  // Está abierta si hay un solar o una torre elegidos, una torre «armada» o se tocó «Construir».
  function sheetKind(g) {
    if (!g || g.state === 'won' || g.state === 'lost') return null;
    if (g.sel && g.sel.tower) return 'tower';
    if ((g.sel && g.sel.slot) || g.armed || UI.buildOpen) return 'build';
    return null;
  }

  // La bandeja va abajo, salvo que tape justo lo que se eligió: entonces sube bajo la barra.
  function sheetTop(g, wt) {
    var s = g.sel && (g.sel.tower || g.sel.slot);
    return !!s && wt.oy + s.y * wt.f + 22 > H - CSH - 8;
  }

  UI.closeSheet = function () {
    var g = UI.game;
    UI.buildOpen = false;
    if (g) { g.armed = null; g.mode = null; if (g.sel && (g.sel.tower || g.sel.slot)) g.sel = null; }
  };

  UI.togglePause = function () {
    var g = UI.game;
    if (!g || g.state === 'won' || g.state === 'lost') return;
    if (UI.modal === 'pause') { UI.modal = null; g.paused = false; TD.Audio.play('resume'); }
    else if (!UI.modal) { UI.modal = 'pause'; UI.modalT = 0; g.paused = true; TD.Audio.play('pause'); }
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
    syncView();
    TD.Juice.updateFade(dt);
    TD.Logros.update(dt);
    if (UI.confirmReset > 0) UI.confirmReset -= dt;
    var g = UI.game;
    updateMusic(g);
    if (UI.screen !== 'game' || !g) return;
    var wt = worldLayout();
    UI.infoT += dt;
    if (g.sel && !g.sel.slot) UI.buildOpen = false;
    g.mx = (UI.mx - wt.ox) / wt.f; g.my = (UI.my - wt.oy) / wt.f;
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

  // Mismo recorrido para pantalla táctil chica: sin teclas y con la bandeja de torres
  var TUT_C = [
    'Tocá un solar vacío (los círculos de piedra con banderín) para elegir dónde construir.',
    'Ahora elegí una torre en la bandeja que se abrió. Los Tiradores son un buen comienzo.',
    'Si te alcanza el oro, construí otra defensa. Después tocá «Llamar oleada», arriba, para empezar.',
    'Cada enemigo abatido da oro. Tocá una torre para mejorarla: cada una tiene dos ramas distintas.',
    'Podés adelantar la próxima oleada para ganar oro extra. Tocá a tu héroe y después el mapa para moverlo.'
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

  // Recuadro dorado que late alrededor de un botón (tutorial en diseño compacto)
  function pulseRect(ctx, r) {
    if (!r) return;
    var k = 3 + (Math.sin(UI.t * 6) + 1) * 2.5;
    ctx.strokeStyle = D.GOLD; ctx.lineWidth = 4;
    D.rr(ctx, r.x - k, r.y - k, r.w + k * 2, r.h + k * 2, 8 + k); ctx.stroke();
  }

  function drawTutorial(ctx, g) {
    var tu = UI.tut, x = 300, y = 54, w = 680, h = 62, wt = WT;
    if (C) {
      // arriba, bajo la barra; si la bandeja subió, abajo entre el héroe y «Construir»
      var x0 = CHERO.x + CHERO.w + 8, x1 = W - CBLD - 16;
      w = Math.min(640, x1 - x0); x = (W - w) / 2; y = CT + 6;
      if (sheetKind(g) && sheetTop(g, wt)) { x = (x0 + x1 - w) / 2; y = H - h - 8; }
    }
    D.panel(ctx, x, y, w, h, 0.96);
    D.text(ctx, 'Instrucción ' + (tu.step + 1) + ' de ' + TUT.length, x + 16, y + 20, 12, D.INK2, 'left', true);
    wrapMax(ctx, (C ? TUT_C : TUT)[tu.step], x + 16, y + 38, w - (C ? 76 : 70), 17, 14, D.INK, 2);
    if (C) UI.button(ctx, x + w - 52, y + 8, 44, 40, '×', endTutorial, { size: 22 });
    else UI.button(ctx, x + w - 44, y + 8, 34, 26, '×', endTutorial, { size: 18 });
    // las flechas del mapa se ubican pasando por la transformación del mundo
    if (tu.step === 0 && g.slots.length) arrow(ctx, wt.ox + g.slots[0].x * wt.f, wt.oy + (g.slots[0].y - 30) * wt.f);
    else if (tu.step === 1) { if (C) pulseRect(ctx, CR.pick || CR.build); else arrow(ctx, 232 + 2 * 184 + 89, TD.BAR_Y); }
    else if (tu.step === 2) { if (C) pulseRect(ctx, CR.wave); else arrow(ctx, 1126, TD.BAR_Y); }
    else if (tu.step === 3 && g.towers.length) arrow(ctx, wt.ox + g.towers[0].x * wt.f, wt.oy + (g.towers[0].y - 96) * wt.f);
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

    var bx = W / 2 - 150, by = 342, lc = TD.Logros.total();
    UI.button(ctx, bx, by, 300, 50, 'Jugar', function () {
      if (TD.Save.data.hero) UI.go('map'); else { UI.heroBack = 'menu'; UI.go('hero'); }
    }, { primary: true, size: 24 });
    UI.button(ctx, bx, by + 58, 300, 40, 'Enciclopedia', function () { UI.go('ency'); }, { size: 19 });
    UI.button(ctx, bx, by + 106, 300, 40, '', function () { UI.openLogros('menu'); });
    TD.Logros.medal(ctx, bx + 62, by + 132, 0.36, 2, 'granada', true);
    D.text(ctx, 'Condecoraciones', bx + 162, by + 132, 19, D.INK, 'center', true);
    if (lc.fresh) badge(ctx, bx + 296, by + 110, lc.fresh);
    if (TD.PWA.canInstall()) {
      UI.button(ctx, bx, by + 154, 146, 40, 'Ajustes', function () { UI.settings = true; }, { size: 19 });
      UI.button(ctx, bx + 154, by + 154, 146, 40, 'Instalar', TD.PWA.install, { size: 19, primary: true });
    } else {
      UI.button(ctx, bx, by + 154, 300, 40, 'Ajustes', function () { UI.settings = true; }, { size: 19 });
    }
    UI.button(ctx, bx, by + 202, 300, 32, UI.confirmReset > 0 ? '¿Seguro? Tocá de nuevo para borrar' : 'Borrar progreso', function () {
      if (UI.confirmReset > 0) { TD.Save.reset(); TD.Audio.sync(); TD.Logros.init(); UI.confirmReset = 0; }
      else UI.confirmReset = 4;
    }, { size: 14, danger: UI.confirmReset > 0 });

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
    TD.Logros.medal(ctx, 62, 71, 0.44, 2, 'granada', true);
    D.text(ctx, lc.got + ' / ' + lc.total, 80, 69, 19, D.INK, 'left', true);
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
    D.text(ctx, 'Esta selección de héroes no representa la realidad: es solamente para fines del juego.', W / 2, 100, 14, '#8a5a55', 'center', false, true);
    TD.HERO_KEYS.forEach(function (key, n) {
      var def = TD.HEROES[key], x = 60 + n * 395, y = 118, w = 370, h = 560;
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

  // Ruta y nodos de la campaña (half: mitad del lado de la zona de toque)
  function drawMapNodes(ctx, half) {
    var i, S = TD.Save.data, t = UI.t;
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
      UI.zone(x - half, y - half, half * 2, half * 2 + 6, function () { UI.mapSel = n; TD.Audio.play('click'); });
    });
  }

  function drawMap(ctx) {
    var i, S = TD.Save.data, t = UI.t;
    D.parchment(ctx);
    D.text(ctx, 'Campaña', 640, 66, 34, D.INK, 'center', true);
    UI.button(ctx, 40, 34, 110, 38, '← Menú', function () { UI.go('menu'); }, { size: 16 });
    UI.button(ctx, 160, 34, 230, 38, 'Héroe: ' + TD.HEROES[heroKey()].name, function () { UI.heroBack = 'map'; UI.go('hero'); }, { size: 16 });
    UI.button(ctx, 400, 34, 150, 38, 'Enciclopedia', function () { UI.go('ency'); }, { size: 16 });
    diffChip(ctx, 724, 34, 208, 38, 'Dificultad: ', 16);
    var lc = TD.Logros.total();
    UI.button(ctx, 940, 34, 104, 38, '', function () { UI.openLogros('map'); });
    TD.Logros.medal(ctx, 960, 59, 0.36, 2, 'granada', true);
    D.text(ctx, lc.got + ' / ' + lc.total, 978, 59, 16, D.INK, 'left', true);
    if (lc.fresh) badge(ctx, 1040, 38, lc.fresh);
    UI.button(ctx, 1052, 34, 94, 38, 'Ajustes', function () { UI.settings = true; }, { size: 16 });
    D.star(ctx, 1166, 54, 13, true);
    D.text(ctx, TD.Save.totalStars() + ' / ' + (TD.LEVELS.length * 3), 1184, 61, 20, D.INK, 'left', true);

    drawMapArt(ctx);

    drawMapNodes(ctx, 22);

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
    var md = TD.Save.medal(UI.mapSel);
    if (md >= 0) {
      D.diffIcon(ctx, TD.DIFF_KEYS[md], px + 40, yy + 24, 0.4);
      var sdN = S.starsD[String(UI.mapSel)] ? TD.Save.starsAt(UI.mapSel, md) : -1;      // -1: victoria anterior al registro por dificultad
      D.text(ctx, 'Mejor victoria: en ' + TD.DIFFS[TD.DIFF_KEYS[md]].name.toLowerCase() +
        (sdN >= 0 ? ', con ' + sdN + (sdN === 1 ? ' estrella' : ' estrellas') : ''), px + 58, yy + 29, 14, D.INK2, 'left');
    }
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
    UI.button(ctx, 1060, 34, 180, 38, 'Guía de combate', function () { UI.encyTab = 1; }, { size: 16, active: UI.encyTab !== 0 });

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
      ENC_LIST.forEach(function (id, n) {
        encyEnemy(ctx, id, 640 + (n % 2) * 300, 150 + ((n / 2) | 0) * 72, 220);
      });
      D.text(ctx, 'Jefes: uno por batalla, con tres fases (al 66 % y al 33 % de vida).', 930, 672, 13, D.INK2, 'center', false, true);
    }
  }

  /* ================================================================
   *                        CONDECORACIONES
   * ================================================================ */
  // Globito rojo con la cantidad de medallas sin mirar
  function badge(ctx, x, y, n) {
    ctx.fillStyle = D.PUNZO; ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill();
    ctx.strokeStyle = D.BLANCO; ctx.lineWidth = 2; ctx.stroke();
    D.text(ctx, String(n), x, y + 4.5, 12, '#ffffff', 'center', true);
  }

  function logroCard(ctx, a, x, y, w, h) {
    var L = TD.Logros, T = L.TIERS[a.tier], on = L.has(a.id), p = L.progress(a);
    var s = TD.clamp(h / 86, 0.98, 1.3), x0 = x + 28 + 50 * s, tw = w - (x0 - x) - 14, ty = y + h / 2 - 21, sy = ty + 54, g;
    D.rr(ctx, x, y, w, h, 8);
    if (on) {
      g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#fbf1cf'); g.addColorStop(1, '#ecd9a4');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = T.lo; ctx.lineWidth = 2; ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(107,82,54,0.10)'; ctx.fill();
      ctx.strokeStyle = 'rgba(107,82,54,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    L.medal(ctx, x + 14 + 25 * s, y + h / 2 + 13 * s, s, a.tier, a.icon, on);
    fit(ctx, a.name, x0, ty, tw, 17, on ? D.INK : '#5d4a32', 'left', true);
    D.wrap(ctx, a.desc, x0, ty + 18, tw, 15, 12.5, D.INK2, 'left');
    if (on) {
      D.star(ctx, x0 + 6, sy - 4, 6, true);
      D.text(ctx, 'Obtenida', x0 + 17, sy, 12.5, D.GREEN, 'left', true);
      if (UI.logNew[a.id]) D.text(ctx, '¡Nueva!', x0 + tw, sy, 12.5, D.PUNZO, 'right', true);
    } else if (p) {
      var bw = tw - 88;
      ctx.fillStyle = 'rgba(59,42,26,0.22)'; D.rr(ctx, x0, sy - 8, bw, 7, 3.5); ctx.fill();
      if (p[0] > 0) { ctx.fillStyle = T.mid; D.rr(ctx, x0, sy - 8, Math.max(7, bw * p[0] / p[1]), 7, 3.5); ctx.fill(); }
      ctx.strokeStyle = 'rgba(59,42,26,0.6)'; ctx.lineWidth = 1; D.rr(ctx, x0, sy - 8, bw, 7, 3.5); ctx.stroke();
      D.text(ctx, L.fmt(p[0]) + ' / ' + L.fmt(p[1]), x0 + tw, sy, 12.5, D.INK2, 'right', true);
    } else {
      D.text(ctx, 'Pendiente', x0, sy, 12.5, '#8b7a5c', 'left', false, true);
    }
  }

  function drawLogros(ctx) {
    var L = TD.Logros, tab = UI.logTab, T = L.TIERS[tab], all = L.total(), n, items = [];
    D.parchment(ctx);
    UI.button(ctx, 40, 34, 120, 38, '← Volver', function () { UI.go(UI.logBack); }, { size: 16 });
    D.text(ctx, 'Condecoraciones', 180, 66, 34, D.INK, 'left', true);
    // una pestaña por metal: bronce (fáciles), plata (normales) y oro (difíciles)
    L.TIERS.forEach(function (tr, k) {
      var c = L.count(k), x = 632 + k * 206;
      UI.button(ctx, x, 34, 196, 38, '', function () { UI.logTab = k; }, { active: tab === k });
      L.medal(ctx, x + 22, 59, 0.36, k, 'granada', true);
      fit(ctx, tr.name + ' · ' + c.got + ' / ' + c.total, x + 42, 59, 146, 17, D.INK, 'left', true);
      if (c.fresh) badge(ctx, x + 192, 38, c.fresh);
    });

    D.panel(ctx, 40, 92, 1200, 598);
    D.text(ctx, 'Medallas ' + T.of + ': las ' + T.kind, 60, 120, 16, D.INK, 'left', true);
    D.text(ctx, 'Foja de servicios: ' + all.got + ' de ' + all.total + ' condecoraciones', 1220, 120, 14, D.INK2, 'right', false, true);
    for (n = 0; n < L.list.length; n++) if (L.list[n].tier === tab) items.push(L.list[n]);
    var rows = Math.ceil(items.length / 3), gap = 8, y0 = 132, ch = Math.min(124, (546 - (rows - 1) * gap) / rows), cw = 382;
    items.forEach(function (a, i) {
      logroCard(ctx, a, 56 + (i % 3) * (cw + 11), y0 + ((i / 3) | 0) * (ch + gap), cw, ch);
    });
  }

  // Aviso de medalla ganada: en batalla entra por la derecha, bajo la barra; en los menús baja desde arriba
  function drawToast(ctx) {
    var L = TD.Logros, c = L.cur;
    if (!c) return;
    var a = c.a, T = L.TIERS[a.tier], w = 356, h = 76, inGame = UI.screen === 'game';
    var q = Math.min(1, c.t / 0.3), e = 1 - (1 - q) * (1 - q) * (1 - q);
    var x = inGame ? W - w - 12 + (1 - e) * (w + 24) : W / 2 - w / 2;
    var y = inGame ? (UI.tut ? 124 : 52) : 24 - (1 - e) * (h + 34);
    var clip = false;
    if (inGame && C) {
      if (UI.modal === 'end' && UI.game && UI.game.state === 'won') {
        // sobre el panel de victoria: en el hueco entre los objetivos y los botones
        x = W / 2 - w / 2; y = H / 2 + 66 + (1 - e) * 16;
      } else if (UI.modal || UI.settings) {
        x = W / 2 - w / 2; y = 4 - (1 - e) * (h + 14);
      } else {
        // entra por la derecha, justo debajo de la barra superior
        var tg = UI.game, up = !!tg && !!sheetKind(tg) && sheetTop(tg, WT);      // la bandeja está arriba
        x = W - w - 10 + (1 - e) * (w + 20); y = CT + (up ? CSH + 8 : (UI.tut ? 76 : 8));
        clip = true;
        ctx.save(); ctx.beginPath(); ctx.rect(0, CT, W, H - CT); ctx.clip();
      }
    }
    ctx.save();
    ctx.globalAlpha = TD.clamp((L.TOAST - c.t) / 0.4, 0, 1);
    ctx.fillStyle = 'rgba(30,20,10,0.35)'; D.rr(ctx, x + 3, y + 4, w, h, 10); ctx.fill();
    ctx.fillStyle = 'rgba(46,32,18,0.96)'; D.rr(ctx, x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = T.mid; ctx.lineWidth = 2.2; ctx.stroke();
    L.medal(ctx, x + 38, y + h / 2 + 11, 0.9 + 0.12 * Math.sin(Math.min(1, c.t / 0.45) * Math.PI), a.tier, a.icon, true);
    D.text(ctx, 'CONDECORACIÓN ' + T.of.toUpperCase(), x + 76, y + 24, 12, T.mid, 'left', true);
    fit(ctx, a.name, x + 76, y + 46, w - 90, 20, D.PARCH, 'left', true);
    fit(ctx, a.desc, x + 76, y + 63, w - 90, 12.5, 'rgba(234,217,173,0.8)', 'left', false, true);
    ctx.restore();
    if (clip) ctx.restore();
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
      if (!tw.upgrade(b)) { g.addText(tw.x, tw.y - 80, 'Te falta oro', '#ffb0a0', 14); g.goldDeny = 0.4; }
    });
  }

  function cooldownOverlay(ctx, x, y, w, h, frac) {
    if (frac <= 0) return;
    ctx.fillStyle = 'rgba(30,20,10,0.5)';
    D.rr(ctx, x, y, w * Math.min(1, frac), h, 8); ctx.fill();
  }

  /* ---------------- piezas del HUD que comparten los dos diseños ---------------- */
  // Marcadores de entrada: muestran por dónde viene la oleada y sirven para llamarla.
  // mk agranda el dibujo y half es la mitad del lado de la zona de toque (en px del mundo);
  // dodge (opcional) corre el marcador para que no quede tapado por la interfaz.
  function entryMarkers(ctx, g, mk, half, dodge) {
    var i, t = UI.t, next = g.lvl.waves[g.waveIdx], used = {};
    for (i = 0; i < next.groups.length; i++) used[next.groups[i].path] = true;
    g.entries.forEach(function (en) {
      if (!used[en.pi]) return;
      var r = (17 + Math.sin(t * 5) * 2) * mk, m = mk > 1 ? 28 * mk : 0;      // agrandado, no se sale del mundo
      var ex = m ? TD.clamp(en.x, m, TD.W - m) : en.x, ey = dodge ? dodge(en.x, en.y, r + 5 * mk) : en.y;
      ctx.fillStyle = 'rgba(179,20,42,0.92)'; ctx.strokeStyle = D.BLANCO; ctx.lineWidth = 2.5 * mk;
      ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ctx.fill(); ctx.stroke();
      D.towerIcon(ctx, 'granaderos', ex, ey, 0.9 * mk);
      if (g.state === 'running' && g.nextTimer > 0) {
        ctx.strokeStyle = D.GOLD; ctx.lineWidth = 4 * mk;
        ctx.beginPath(); ctx.arc(ex, ey, r + 5 * mk, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, g.nextTimer / 30)); ctx.stroke();
      }
      UI.zone(ex - half, ey - half, half * 2, half * 2, function () { g.callWave(false); });
    });
  }

  // Vidas, oro y oleada: el extremo izquierdo de la barra superior
  function topStatus(ctx, g) {
    var flash = g.lifeFlash > 0 ? 1 + g.lifeFlash : 1;
    D.heart(ctx, 28, 22, 10 * flash);
    D.text(ctx, String(g.lives), 46, 29, 22, g.lives <= 5 ? '#ff9a8a' : D.PARCH, 'left', true);
    var gp = g.goldPulse > 0 ? g.goldPulse / 0.22 : 0;
    var gdx = g.goldDeny > 0 ? Math.sin(g.goldDeny * 60) * g.goldDeny * 10 : 0;
    D.coin(ctx, 112 + gdx, 22, 11 * (1 + gp * 0.25));
    ctx.save();
    ctx.translate(130 + gdx, 29); ctx.scale(1 + gp * 0.12, 1 + gp * 0.12);
    D.text(ctx, String(Math.floor(g.gold)), 0, 0, 22, g.goldDeny > 0 ? '#ff9a8a' : '#ffd76a', 'left', true);
    ctx.restore();
    if (g.goldPlusT > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, g.goldPlusT / 0.3);
      D.font(ctx, 22, true);
      var gw = ctx.measureText(String(Math.floor(g.gold))).width;
      D.text(ctx, '+' + g.goldPlus, 136 + gw, 27 - (0.9 - g.goldPlusT) * 6, 14, '#ffe9a8', 'left', true);
      ctx.restore();
    }
    D.text(ctx, 'Oleada ' + g.waveIdx + ' / ' + g.lvl.waves.length, 230, 29, 19, D.PARCH, 'left', true);
  }

  function bossBar(ctx, g, cx, by, bw) {
    var b = g.boss, bx = cx - bw / 2;
    ctx.fillStyle = 'rgba(46,32,18,0.88)'; D.rr(ctx, bx, by, bw, 34, 8); ctx.fill();
    ctx.strokeStyle = D.GOLD; ctx.lineWidth = 1.5; ctx.stroke();
    fit(ctx, b.def.name + ' — fase ' + b.phase + ' de 3', cx, by + 15, bw - 20, 13, D.PARCH, 'center', true);
    ctx.fillStyle = '#3a1410'; ctx.fillRect(bx + 14, by + 20, bw - 28, 8);
    ctx.fillStyle = b.phase === 3 ? '#ff5a3a' : (b.phase === 2 ? '#e0762f' : D.SCARLET);
    ctx.fillRect(bx + 14, by + 20, (bw - 28) * Math.max(0, b.hp / b.maxHp), 8);
    ctx.fillStyle = D.PARCH;
    ctx.fillRect(bx + 14 + (bw - 28) * 0.66 - 1, by + 18, 2, 12);
    ctx.fillRect(bx + 14 + (bw - 28) * 0.33 - 1, by + 18, 2, 12);
  }

  function drawBanner(ctx, g, cx, ty, maxW, size) {
    var bn = g.banner, a = Math.min(1, bn.t * 5, (bn.dur - bn.t) * 3);
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    D.font(ctx, size, true);
    var tw2 = Math.min(maxW, ctx.measureText(bn.text).width + 70);
    ty -= (1 - Math.min(1, bn.t * 5)) * 10;          // baja deslizándose
    ctx.fillStyle = 'rgba(46,32,18,0.85)';
    ctx.beginPath(); ctx.moveTo(cx - tw2 / 2 - 14, ty + 18); ctx.lineTo(cx - tw2 / 2, ty); ctx.lineTo(cx + tw2 / 2, ty); ctx.lineTo(cx + tw2 / 2 + 14, ty + 18); ctx.lineTo(cx + tw2 / 2, ty + 36); ctx.lineTo(cx - tw2 / 2, ty + 36); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = D.GOLD; ctx.lineWidth = 1.5; ctx.stroke();
    fit(ctx, bn.text, cx, ty + 25, tw2 - 30, size, D.PARCH, 'center', true);
    ctx.restore();
  }

  // Renglón de ayuda según lo que esté seleccionado (en compacto, sin atajos de teclado)
  function infoText(g) {
    var sel = g.sel, lvl = g.lvl;
    if (g.mode === 'rally') return 'Tocá dónde querés que formen los granaderos (dentro del alcance del cuartel).';
    if (sel && sel.tower) return sel.tower.title() + '  ·  ' + sel.tower.info();
    if (g.armed) {
      var ad = TD.TOWERS[g.armed], am = TD.DMG[ad.base.type];
      return ad.name + ': ' + ad.desc + '  |  ' + TD.DMG_NAMES[ad.base.type] + ' — ligera ×' + am.ligera + ' · media ×' + am.media + ' · pesada ×' + am.pesada + '  →  tocá un solar';
    }
    if (sel && sel.slot) return C ? 'Elegí qué construir en este solar.' : 'Elegí qué construir en este solar (botones de abajo o teclas 1 a 4).';
    if (sel && sel.hero) return g.hero.def.name + ' — nivel ' + g.hero.level + '. Tocá el mapa para moverlo. Habilidad' + (C ? '' : ' [H]') + ': ' + g.hero.def.ability.desc;
    if (sel && sel.enemy) {
      var se = sel.enemy;
      return se.def.name + ' — ' + se.def.trait + ' · armadura ' + se.def.armor + ' · vida ' + Math.max(0, Math.ceil(se.hp)) + '/' + se.maxHp + ' · velocidad ' + Math.round(se.def.spd * g.dm.spd) + ' · oro ' + TD.diffGold(g.dm, se.def);
    }
    if (g.canCall()) return 'Próxima oleada: ' + TD.waveSummary(lvl.waves[g.waveIdx]);
    if (g.state === 'running') return 'Última oleada en curso: ¡aguantá la línea!';
    return '';
  }

  // Retrato redondo del héroe (r = 32 en el diseño clásico) con su zona de toque
  function heroPortrait(ctx, g, cx, cy, r) {
    var h = g.hero, hsel = g.sel && g.sel.hero, k = r / 32, gu = h.key === 'guemes';
    ctx.fillStyle = hsel ? '#b9d8f2' : D.PARCH2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = hsel ? '#2f6ea8' : D.GOLD; ctx.lineWidth = 3; ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, TAU); ctx.clip();
    var ho = heroFig(h.key, UI.t, (gu ? 1.25 : 1.7) * k);
    if (h.dead) ctx.globalAlpha = 0.35;
    D.unit(ctx, cx - (gu ? 4 * k : 0), cy + (gu ? 26 : 36) * k, ho);
    ctx.restore();
    if (h.dead) D.textO(ctx, h.reviveT > 0 ? String(Math.ceil(h.reviveT)) : 'oro', cx, cy + 8 * k, 22 * k, '#ffd76a');
    UI.zone(cx - r - 2, cy - r - 2, r * 2 + 6, r * 2 + 4, function () {
      if (h.dead) return;
      g.sel = (g.sel && g.sel.hero) ? null : { hero: true };
      g.armed = null; g.mode = null;
      TD.Audio.play('click');
    });
  }

  function heroXp(h) {
    if (h.level >= 6) return 1;
    var prev = h.level > 1 ? TD.HERO_XP[h.level - 2] : 0;
    return TD.clamp((h.xp - prev) / (TD.HERO_XP[h.level - 1] - prev), 0, 1);
  }

  function drawHUD(ctx, g) {
    var lvl = g.lvl, BY = TD.BAR_Y;

    // --- marcadores de entrada (llaman la oleada) ---
    if (g.canCall() && !UI.modal) entryMarkers(ctx, g, 1, 24);

    // --- barra superior ---
    ctx.fillStyle = 'rgba(46,32,18,0.92)'; ctx.fillRect(0, 0, W, TD.TOP_H);
    ctx.fillStyle = D.GOLD; ctx.fillRect(0, TD.TOP_H - 2, W, 2);
    UI.zone(0, 0, W, TD.TOP_H, null);
    topStatus(ctx, g);
    fit(ctx, lvl.name + ' · ' + lvl.year, W / 2, 29, 420, 20, D.PARCH, 'center', true, true);
    // botones de sistema
    UI.button(ctx, W - 52, 6, 44, 32, '', UI.togglePause);
    iconPause(ctx, W - 30, 22);
    UI.button(ctx, W - 104, 6, 44, 32, 'x' + g.speed, function () { g.speed = g.speed === 1 ? 2 : 1; TD.Audio.play('click'); }, { size: 17, active: g.speed === 2 });
    UI.button(ctx, W - 156, 6, 44, 32, '', function () { TD.Audio.setOn(!TD.Audio.on); });
    iconSound(ctx, W - 136, 22, TD.Audio.on);
    UI.button(ctx, W - 208, 6, 44, 32, '', function () { TD.Audio.setMusic(!TD.Audio.music); });
    iconNote(ctx, W - 186, 22, TD.Audio.music);
    UI.button(ctx, W - 260, 6, 44, 32, '', function () { if (!UI.modal) UI.togglePause(); UI.settings = true; });
    D.diffIcon(ctx, g.diff, W - 238, 21, 0.54, true);

    // --- barra del jefe ---
    if (g.boss && !g.boss.dead && !g.boss.gone) bossBar(ctx, g, W / 2, 52, 440);

    // --- cartel ---
    if (g.banner && !UI.modal) drawBanner(ctx, g, W / 2, UI.tut ? 124 : (g.boss ? 98 : 62), 900, 22);

    // --- franja de información ---
    var info = infoText(g), sel = g.sel;
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
    var h = g.hero;
    heroPortrait(ctx, g, 46, BY + 40, 32);
    fit(ctx, h.def.name + ' · Nv ' + h.level, 88, BY + 20, 126, 14, D.PARCH, 'left', true);
    ctx.fillStyle = '#1e140a'; ctx.fillRect(88, BY + 26, 126, 7);
    ctx.fillStyle = D.CELESTE; ctx.fillRect(88, BY + 26, 126 * (h.dead ? 0 : Math.max(0, h.hp / h.maxHp)), 7);
    ctx.fillStyle = '#1e140a'; ctx.fillRect(88, BY + 35, 126, 4);
    ctx.fillStyle = D.GOLD; ctx.fillRect(88, BY + 35, 126 * heroXp(h), 4);
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
        abilityButton(ctx, tw, x, cy, 300, ch);
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
    waveButton(ctx, g, 980, cy, 292, ch);
  }

  // Habilidad de la torre con la rama completa
  function abilityButton(ctx, tw, x, y, w, h) {
    var ready = tw.abilityReady(), hv = UI.hover(x, y, w, h);
    D.button(ctx, x, y, w, h, hv && ready, { disabled: !ready, primary: ready });
    var msg = ready ? tw.def.ability.desc : (tw.disT > 0 ? 'Torre fuera de combate' : 'Lista en ' + Math.ceil(tw.abCd) + ' s');
    if (C) {
      fit(ctx, tw.def.ability.name, x + 10, y + 21, w - 20, 15, ready ? D.INK : '#6b5236', 'left', true);
      wrapMax(ctx, msg, x + 10, y + 38, w - 18, 14, 12, D.INK2, Math.max(1, Math.floor((h - 30) / 14)));
    } else {
      fit(ctx, tw.def.ability.name + '  [Q]', x + 12, y + 24, w - 24, 17, ready ? D.INK : '#6b5236', 'left', true);
      D.wrap(ctx, msg, x + 12, y + 42, w - 20, 14, 12, D.INK2, 'left');
    }
    if (!ready && tw.abCd > 0) cooldownOverlay(ctx, x, y, w, h, tw.abCd / tw.def.ability.cd);
    UI.zone(x, y, w, h, function () { tw.useAbility(); });
  }

  function waveButton(ctx, g, x, y, w, h) {
    if (!g.canCall()) {
      UI.button(ctx, x, y, w, h, C ? 'Última oleada' : 'Última oleada en curso', null, { disabled: true, size: C ? 15 : 17 });
      return;
    }
    var hov = UI.hover(x, y, w, h), mx = x + w / 2, y1 = y + h / 2 - (C ? 3 : 4), y2 = y1 + (C ? 20 : 21);
    D.button(ctx, x, y, w, h, hov, { primary: true });
    if (g.state === 'prep') {
      fit(ctx, '¡Llamar oleada!', mx, y1, w - 12, C ? 18 : 21, D.INK, 'center', true);
      fit(ctx, C ? 'empieza el combate' : 'Espacio · empieza el combate', mx, y2, w - 12, C ? 12.5 : 13, D.INK, 'center');
    } else {
      var eb = g.earlyBonus();
      fit(ctx, 'Llamar oleada ' + (g.waveIdx + 1), mx, y1, w - 12, C ? 17 : 19, D.INK, 'center', true);
      fit(ctx, (C ? 'en ' : 'llega en ') + Math.max(0, Math.ceil(g.nextTimer)) + ' s' + (eb > 0 ? (C ? ' · +' + eb + ' de oro' : ' · adelantar: +' + eb + ' de oro') : ''), mx, y2, w - 12, C ? 12.5 : 13, D.INK, 'center');
    }
    UI.zone(x, y, w, h, function () { g.callWave(false); });
  }

  /* ---------------- HUD compacto (celular) ---------------- */
  var CHERO = { x: 8, w: 196, h: 68 };     // tarjeta del héroe, abajo a la izquierda
  var CBLD = 62;                           // lado del botón «Construir», abajo a la derecha
  var CR = { wave: null, pick: null, build: null };   // recuadros que señala el tutorial

  function towerButtonC(ctx, g, key, x, y, w, h) {
    var def = TD.TOWERS[key], can = g.gold >= def.cost, hov = UI.hover(x, y, w, h);
    D.button(ctx, x, y, w, h, hov && can, { disabled: !can, active: g.armed === key });
    D.towerIcon(ctx, key, x + 28, y + h / 2, 1.5);
    fit(ctx, TD.towerName(key, g.lvl.act), x + 56, y + 26, w - 64, 16, can ? D.INK : '#8b7a5c', 'left', true);
    D.coin(ctx, x + 64, y + 43, 7.5);
    D.text(ctx, String(def.cost), x + 77, y + 49, 17, can ? D.INK : '#a0522d', 'left', true);
    UI.zone(x, y, w, h, function () { UI.pickTower(key); });
  }

  function upgradeButtonC(ctx, g, tw, b, x, y, w, h) {
    var br = tw.def.branches[b], cost = tw.upgradeCost(b), can = g.gold >= cost, hov = UI.hover(x, y, w, h);
    D.button(ctx, x, y, w, h, hov && can, { disabled: !can });
    fit(ctx, br.name + ' ' + ['I', 'II', 'III'][tw.level], x + 10, y + 21, w - 78, 15.5, can ? D.INK : '#8b7a5c', 'left', true);
    D.coin(ctx, x + w - 54, y + 16, 7);
    D.text(ctx, String(cost), x + w - 43, y + 21, 15.5, can ? D.INK : '#a0522d', 'left', true);
    wrapMax(ctx, br.desc, x + 10, y + 38, w - 18, 13.5, 12, can ? D.INK2 : '#8b7a5c', Math.max(1, Math.floor((h - 28) / 14)));
    UI.zone(x, y, w, h, function () {
      if (!tw.upgrade(b)) { g.addText(tw.x, tw.y - 80, 'Te falta oro', '#ffb0a0', 14); g.goldDeny = 0.4; }
    });
  }

  // Llamar la oleada desde la barra superior: dos renglones cortos
  function waveButtonC(ctx, g, x, y, w, h) {
    CR.wave = { x: x, y: y, w: w, h: h };
    if (!g.canCall()) {
      UI.button(ctx, x, y, w, h, 'Última oleada en curso', null, { disabled: true, size: 15 });
      return;
    }
    var hov = UI.hover(x, y, w, h), mx = x + w / 2, eb = g.earlyBonus(), prep = g.state === 'prep';
    D.button(ctx, x, y, w, h, hov, { primary: true });
    fit(ctx, prep ? '¡Llamar oleada!' : 'Llamar oleada ' + (g.waveIdx + 1), mx, y + 17, w - 14, 16, D.INK, 'center', true);
    fit(ctx, prep ? 'empieza el combate' : 'llega en ' + Math.max(0, Math.ceil(g.nextTimer)) + ' s' + (eb > 0 ? ' · +' + eb + ' de oro' : ''), mx, y + 31, w - 14, 12, D.INK, 'center');
    UI.zone(x, y, w, h, function () { g.callWave(false); });
  }

  function iconBuild(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-0.62);
    ctx.strokeStyle = D.INK; ctx.lineWidth = 1.5;
    ctx.fillStyle = '#8a5a2b'; D.rr(ctx, -2.6, -5, 5.2, 23, 2); ctx.fill(); ctx.stroke();      // mango
    ctx.fillStyle = '#9aa0a8'; D.rr(ctx, -12, -13, 24, 10, 2.5); ctx.fill(); ctx.stroke();     // cabeza
    ctx.restore();
  }

  // Un marcador de entrada que cae debajo de la bandeja, de la tarjeta del héroe o del botón
  // «Construir» se corre hasta quedar a la vista (devuelve la nueva y, en px del mundo).
  function dodgeY(wt, kind, top, ex, ey, r) {
    var vx = wt.ox + ex * wt.f, vy = wt.oy + ey * wt.f, rr = r * wt.f + 6, lim;
    if (kind && top) {
      lim = CT + CSH + 10;
      if (vy - rr < lim) vy = lim + rr;
    } else if (kind) {
      lim = H - CSH - 12;
      if (vy + rr > lim) vy = lim - rr;
    } else {
      lim = H - CHERO.h - 14;
      if (vy + rr > lim && (vx - rr < CHERO.x + CHERO.w || vx + rr > W - CBLD - 14)) vy = lim - rr;
    }
    return (vy - wt.oy) / wt.f;
  }

  // Renglón de ayuda flotante: lo que se eligió queda fijo; el aviso de la próxima oleada
  // aparece unos segundos cada vez que cambia (o al tocar «Oleada» en la barra).
  function infoPill(ctx, g) {
    var info = infoText(g), fixed = !!(g.sel || g.mode), a = 1;
    if (!info) return;
    if (!fixed) {
      if (info !== UI.infoKey) { UI.infoKey = info; UI.infoT = 0; }
      a = TD.clamp((7 - UI.infoT) / 0.6, 0, 1);
      if (a <= 0) return;
    }
    var x0 = CHERO.x + CHERO.w + 10, x1 = W - CBLD - 18, maxW = x1 - x0 - 24, lines, pw, ph;
    D.font(ctx, 13, false);
    lines = Math.min(2, countLines(ctx, info, maxW));
    pw = lines > 1 ? maxW + 24 : Math.min(maxW, ctx.measureText(info).width) + 24;
    ph = lines > 1 ? 40 : 26;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(46,32,18,0.86)'; D.rr(ctx, (x0 + x1 - pw) / 2, H - ph - 8, pw, ph, 10); ctx.fill();
    wrapMax(ctx, info, (x0 + x1) / 2, H - ph + 9.5, maxW, 15, 13, D.PARCH, 2, 'center');
    ctx.restore();
  }

  // Bandeja: un renglón de ayuda y los botones de construir o de la torre elegida
  function drawSheet(ctx, g, kind, top) {
    var x = 6, w = W - 12, h = CSH, y = top ? CT + 4 : H - h - 6, gap = 6;
    ctx.fillStyle = 'rgba(30,20,10,0.35)'; D.rr(ctx, x + 2, y + 3, w, h, 12); ctx.fill();
    var gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, 'rgba(74,53,32,0.97)'); gr.addColorStop(1, 'rgba(46,32,18,0.97)');
    ctx.fillStyle = gr; D.rr(ctx, x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = D.GOLD; ctx.lineWidth = 2; ctx.stroke();
    UI.zone(x, y, w, h, null);
    fit(ctx, infoText(g) || 'Elegí una torre y después tocá un solar del mapa.', x + 14, y + 20, w - 28, 13.5, D.PARCH, 'left');

    var by = y + 30, bh = 62, cx = x + 8, cw = w - 16, bw;
    UI.button(ctx, cx + cw - 52, by, 52, bh, '×', UI.closeSheet, { size: 28 });
    cw -= 52 + gap;
    if (kind === 'tower') {
      var tw = g.sel.tower, sx;
      sx = cx + cw - 112;
      UI.button(ctx, sx, by, 112, bh, '', function () { g.sell(tw); }, { danger: true });
      D.text(ctx, 'Vender', sx + 56, by + 25, 16, D.INK, 'center', true);
      D.coin(ctx, sx + 38, by + 42, 7);
      D.text(ctx, '+' + tw.sellValue(), sx + 50, by + 47.5, 15.5, D.INK, 'left', true);
      cw -= 112 + gap;
      if (tw.key === 'granaderos') {
        sx = cx + cw - 112;
        UI.button(ctx, sx, by, 112, bh, '', function () { g.mode = g.mode === 'rally' ? null : 'rally'; }, { active: g.mode === 'rally' });
        D.text(ctx, 'Punto de', sx + 56, by + 26, 15, D.INK, 'center', true);
        D.text(ctx, 'reunión', sx + 56, by + 45, 15, D.INK, 'center', true);
        cw -= 112 + gap;
      }
      if (tw.level < 3) {
        if (tw.branch < 0) {
          bw = (cw - gap) / 2;
          upgradeButtonC(ctx, g, tw, 0, cx, by, bw, bh);
          upgradeButtonC(ctx, g, tw, 1, cx + bw + gap, by, bw, bh);
        } else {
          upgradeButtonC(ctx, g, tw, tw.branch, cx, by, Math.min(cw, 460), bh);
        }
      } else {
        abilityButton(ctx, tw, cx, by, Math.min(cw, 460), bh);
      }
    } else {
      bw = (cw - gap * 3) / 4;
      TD.TOWER_KEYS.forEach(function (key, n) {
        var tx = cx + n * (bw + gap);
        if (key === 'tiradores') CR.pick = { x: tx, y: by, w: bw, h: bh };
        towerButtonC(ctx, g, key, tx, by, bw, bh);
      });
    }
  }

  function drawHUDC(ctx, g, wt) {
    var mid = W / 2, kind = UI.modal ? null : sheetKind(g), top = !!kind && sheetTop(g, wt), low = !!kind && !top;
    CR.wave = CR.pick = CR.build = null;

    // --- marcadores de entrada, sobre el mundo y agrandados para el dedo ---
    if (g.canCall() && !UI.modal) {
      var mk = TD.clamp(0.95 / wt.f, 1, 1.7);
      push(ctx, wt.f, wt.ox, wt.oy);
      entryMarkers(ctx, g, mk, 26 * mk, function (ex, ey, r) { return dodgeY(wt, kind, top, ex, ey, r); });
      pop(ctx);
    }

    // --- barra superior: vidas, oro, oleada · llamar oleada · dificultad, velocidad y pausa ---
    ctx.fillStyle = 'rgba(46,32,18,0.97)'; ctx.fillRect(0, 0, W, CT);
    ctx.fillStyle = D.GOLD; ctx.fillRect(0, CT - 2, W, 2);
    UI.zone(0, 0, W, CT, null);
    topStatus(ctx, g);
    UI.zone(222, 0, 138, CT, function () { UI.infoKey = ''; });      // tocar «Oleada» repite qué viene
    var bw = 54, bh = 38, by = 3, rx = W - 6 - bw;
    UI.button(ctx, rx, by, bw, bh, '', UI.togglePause);
    iconPause(ctx, rx + bw / 2, by + bh / 2);
    rx -= bw + 6;
    UI.button(ctx, rx, by, bw, bh, 'x' + g.speed, function () { g.speed = g.speed === 1 ? 2 : 1; TD.Audio.play('click'); }, { size: 19, active: g.speed === 2 });
    rx -= bw + 6;
    UI.button(ctx, rx, by, bw, bh, '', function () { if (!UI.modal) UI.togglePause(); UI.settings = true; });
    D.diffIcon(ctx, g.diff, rx + bw / 2, by + bh / 2 - 1, 0.6, true);
    var wx0 = 366, wx1 = rx - 10, ww = Math.min(300, wx1 - wx0);
    waveButtonC(ctx, g, wx0 + (wx1 - wx0 - ww) / 2, by, ww, bh);

    // --- jefe y cartel, centrados sobre el mapa ---
    var boss = g.boss && !g.boss.dead && !g.boss.gone, ty = CT + 6 + (top ? CSH + 4 : 0);
    if (boss) { bossBar(ctx, g, mid, ty, Math.min(420, W - 24)); ty += 40; }
    if (g.banner && !UI.modal) drawBanner(ctx, g, mid, ty + (UI.tut && !top ? 70 : 2), W - 40, 19);

    if (low) { drawSheet(ctx, g, kind, top); return; }

    // --- héroe: retrato (lo elige), vida, experiencia y habilidad ---
    var h = g.hero, hx = CHERO.x, hy = H - CHERO.h - 8, bx = hx + 70, hw = CHERO.w - 78;
    ctx.fillStyle = 'rgba(46,32,18,0.84)'; D.rr(ctx, hx, hy, CHERO.w, CHERO.h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(224,174,50,0.75)'; ctx.lineWidth = 1.5; ctx.stroke();
    UI.zone(hx, hy, CHERO.w, CHERO.h, null);
    heroPortrait(ctx, g, hx + 35, hy + 34, 27);
    ctx.fillStyle = D.GOLD; ctx.strokeStyle = D.INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(hx + 57, hy + 55, 9.5, 0, TAU); ctx.fill(); ctx.stroke();
    D.text(ctx, String(h.level), hx + 57, hy + 59.5, 13, D.INK, 'center', true);
    ctx.fillStyle = '#1e140a'; ctx.fillRect(bx, hy + 8, hw, 8);
    ctx.fillStyle = D.CELESTE; ctx.fillRect(bx, hy + 8, hw * (h.dead ? 0 : Math.max(0, h.hp / h.maxHp)), 8);
    ctx.fillStyle = '#1e140a'; ctx.fillRect(bx, hy + 18, hw, 4);
    ctx.fillStyle = D.GOLD; ctx.fillRect(bx, hy + 18, hw * heroXp(h), 4);
    var hReady = !h.dead && h.abCd <= 0;
    UI.button(ctx, bx, hy + 27, hw, 35, hReady ? h.def.ability.name : (h.dead ? 'Caído' : Math.ceil(h.abCd) + ' s'), function () { h.useAbility(); }, { size: 14, disabled: !hReady, primary: hReady });
    if (!h.dead && h.abCd > 0) cooldownOverlay(ctx, bx, hy + 27, hw, 35, h.abCd / h.abilityCd());

    // --- botón «Construir»: abre la bandeja de torres (o la cierra si quedó arriba) ---
    var cbx = W - CBLD - 8, cby = H - CBLD - 8;
    CR.build = { x: cbx, y: cby, w: CBLD, h: CBLD };
    UI.button(ctx, cbx, cby, CBLD, CBLD, '', function () {
      if (sheetKind(g)) UI.closeSheet(); else { UI.buildOpen = true; g.sel = null; g.mode = null; }
      TD.Audio.play('click');
    }, { active: !!kind });
    iconBuild(ctx, cbx + CBLD / 2, cby + 23);
    fit(ctx, kind ? 'Cerrar' : 'Construir', cbx + CBLD / 2, cby + CBLD - 9, CBLD - 8, 12.5, D.INK, 'center', true);

    if (kind) drawSheet(ctx, g, kind, top);
    else if (!UI.tut && !UI.modal) infoPill(ctx, g);
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
    diffChip(ctx, x + w - 134, y + 16, 118, 34, '', 15);
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
    UI.button(ctx, x + 60, y + 208, w - 120, 44, 'Ajustes', function () { UI.settings = true; }, { size: 18 });
    UI.button(ctx, x + 60, y + 262, w - 120, 44, 'Volver al mapa', function () { UI.go('map'); }, { size: 18 });
    if (!C) D.text(ctx, 'P o Esc para volver al combate', W / 2, y + h - 26, 14, D.INK2, 'center', false, true);
  }

  /* ---------------- ajustes (panel sobre cualquier pantalla) ---------------- */
  function applyDrag(mx) {
    var d = UI.drag;
    if (!d) return;
    d.set(Math.round(TD.clamp((mx - d.x) / d.w, 0, 1) * 20) / 20);      // de a 5 %
  }

  UI.release = function () {
    var d = UI.drag;
    UI.drag = null;
    if (d && d.done) d.done();
  };

  // Control deslizante: pista, perilla, botones − / + y porcentaje.
  function slider(ctx, x, cy, w, val, set, done) {
    var kx = x + w * val, h = 12, bx = x - 56, px = x + w + 16;
    UI.button(ctx, bx, cy - 20, 44, 40, '−', function () { set(Math.max(0, Math.round(val * 10 - 1) / 10)); done(); }, { size: 24 });
    UI.button(ctx, px, cy - 20, 44, 40, '+', function () { set(Math.min(1, Math.round(val * 10 + 1) / 10)); done(); }, { size: 22 });
    D.rr(ctx, x, cy - h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(59,42,26,0.25)'; ctx.fill();
    if (val > 0) { D.rr(ctx, x, cy - h / 2, Math.max(h, w * val), h, h / 2); ctx.fillStyle = D.CELESTE; ctx.fill(); }
    D.rr(ctx, x, cy - h / 2, w, h, h / 2); ctx.strokeStyle = D.INK; ctx.lineWidth = 2; ctx.stroke();
    var hot = UI.drag && UI.drag.x === x || UI.hover(x - 10, cy - 18, w + 20, 36);
    ctx.beginPath(); ctx.arc(kx, cy, hot ? 15 : 13, 0, TAU);
    ctx.fillStyle = D.GOLD; ctx.fill(); ctx.strokeStyle = D.INK; ctx.lineWidth = 2.5; ctx.stroke();
    UI.zone(x - 12, cy - 20, w + 24, 40, function () {
      UI.drag = { x: x, w: w, set: set, done: done };
      applyDrag(UI.mx);
    });
    D.text(ctx, val <= 0 ? 'Mudo' : Math.round(val * 100) + ' %', x + w + 120, cy + 8, 20, D.INK, 'right', true);
  }

  function diffCard(ctx, key, x, y, w, h) {
    var d = TD.DIFFS[key], cur = TD.diffKey() === key, hov = UI.hover(x, y, w, h);
    D.button(ctx, x, y, w, h, hov, { active: cur, primary: cur });
    // el elegido se mece; los otros se agitan al pasar el mouse
    var wob = cur ? Math.sin(UI.t * 3) * 0.07 : (hov ? Math.sin(UI.t * 10) * 0.12 : 0);
    if (!cur && !hov) ctx.globalAlpha *= 0.8;
    D.diffIcon(ctx, key, x + w / 2, y + 46, cur ? 1.3 : 1.18, false, wob);
    if (!cur && !hov) ctx.globalAlpha /= 0.8;
    D.text(ctx, d.name, x + w / 2, y + h - 28, 22, D.INK, 'center', true);
    fit(ctx, '«' + d.motto + '»', x + w / 2, y + h - 10, w - 14, 13, D.INK2, 'center', false, true);
    UI.zone(x, y, w, h, function () { UI.setDiff(key); });
  }

  function fsLabel() { return TD.PWA.isFullscreen() ? 'Salir de pantalla completa' : 'Pantalla completa'; }

  function drawSettings(ctx) {
    if (C) { drawSettingsC(ctx); return; }
    var A = TD.Audio, S = TD.Save, w = 760, h = 650, x = W / 2 - w / 2, y = H / 2 - h / 2, sx = x + 158, sw = 380;
    var g = UI.screen === 'game' ? UI.game : null, live = g && g.state !== 'won' && g.state !== 'lost';
    dim(ctx, 0.55);
    D.panel(ctx, x, y, w, h);
    D.text(ctx, 'Ajustes', W / 2, y + 54, 36, D.INK, 'center', true);
    if (TD.PWA.canFullscreen()) UI.button(ctx, x + w - 216, y + 24, 192, 36, fsLabel(), TD.PWA.toggleFullscreen, { size: 15 });

    D.text(ctx, 'Dificultad', x + 64, y + 94, 19, D.INK, 'left', true);
    fit(ctx, live ? 'Rige desde ya. La victoria cuenta con la más baja que usaste.'
      : 'Podés cambiarla cuando quieras, incluso en plena batalla.', x + w - 64, y + 94, 440, 13, D.INK2, 'right', false, true);
    TD.DIFF_KEYS.forEach(function (key, n) { diffCard(ctx, key, x + 64 + n * 216, y + 106, 200, 138); });
    fit(ctx, TD.diffText(TD.diffKey()), W / 2, y + 268, w - 96, 14.5, D.INK, 'center', false, true);

    D.text(ctx, 'Efectos de sonido', sx, y + 302, 19, D.INK, 'left', true);
    slider(ctx, sx, y + 334, sw, A.sfxVol, A.setSfxVol, function () { A.saveVolumes(); A.play('upgrade'); });
    D.text(ctx, 'Música', sx, y + 378, 19, D.INK, 'left', true);
    slider(ctx, sx, y + 410, sw, A.musVol, A.setMusicVol, function () { A.saveVolumes(); });
    UI.button(ctx, W / 2 - 216, y + 446, 200, 40, 'Sonido: ' + (A.on ? 'sí' : 'no'), function () { A.setOn(!A.on); }, { size: 17 });
    UI.button(ctx, W / 2 + 16, y + 446, 200, 40, 'Música: ' + (A.music ? 'sí' : 'no'), function () { A.setMusic(!A.music); }, { size: 17 });
    UI.button(ctx, W / 2 - 216, y + 496, 200, 40, 'Sacudida: ' + (S.data.shake ? 'sí' : 'no'), function () { S.data.shake = !S.data.shake; S.save(); }, { size: 17 });
    UI.button(ctx, W / 2 + 16, y + 496, 200, 40, 'Números de daño: ' + (S.data.nums ? 'sí' : 'no'), function () { S.data.nums = !S.data.nums; S.save(); }, { size: 16 });
    UI.button(ctx, W / 2 - 110, y + h - 68, 220, 48, 'Listo', function () { UI.settings = false; }, { primary: true, size: 21 });
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
      var rd = res.diff || g.diff;
      D.diffIcon(ctx, rd, x + w - 62, y + 56, 1);
      D.text(ctx, TD.DIFFS[rd].name, x + w - 62, y + 102, 14, D.INK2, 'center', true);
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
      var w2 = 600, h2 = 310, x2 = W / 2 - w2 / 2, y2 = H / 2 - h2 / 2;
      D.panel(ctx, x2, y2, w2, h2);
      D.text(ctx, 'Derrota', W / 2, y2 + 70, 46, D.PUNZO, 'center', true);
      D.wrap(ctx, 'El enemigo rompió la línea en la oleada ' + g.waveIdx + ' de ' + lvl.waves.length + '. A reorganizarse: probá otra combinación de torres y mirá qué armadura traen.', W / 2, y2 + 112, w2 - 80, 23, 16, D.INK, 'center', false, true);
      UI.button(ctx, x2 + 28, y2 + h2 - 84, 120, 50, 'Mapa', function () { UI.go('map'); }, { size: 19 });
      diffChip(ctx, x2 + 160, y2 + h2 - 84, 240, 50, 'Dificultad: ', 17);
      UI.button(ctx, x2 + 412, y2 + h2 - 84, 160, 50, 'Reintentar', function () { UI.startLevel(g.idx); }, { primary: true, size: 21 });
    }
  }

  function drawGame(ctx) {
    var g = UI.game;
    if (!g) return;
    var wt = worldLayout(), J = TD.Juice;
    if (C) {
      // el mundo, achicado y recortado a su recuadro; alrededor, la interfaz compacta
      // (si la pantalla es más apaisada que el mapa, sobran franjas de madera a los costados)
      ctx.fillStyle = '#2e2012'; ctx.fillRect(0, 0, W, H);
      if (wt.ax > 1) {
        ctx.fillStyle = 'rgba(224,174,50,0.55)';
        ctx.fillRect(wt.ax - 2, wt.ay, 2, wt.ah); ctx.fillRect(wt.ax + wt.aw, wt.ay, 2, wt.ah);
      }
      ctx.save();
      ctx.beginPath(); ctx.rect(wt.ax, wt.ay, wt.aw, wt.ah); ctx.clip();
      ctx.translate(wt.ox, wt.oy); ctx.scale(wt.f, wt.f);
      g.render(ctx);
      ctx.restore();
      drawHUDC(ctx, g, wt);
    } else {
      g.render(ctx);
      drawHUD(ctx, g);
    }
    // las monedas vuelan (en coordenadas del mundo) hasta el contador de oro de la barra
    J.HUD_COIN.x = (112 - wt.ox) / wt.f; J.HUD_COIN.y = (22 - wt.oy) / wt.f;
    push(ctx, wt.f, wt.ox, wt.oy);
    J.drawOverlay(ctx, g);
    pop(ctx);
    if (UI.tut && !UI.modal) drawTutorial(ctx, g);
    if (UI.modal) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, UI.modalT / 0.16);      // los paneles aparecen con un fundido corto
      if (UI.modal === 'brief') drawBrief(ctx, g);
      else if (UI.modal === 'pause') drawPause(ctx, g);
      else if (UI.modal === 'levelup') drawLevelUp(ctx, g);
      else if (UI.modal === 'end') drawEnd(ctx, g);
      ctx.restore();
    }
  }

  /* ================================================================
   *              PANTALLAS EN DISEÑO COMPACTO (CELULAR)
   * La vista mide W x 480 (W entre 854 y 1280). Mismo contenido que las
   * pantallas clásicas, reacomodado para leerse y tocarse con el dedo:
   * menos cosas a la vez, y fichas o páginas en lugar de columnas largas.
   * ================================================================ */
  function drawMenuC(ctx) {
    var i, t = UI.t, mx = W / 2, lc = TD.Logros.total(), inst = TD.PWA.canInstall();
    D.parchment(ctx);
    ctx.fillStyle = 'rgba(116,172,223,0.35)'; ctx.fillRect(16, 64, W - 32, 32); ctx.fillRect(16, 128, W - 32, 32);
    ctx.fillStyle = 'rgba(246,242,228,0.55)'; ctx.fillRect(16, 96, W - 32, 32);
    D.sun(ctx, mx, 36, 17, t);
    D.font(ctx, 54, true);
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.lineWidth = 6; ctx.strokeStyle = D.PARCH; ctx.strokeText('PATRIA EN ARMAS', mx, 131);
    ctx.fillStyle = D.INK; ctx.fillText('PATRIA EN ARMAS', mx, 131);
    fit(ctx, 'Tower Defense de las Invasiones Inglesas, la Independencia y la Vuelta de Obligado', mx, 181, W - 80, 15, D.INK2, 'center', false, true);

    // desfile (va antes que los botones, para que nunca los tape)
    ctx.fillStyle = 'rgba(59,42,26,0.18)'; ctx.fillRect(16, 456, W - 32, 3);
    var n = Math.floor((W + 200) / 150);
    for (i = 0; i < n; i++) {
      var o = i % 3 === 2 ? MARCH_G : (i % 2 ? MARCH_B : MARCH_A);
      o.t = t + i * 0.37;
      var x = ((t * 46 + i * 150) % (n * 150)) - 100;
      D.shadow(ctx, x, 456, 14, 4);
      D.unit(ctx, x, 454, o);
    }
    D.flagPole(ctx, 84, 456, 112, 'arg', t, 64, 41, 1);
    D.flagPole(ctx, W - 84, 456, 112, 'arg', t + 1, 64, 41, -1);

    UI.button(ctx, mx - 150, 194, 300, 52, 'Jugar', function () {
      if (TD.Save.data.hero) UI.go('map'); else { UI.heroBack = 'menu'; UI.go('hero'); }
    }, { primary: true, size: 25 });
    UI.button(ctx, mx - 226, 256, 220, 44, 'Enciclopedia', function () { UI.go('ency'); }, { size: 18 });
    UI.button(ctx, mx + 6, 256, 220, 44, '', function () { UI.openLogros('menu'); });
    TD.Logros.medal(ctx, mx + 34, 284, 0.36, 2, 'granada', true);
    D.text(ctx, 'Condecoraciones', mx + 126, 284, 18, D.INK, 'center', true);
    if (lc.fresh) badge(ctx, mx + 222, 260, lc.fresh);
    UI.button(ctx, mx - 226, 308, 220, 44, 'Ajustes', function () { UI.settings = true; }, { size: 18 });
    var reset = function () {
      if (UI.confirmReset > 0) { TD.Save.reset(); TD.Audio.sync(); TD.Logros.init(); UI.confirmReset = 0; }
      else UI.confirmReset = 4;
    };
    var rl = UI.confirmReset > 0 ? '¿Seguro? Tocá de nuevo' : 'Borrar progreso';
    if (inst) {
      UI.button(ctx, mx + 6, 308, 220, 44, 'Instalar el juego', TD.PWA.install, { size: 18, primary: true });
      UI.button(ctx, mx - 110, 360, 220, 34, rl, reset, { size: 14, danger: UI.confirmReset > 0 });
    } else {
      UI.button(ctx, mx + 6, 308, 220, 44, rl, reset, { size: 15, danger: UI.confirmReset > 0 });
    }

    D.star(ctx, W - 112, 32, 11, true);
    D.text(ctx, TD.Save.totalStars() + ' / ' + (TD.LEVELS.length * 3), W - 94, 38, 17, D.INK, 'left', true);
    TD.Logros.medal(ctx, 46, 40, 0.4, 2, 'granada', true);
    D.text(ctx, lc.got + ' / ' + lc.total, 62, 38, 17, D.INK, 'left', true);
  }

  /* ---------------- héroe: lista a la izquierda, ficha a la derecha ---------------- */
  function drawHeroSelectC(ctx) {
    var t = UI.t, keys = TD.HERO_KEYS;
    if (UI.heroSel < 0 || UI.heroSel >= keys.length) UI.heroSel = Math.max(0, keys.indexOf(TD.Save.data.hero));
    D.parchment(ctx);
    UI.button(ctx, 12, 8, 112, 38, '← Volver', function () { UI.go(UI.heroBack); }, { size: 15 });
    D.text(ctx, 'Elegí tu héroe', W / 2, 36, 26, D.INK, 'center', true);
    fit(ctx, 'Te acompaña en toda la campaña y podés cambiarlo desde el mapa. La selección no representa la realidad: es solo para el juego.', W / 2, 59, W - 60, 12.5, '#8a5a55', 'center', false, true);

    keys.forEach(function (key, n) {
      var def = TD.HEROES[key], x = 12, y = 70 + n * 134, w = 196, h = 128, on = UI.heroSel === n, gu = key === 'guemes';
      var hov = UI.hover(x, y, w, h);
      D.button(ctx, x, y, w, h, hov, { active: on, primary: on });
      ctx.fillStyle = 'rgba(116,172,223,0.3)';
      ctx.beginPath(); ctx.arc(x + 54, y + 58, 42, 0, TAU); ctx.fill();
      ctx.strokeStyle = D.INK2; ctx.lineWidth = 1.5; ctx.stroke();
      var o = heroFig(key, t, gu ? 1.45 : 1.8);
      o.atk = on ? (t * 1.2) % 1 : 0;
      D.shadow(ctx, x + 54, y + 96, 26, 6);
      D.unit(ctx, x + 54 - (gu ? 5 : 0), y + 95, o);
      fit(ctx, def.name, x + 104, y + 56, w - 112, 17, D.INK, 'left', true);
      if (TD.Save.data.hero === key) D.text(ctx, 'Tu héroe', x + 104, y + 76, 12.5, '#2f5f8f', 'left', false, true);
      UI.zone(x, y, w, h, function () { UI.heroSel = n; });
    });

    var key = keys[UI.heroSel], def = TD.HEROES[key], cur = TD.Save.data.hero === key;
    var px = 220, py = 70, pw = W - 232, ph = 396, tx = px + 24, tw = pw - 48, yy;
    D.panel(ctx, px, py, pw, ph);
    D.text(ctx, def.name, tx, py + 40, 27, D.INK, 'left', true);
    D.text(ctx, def.title, tx, py + 60, 14, D.INK2, 'left', false, true);
    D.text(ctx, 'Vida ' + def.hp + ' · Daño ' + def.dmg + ' (' + TD.DMG_NAMES[def.type] + ') · Vel. ' + def.spd, px + pw - 24, py + 38, 13, D.INK2, 'right');
    yy = wrapMax(ctx, def.bio, tx, py + 90, tw, 22, 16, D.INK, 3);
    D.text(ctx, 'Habilidad: ' + def.ability.name, tx, yy + 8, 16, '#2f5f8f', 'left', true);
    yy = wrapMax(ctx, def.ability.desc, tx, yy + 31, tw, 22, 16, D.INK, 2);
    ctx.strokeStyle = 'rgba(59,42,26,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tx, yy - 6); ctx.lineTo(px + pw - 24, yy - 6); ctx.stroke();
    D.text(ctx, 'En la historia real', tx, yy + 12, 14, D.INK, 'left', true);
    def.epochs.forEach(function (ep, i) {
      var ry = yy + 22 + i * 23;
      ctx.fillStyle = EPOCH_COL[ep.s]; D.rr(ctx, tx, ry, 34, 18, 5); ctx.fill();
      ctx.strokeStyle = D.INK2; ctx.lineWidth = 1; D.rr(ctx, tx, ry, 34, 18, 5); ctx.stroke();
      D.text(ctx, EPOCH_TAG[i], tx + 17, ry + 14, 13, ep.s === 'no' ? '#fff' : D.INK, 'center', true);
      fit(ctx, ep.t, tx + 42, ry + 14, tw - 42, 13, D.INK, 'left');
    });
    UI.button(ctx, px + pw / 2 - 160, py + ph - 54, 320, 42, cur ? 'Seguir con ' + def.name : 'Elegir a ' + def.name, function () {
      TD.Save.data.hero = key; TD.Save.save();
      UI.go('map');
    }, { primary: true, size: 18 });
  }

  /* ---------------- campaña: mapa achicado + ficha del nivel ---------------- */
  function drawMapC(ctx) {
    var S = TD.Save.data, lc = TD.Logros.total(), x = 10, k2;
    D.parchment(ctx);
    UI.button(ctx, x, 7, 92, 38, '← Menú', function () { UI.go('menu'); }, { size: 14 }); x += 98;
    UI.button(ctx, x, 7, 168, 38, 'Héroe: ' + TD.HEROES[heroKey()].name, function () { UI.heroBack = 'map'; UI.go('hero'); }, { size: 14 }); x += 174;
    UI.button(ctx, x, 7, 118, 38, 'Enciclopedia', function () { UI.go('ency'); }, { size: 14 }); x += 124;
    diffChip(ctx, x, 7, 146, 38, '', 14); x += 152;
    UI.button(ctx, x, 7, 94, 38, '', function () { UI.openLogros('map'); });
    TD.Logros.medal(ctx, x + 19, 32, 0.34, 2, 'granada', true);
    D.text(ctx, lc.got + ' / ' + lc.total, x + 35, 31, 14, D.INK, 'left', true);
    if (lc.fresh) badge(ctx, x + 90, 11, lc.fresh);
    x += 100;
    UI.button(ctx, x, 7, 86, 38, 'Ajustes', function () { UI.settings = true; }, { size: 14 });
    D.star(ctx, W - 84, 26, 11, true);
    D.text(ctx, TD.Save.totalStars() + ' / ' + (TD.LEVELS.length * 3), W - 68, 32, 16, D.INK, 'left', true);

    // el mapa clásico (800x600) entra achicado a la izquierda
    var sm = Math.min(0.7, (W - 30 - 340) / 800), mw = 800 * sm, mh = 600 * sm, my0 = 52 + (420 - mh) / 2;
    push(ctx, sm, 10 - 30 * sm, my0 - 90 * sm);
    drawMapArt(ctx);
    drawMapNodes(ctx, 32);
    pop(ctx);

    // ficha del nivel elegido
    var n = UI.mapSel, lvl = TD.LEVELS[n], open = n < S.unlocked, px = 20 + mw, py = 52, pw = W - px - 10, ph = 420, mx = px + pw / 2, yy;
    D.panel(ctx, px, py, pw, ph);
    UI.button(ctx, px + 10, py + 28, 42, 42, '‹', n > 0 ? function () { UI.mapSel = n - 1; } : null, { size: 26, disabled: n <= 0 });
    UI.button(ctx, px + pw - 52, py + 28, 42, 42, '›', n < TD.LEVELS.length - 1 ? function () { UI.mapSel = n + 1; } : null, { size: 26, disabled: n >= TD.LEVELS.length - 1 });
    D.text(ctx, TD.ACTS[lvl.act].name, mx, py + 26, 13, ACT_COLORS[lvl.act] === '#74acdf' ? '#2f6ea8' : ACT_COLORS[lvl.act], 'center', true);
    fit(ctx, (n + 1) + '. ' + lvl.name, mx, py + 56, pw - 120, 22, D.INK, 'center', true);
    fit(ctx, lvl.year + ' · ' + lvl.place, mx, py + 76, pw - 120, 13, D.INK2, 'center', false, true);
    for (k2 = 0; k2 < 3; k2++) D.star(ctx, mx - 28 + k2 * 28, py + 102, 11, k2 < (S.stars[String(n)] | 0));
    ctx.strokeStyle = 'rgba(59,42,26,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 22, py + 124); ctx.lineTo(px + pw - 22, py + 124); ctx.stroke();
    D.text(ctx, 'Objetivos de estrellas', px + 22, py + 148, 14.5, D.INK, 'left', true);
    yy = py + 172;
    lvl.stars.forEach(function (o) {
      D.star(ctx, px + 30, yy - 5, 7, false);
      fit(ctx, TD.objectiveText(o), px + 46, yy, pw - 66, 14, D.INK, 'left');
      yy += 23;
    });
    fit(ctx, lvl.waves.length + ' oleadas · ' + lvl.gold + ' de oro inicial · ' + lvl.lives + ' vidas', px + 22, yy + 6, pw - 44, 13, D.INK2, 'left');
    var md = TD.Save.medal(n);
    if (md >= 0) {
      D.diffIcon(ctx, TD.DIFF_KEYS[md], px + 33, yy + 27, 0.36);
      var sdN = S.starsD[String(n)] ? TD.Save.starsAt(n, md) : -1;
      fit(ctx, 'Mejor victoria: en ' + TD.DIFFS[TD.DIFF_KEYS[md]].name.toLowerCase() +
        (sdN >= 0 ? ', con ' + sdN + (sdN === 1 ? ' estrella' : ' estrellas') : ''), px + 50, yy + 32, pw - 72, 13, D.INK2, 'left');
    }
    if (open) {
      UI.button(ctx, px + 20, py + ph - 100, pw - 40, 50, '¡A la batalla!', function () { UI.startLevel(UI.mapSel); }, { primary: true, size: 23 });
    } else {
      UI.button(ctx, px + 20, py + ph - 100, pw - 40, 50, 'Bloqueado', null, { disabled: true, size: 20 });
      fit(ctx, 'Ganá la batalla anterior para desbloquearla.', mx, py + ph - 110, pw - 40, 13, D.INK2, 'center', false, true);
    }
    UI.button(ctx, px + 20, py + ph - 42, pw - 40, 32, 'Ver ficha histórica', function () { UI.encyTab = 0; UI.encySel = UI.mapSel; UI.go('ency'); }, { size: 14 });
  }

  /* ---------------- enciclopedia: tres solapas ---------------- */
  var ENC_LIST = ['casaca', 'realista', 'frances', 'explorador', 'caballeria', 'pesado', 'cazador', 'cirujano', 'espia', 'veterano', 'lancha', 'bergantin', 'vapor'];

  function encyEnemy(ctx, id, ex, ey, tw) {
    var def = TD.ENEMIES[id], k;
    for (k in ENC_FIG) if (Object.prototype.hasOwnProperty.call(ENC_FIG, k)) delete ENC_FIG[k];
    for (k in def.look) if (Object.prototype.hasOwnProperty.call(def.look, k)) ENC_FIG[k] = def.look[k];
    ENC_FIG.t = UI.t; ENC_FIG.face = 1; ENC_FIG.walk = false; ENC_FIG.atk = 0;
    if (def.naval) { ENC_FIG.s = 0.55; ENC_FIG.noWake = true; D.ship(ctx, ex + 34, ey + 44, ENC_FIG); }
    else { ENC_FIG.s = (ENC_FIG.s || 1) * 1.15; D.unit(ctx, ex + 30, ey + 52, ENC_FIG); }
    fit(ctx, def.name, ex + 70, ey + 22, tw, 15, D.INK, 'left', true);
    fit(ctx, def.trait + ' · armadura ' + def.armor, ex + 70, ey + 40, tw, 13, D.INK2, 'left');
    fit(ctx, 'Vida ' + def.hp + ' · vel. ' + def.spd + ' · oro ' + def.gold, ex + 70, ey + 56, tw, 13, D.INK2, 'left');
  }

  function drawEncyC(ctx) {
    var i, k, tab = UI.encyTab, tabs = ['Batallas', 'Daño y torres', 'Enemigos'], tx = W - 10;
    D.parchment(ctx);
    UI.button(ctx, 10, 7, 108, 38, '← Volver', function () { UI.go(TD.Save.data.hero ? 'map' : 'menu'); }, { size: 15 });
    D.text(ctx, 'Enciclopedia', 132, 35, 24, D.INK, 'left', true);
    for (i = 2; i >= 0; i--) {
      var bw = i === 1 ? 150 : 116;
      tx -= bw;
      (function (n) { UI.button(ctx, tx, 7, bw, 38, tabs[n], function () { UI.encyTab = n; }, { size: 15, active: tab === n }); })(i);
      tx -= 6;
    }

    if (tab === 0) {
      // batallas: lista angosta + ficha
      D.panel(ctx, 10, 52, 258, 420);
      var y = 60, lastAct = -1;
      TD.LEVELS.forEach(function (lvl, n) {
        if (lvl.act !== lastAct) {
          lastAct = lvl.act;
          fit(ctx, TD.ACTS[lvl.act].name, 22, y + 14, 234, 12, D.INK2, 'left', true);
          y += 19;
        }
        UI.button(ctx, 20, y, 238, 26, (n + 1) + '. ' + lvl.name, function () { UI.encySel = n; }, { size: 13, active: UI.encySel === n });
        y += 29;
      });
      var lv = TD.LEVELS[UI.encySel], px = 278, pw = W - 288, mx = px + pw / 2, tw = pw - 64, size = 16, total, yy;
      D.panel(ctx, px, 52, pw, 420);
      fit(ctx, TD.ACTS[lv.act].name + ' · ' + TD.ACTS[lv.act].years, mx, 78, pw - 40, 13, D.INK2, 'center', true);
      fit(ctx, lv.name, mx, 112, pw - 110, 29, D.INK, 'center', true);
      D.text(ctx, lv.year + ' · ' + lv.place, mx, 134, 14, D.INK2, 'center', false, true);
      ctx.strokeStyle = 'rgba(59,42,26,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px + 30, 146); ctx.lineTo(px + pw - 30, 146); ctx.stroke();
      // la letra se achica lo necesario para que la ficha entre completa
      do {
        D.font(ctx, size, false);
        total = 0;
        for (k = 0; k < lv.info.length; k++) total += countLines(ctx, lv.info[k], tw) * size * 1.36 + size * 0.6;
        if (total <= 286) break;
        size -= 0.5;
      } while (size > 11);
      yy = 156 + size;
      lv.info.forEach(function (line) {
        ctx.fillStyle = D.PUNZO; ctx.beginPath(); ctx.arc(px + 26, yy - size * 0.3, 3.5, 0, TAU); ctx.fill();
        yy = D.wrap(ctx, line, px + 40, yy, tw, size * 1.36, size, D.INK, 'left') + size * 0.6;
      });
      D.flagPole(ctx, px + pw - 34, 124, 56, TD.flagFor(lv), UI.t, 36, 23, -1);
      fit(ctx, 'Datos generales de contexto. El terreno y las tropas del juego son aproximados.', mx, 462, pw - 30, 12, D.INK2, 'center', false, true);
    } else if (tab === 1) {
      // tabla de daño contra armadura
      var cols = TD.ARMORS, rows = ['cont', 'perf', 'fuego'], lw = 300;
      D.panel(ctx, 10, 52, lw, 420);
      D.text(ctx, 'Daño contra armadura', 10 + lw / 2, 84, 18, D.INK, 'center', true);
      D.text(ctx, 'Armadura', 10 + lw / 2 + 48, 108, 12.5, D.INK2, 'center', false, true);
      for (i = 0; i < 3; i++) D.text(ctx, cols[i].charAt(0).toUpperCase() + cols[i].slice(1), 142 + i * 62, 128, 13.5, D.INK2, 'center', true);
      rows.forEach(function (r, ri) {
        var ry = 166 + ri * 44;
        D.text(ctx, TD.DMG_NAMES[r].charAt(0).toUpperCase() + TD.DMG_NAMES[r].slice(1), 24, ry, 14.5, D.INK, 'left', true);
        for (k = 0; k < 3; k++) {
          var m = TD.DMG[r][cols[k]];
          ctx.fillStyle = m >= 1.25 ? 'rgba(92,178,74,0.4)' : (m <= 0.75 ? 'rgba(207,43,43,0.3)' : 'rgba(107,82,54,0.15)');
          D.rr(ctx, 114 + k * 62, ry - 23, 56, 34, 6); ctx.fill();
          D.text(ctx, '×' + m, 142 + k * 62, ry, 16, D.INK, 'center', true);
        }
      });
      D.wrap(ctx, 'Verde: «¡Muy eficaz!». Rojo: «Resiste». Mirá el texto flotante durante el combate.', 24, 312, lw - 28, 18, 13, D.INK2, 'left', false, true);
      D.wrap(ctx, 'Jefes: uno por batalla, con tres fases (al 66 % y al 33 % de vida).', 24, 388, lw - 28, 18, 13, D.INK2, 'left', false, true);

      // torres
      var qx = 20 + lw, qw = W - qx - 10;
      D.panel(ctx, qx, 52, qw, 420);
      D.text(ctx, 'Torres', qx + qw / 2, 82, 18, D.INK, 'center', true);
      TD.TOWER_KEYS.forEach(function (key, n) {
        var def = TD.TOWERS[key], ty = 112 + n * 91, fx = qx + 92, fw = qw - 106;
        D.towerPreview(ctx, key, -1, 0, qx + 48, ty + 34, 0.74, UI.t);
        fit(ctx, TD.towerName(key) + ' — ' + def.cost + ' de oro · daño ' + TD.DMG_NAMES[def.base.type], fx, ty, fw, 15, D.INK, 'left', true);
        fit(ctx, def.branches[0].name + ': ' + def.branches[0].desc, fx, ty + 19, fw, 13, D.INK, 'left');
        fit(ctx, def.branches[1].name + ': ' + def.branches[1].desc, fx, ty + 36, fw, 13, D.INK, 'left');
        fit(ctx, 'Habilidad (rama completa): ' + def.ability.name, fx, ty + 53, fw, 13, '#2f5f8f', 'left', true);
      });
    } else {
      // enemigos, en tres o cuatro columnas según el ancho
      var nc = W >= 1140 ? 4 : 3, cw = (W - 40) / nc, rh = nc === 4 ? 96 : 80;
      D.panel(ctx, 10, 52, W - 20, 420);
      ENC_LIST.forEach(function (id, n) {
        encyEnemy(ctx, id, 20 + (n % nc) * cw, 62 + ((n / nc) | 0) * rh, cw - 78);
      });
    }
  }

  /* ---------------- condecoraciones: de a ocho por página ---------------- */
  function drawLogrosC(ctx) {
    var L = TD.Logros, tab = UI.logTab, T = L.TIERS[tab], all = L.total(), n, items = [], per = 8;
    D.parchment(ctx);
    UI.button(ctx, 10, 7, 108, 38, '← Volver', function () { UI.go(UI.logBack); }, { size: 15 });
    if (W >= 1000) D.text(ctx, 'Condecoraciones', 132, 35, 24, D.INK, 'left', true);
    L.TIERS.forEach(function (tr, k) {
      var c = L.count(k), x = W - 10 - (3 - k) * 172 + 6;
      UI.button(ctx, x, 7, 166, 38, '', function () { UI.logTab = k; UI.logPage = 0; }, { active: tab === k });
      L.medal(ctx, x + 20, 32, 0.34, k, 'granada', true);
      fit(ctx, tr.name + ' · ' + c.got + ' / ' + c.total, x + 38, 32, 120, 15, D.INK, 'left', true);
      if (c.fresh) badge(ctx, x + 162, 11, c.fresh);
    });

    for (n = 0; n < L.list.length; n++) if (L.list[n].tier === tab) items.push(L.list[n]);
    var pages = Math.max(1, Math.ceil(items.length / per)), pg = UI.logPage = TD.clamp(UI.logPage, 0, pages - 1);
    D.panel(ctx, 10, 52, W - 20, 420);
    fit(ctx, 'Medallas ' + T.of + ': las ' + T.kind + ' · ' + all.got + ' de ' + all.total + ' en total', 26, 80, W - 250, 15, D.INK, 'left', true);
    // paginador
    UI.button(ctx, W - 196, 60, 48, 32, '‹', pg > 0 ? function () { UI.logPage = pg - 1; } : null, { size: 24, disabled: pg <= 0 });
    D.text(ctx, (pg + 1) + ' / ' + pages, W - 109, 82, 15, D.INK, 'center', true);
    UI.button(ctx, W - 70, 60, 48, 32, '›', pg < pages - 1 ? function () { UI.logPage = pg + 1; } : null, { size: 24, disabled: pg >= pages - 1 });
    var gap = 6, cw = (W - 20 - 24 - 10) / 2, ch = (420 - 48 - 12 - 3 * gap) / 4;
    items.slice(pg * per, pg * per + per).forEach(function (a, i) {
      logroCard(ctx, a, 22 + (i % 2) * (cw + 10), 100 + ((i / 2) | 0) * (ch + gap), cw, ch);
    });
  }

  /* ---------------- ajustes: dos columnas ---------------- */
  function diffCardC(ctx, key, x, y, w, h) {
    var d = TD.DIFFS[key], cur = TD.diffKey() === key, hov = UI.hover(x, y, w, h);
    D.button(ctx, x, y, w, h, hov, { active: cur, primary: cur });
    if (!cur) ctx.globalAlpha *= 0.8;
    D.diffIcon(ctx, key, x + w / 2, y + 40, cur ? 1.12 : 1, false, cur ? Math.sin(UI.t * 3) * 0.07 : 0);
    if (!cur) ctx.globalAlpha /= 0.8;
    D.text(ctx, d.name, x + w / 2, y + h - 26, 19, D.INK, 'center', true);
    fit(ctx, '«' + d.motto + '»', x + w / 2, y + h - 9, w - 10, 12, D.INK2, 'center', false, true);
    UI.zone(x, y, w, h, function () { UI.setDiff(key); });
  }

  function drawSettingsC(ctx) {
    var A = TD.Audio, S = TD.Save, w = Math.min(W - 20, 900), h = 464, x = W / 2 - w / 2, y = 8;
    var g = UI.screen === 'game' ? UI.game : null, live = g && g.state !== 'won' && g.state !== 'lost';
    var lx = x + 20, lw = 396, rx = lx + lw + 24, rw = x + w - 20 - rx, bw = (rw - 8) / 2;
    dim(ctx, 0.55);
    D.panel(ctx, x, y, w, h);
    D.text(ctx, 'Ajustes', lx, y + 40, 26, D.INK, 'left', true);
    UI.button(ctx, x + w - 150, y + 12, 130, 40, 'Listo', function () { UI.settings = false; }, { primary: true, size: 19 });

    // dificultad
    D.text(ctx, 'Dificultad', lx, y + 76, 17, D.INK, 'left', true);
    TD.DIFF_KEYS.forEach(function (key, n) { diffCardC(ctx, key, lx + n * 134, y + 86, 128, 126); });
    var yy = wrapMax(ctx, TD.diffText(TD.diffKey()), lx, y + 232, lw, 17, 13.5, D.INK, 3, 'left', false, true);
    wrapMax(ctx, live ? 'Rige desde ya. La victoria cuenta con la más baja que usaste.'
      : 'Podés cambiarla cuando quieras, incluso en plena batalla.', lx, yy + 3, lw, 16, 12.5, D.INK2, 1, 'left', false, true);
    UI.button(ctx, lx, y + 318, 194, 40, 'Sacudida: ' + (S.data.shake ? 'sí' : 'no'), function () { S.data.shake = !S.data.shake; S.save(); }, { size: 15 });
    UI.button(ctx, lx + 202, y + 318, 194, 40, 'Números de daño: ' + (S.data.nums ? 'sí' : 'no'), function () { S.data.nums = !S.data.nums; S.save(); }, { size: 14 });
    if (TD.PWA.canFullscreen()) UI.button(ctx, lx, y + 366, lw, 40, fsLabel(), TD.PWA.toggleFullscreen, { size: 15 });

    // sonido
    D.text(ctx, 'Efectos de sonido', rx, y + 76, 17, D.INK, 'left', true);
    slider(ctx, rx + 56, y + 110, rw - 176, A.sfxVol, A.setSfxVol, function () { A.saveVolumes(); A.play('upgrade'); });
    D.text(ctx, 'Música', rx, y + 164, 17, D.INK, 'left', true);
    slider(ctx, rx + 56, y + 198, rw - 176, A.musVol, A.setMusicVol, function () { A.saveVolumes(); });
    UI.button(ctx, rx, y + 242, bw, 40, 'Sonido: ' + (A.on ? 'sí' : 'no'), function () { A.setOn(!A.on); }, { size: 15 });
    UI.button(ctx, rx + bw + 8, y + 242, bw, 40, 'Música: ' + (A.music ? 'sí' : 'no'), function () { A.setMusic(!A.music); }, { size: 15 });
  }

  /* ---------------- instalar en iPhone / iPad (no hay aviso automático) ---------------- */
  function drawIosHelp(ctx) {
    var w = Math.min(600, W - 40), h = 300, x = W / 2 - w / 2, y = H / 2 - h / 2, yy;
    dim(ctx, 0.6);
    D.panel(ctx, x, y, w, h);
    D.text(ctx, 'Instalar Patria en Armas', W / 2, y + 46, 26, D.INK, 'center', true);
    yy = D.wrap(ctx, '1. Tocá el botón Compartir del navegador (el cuadrado con una flecha hacia arriba).', x + 36, y + 86, w - 72, 22, 16, D.INK, 'left');
    yy = D.wrap(ctx, '2. Elegí «Agregar a inicio».', x + 36, yy + 6, w - 72, 22, 16, D.INK, 'left');
    D.wrap(ctx, '3. Listo: el juego queda en tu pantalla de inicio, con su ícono y a pantalla completa.', x + 36, yy + 6, w - 72, 22, 16, D.INK, 'left');
    UI.button(ctx, W / 2 - 110, y + h - 62, 220, 44, 'Entendido', function () { UI.iosHelp = false; }, { primary: true, size: 19 });
  }

  /* ---------------- dibujo general ---------------- */
  UI.draw = function (ctx) {
    UI.zones.length = 0;
    syncView();
    TF.s = 1; TF.x = 0; TF.y = 0;
    switch (UI.screen) {
      case 'menu': if (C) drawMenuC(ctx); else drawMenu(ctx); break;
      case 'hero': if (C) drawHeroSelectC(ctx); else drawHeroSelect(ctx); break;
      case 'map': if (C) drawMapC(ctx); else drawMap(ctx); break;
      case 'ency': if (C) drawEncyC(ctx); else drawEncy(ctx); break;
      case 'logros': if (C) drawLogrosC(ctx); else drawLogros(ctx); break;
      case 'game': drawGame(ctx); break;
    }
    if (UI.settings) drawSettings(ctx);
    if (UI.iosHelp) drawIosHelp(ctx);
    drawToast(ctx);
    TD.Juice.drawFade(ctx);
  };

  /* ---------------- entrada ---------------- */
  UI.move = function (x, y) {
    UI.mx = x; UI.my = y;
    if (UI.drag && x > -900) applyDrag(x);
  };

  UI.click = function (x, y) {
    var i, z;
    UI.mx = x; UI.my = y;
    syncView();
    TD.Audio.init();
    if (TD.Juice.busy()) return;
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
    if (UI.screen === 'game' && UI.game && !UI.modal && !UI.settings) {
      var wt = worldLayout();
      if (C && (x < wt.ax || x > wt.ax + wt.aw || y < wt.ay || y > wt.ay + wt.ah)) return;
      // con el dedo se perdona la puntería: el radio de toque nunca baja de unos 24 px reales
      var pad = V.touch ? TD.clamp(24 / (V.css * wt.f) - 30, 0, 28) : 0;
      UI.game.click((x - wt.ox) / wt.f, (y - wt.oy) / wt.f, pad);
      if (!UI.game.sel && !UI.game.armed) UI.buildOpen = false;      // tocar el mapa vacío cierra la bandeja
    }
  };

  UI.key = function (key) {
    var g = UI.game, k = key.length === 1 ? key.toLowerCase() : key;
    TD.Audio.init();
    if (TD.Juice.busy()) return;
    if (UI.iosHelp) { if (k === 'Escape' || k === 'Enter') UI.iosHelp = false; return; }
    if (UI.settings) { if (k === 'Escape' || k === 'Enter') UI.settings = false; return; }
    if (UI.screen !== 'game' || !g) {
      if (k === 'Escape') {
        if (UI.screen === 'hero') UI.go(UI.heroBack);
        else if (UI.screen === 'map') UI.go('menu');
        else if (UI.screen === 'ency') UI.go(TD.Save.data.hero ? 'map' : 'menu');
        else if (UI.screen === 'logros') UI.go(UI.logBack);
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
    TD.Logros.init();
    UI.mapSel = Math.min(TD.LEVELS.length - 1, Math.max(0, TD.Save.data.unlocked - 1));
  };
})();
