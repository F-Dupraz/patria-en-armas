/* ============================================================
 * logros.js — condecoraciones (logros): 45 medallas en tres metales
 * (bronce = fáciles, plata = normales, oro = difíciles).
 * Lleva los contadores acumulados entre batallas, decide cuándo se
 * gana cada medalla, encola el aviso en pantalla y sabe dibujarlas.
 * El libro donde se miran vive en ui.js.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD, D = TD.Draw;
  var TAU = Math.PI * 2;

  var L = { list: [], byId: {}, byStat: {}, queue: [], cur: null, dirty: false, TOAST: 3.8 };
  TD.Logros = L;

  // hi / mid / lo: brillo, cuerpo y sombra del metal
  L.TIERS = [
    { name: 'Bronce', of: 'de bronce', kind: 'fáciles',   hi: '#f0c08a', mid: '#b87a3d', lo: '#74461b' },
    { name: 'Plata',  of: 'de plata',  kind: 'normales',  hi: '#f8fafc', mid: '#bfc5cd', lo: '#6f7682' },
    { name: 'Oro',    of: 'de oro',    kind: 'difíciles', hi: '#fff0a6', mid: '#e0ae32', lo: '#8a6412' }
  ];

  /* ---------------- consultas sobre el guardado ---------------- */
  function stat(k) {
    var v = TD.Save.data.stat[k];
    return typeof v === 'number' && isFinite(v) && v > 0 ? v : 0;
  }
  function bits(v) { var n = 0; v = v | 0; while (v) { n += v & 1; v >>>= 1; } return n; }
  function lvlIdx(name) {
    for (var i = 0; i < TD.LEVELS.length; i++) if (TD.LEVELS[i].name === name) return i;
    return -1;
  }
  // Batallas ganadas con dificultad md o mayor (de un acto, o de toda la campaña)
  function won(md, act) {
    var n = 0, i;
    for (i = 0; i < TD.LEVELS.length; i++) {
      if (act != null && TD.LEVELS[i].act !== act) continue;
      if (TD.Save.medal(i) >= md) n++;
    }
    return n;
  }
  function actSize(act) {
    var n = 0, i;
    for (i = 0; i < TD.LEVELS.length; i++) if (TD.LEVELS[i].act === act) n++;
    return n;
  }
  function bestStars() {
    var m = 0, i;
    for (i = 0; i < TD.LEVELS.length; i++) m = Math.max(m, TD.Save.data.stars[String(i)] | 0);
    return m;
  }
  function hard3() {
    var n = 0, i;
    for (i = 0; i < TD.LEVELS.length; i++) if (TD.Save.starsAt(i, 2) >= 3) n++;
    return n;
  }

  /* ---------------- la lista ----------------
   * o.stat + o.n : contador acumulado (kills, cav, oro...)
   * o.prog       : función que devuelve [llevás, hacen falta]
   * sin o        : se otorga por un suceso puntual de la batalla (ver L.onWin) */
  function def(tier, id, icon, name, desc, o) {
    var a = { tier: tier, id: id, icon: icon, name: name, desc: desc, stat: o && o.stat, n: o && o.n, prog: o && o.prog };
    L.list.push(a);
    L.byId[id] = a;
    if (a.stat) (L.byStat[a.stat] = L.byStat[a.stat] || []).push(a);
  }
  function N() { return TD.LEVELS.length; }

  // ----- Bronce: fáciles -----
  def(0, 'bautismo', 'granada', 'Bautismo de fuego', 'Ganá tu primera batalla.', { prog: function () { return [won(0), 1]; } });
  def(0, 'bajas100', 'sables', 'A sable limpio', 'Derrotá 100 enemigos.', { stat: 'kills', n: 100 });
  def(0, 'cab50', 'herradura', 'Freno a la caballería', 'Derrotá 50 enemigos a caballo.', { stat: 'cav', n: 50 });
  def(0, 'jefe1', 'bicornio', 'Cae el capitán', 'Derrotá a tu primer jefe.', { stat: 'bosses', n: 1 });
  def(0, 'obra25', 'martillo', 'Manos a la obra', 'Construí 25 torres.', { stat: 'built', n: 25 });
  def(0, 'rama1', 'torre', 'Tropa de línea', 'Completá una rama de mejoras de una torre.', { stat: 'maxed', n: 1 });
  def(0, 'corneta10', 'corneta', 'Toque de corneta', 'Adelantá 10 oleadas (5 s o más antes).', { stat: 'early', n: 10 });
  def(0, 'est10', 'estrella', 'Estrella federal', 'Juntá 10 estrellas.', { prog: function () { return [TD.Save.totalStars(), 10]; } });
  def(0, 'acto1', 'bandera', 'Buenos Aires no se rinde', 'Completá el Acto I: Invasiones Inglesas.', { prog: function () { return [won(0, 0), actSize(0)]; } });
  def(0, 'oro5k', 'moneda', 'Paga de la tropa', 'Juntá 5.000 de oro entre todas las batallas.', { stat: 'gold', n: 5000 });
  def(0, 'barcos5', 'ancla', 'Agua va', 'Hundí 5 barcos.', { stat: 'ships', n: 5 });
  def(0, 'voz15', 'canon', '¡Fuego a discreción!', 'Usá 15 habilidades de torres o del héroe.', { stat: 'abil', n: 15 });
  def(0, 'expl75', 'bolas', 'Boleados', 'Derrotá 75 exploradores.', { stat: 'expl', n: 75 });
  def(0, 'heroe3', 'galon', 'Jinetas de cabo', 'Llevá a tu héroe al nivel 3 en una batalla.', { prog: function () { return [Math.min(3, Math.max(1, stat('heroLvl'))), 3]; } });
  def(0, 'tres', 'laurel', 'Parte de victoria', 'Ganá una batalla con sus 3 estrellas.', { prog: function () { return [bestStars(), 3]; } });

  // ----- Plata: normales -----
  def(1, 'bajas1000', 'sables', 'Mil y una bajas', 'Derrotá 1.000 enemigos.', { stat: 'kills', n: 1000 });
  def(1, 'cab150', 'herradura', 'Caballería deshecha', 'Derrotá 150 enemigos a caballo.', { stat: 'cav', n: 150 });
  def(1, 'pes150', 'escudo', 'Rompecorazas', 'Derrotá 150 blindados.', { stat: 'heavy', n: 150 });
  def(1, 'elite50', 'galon', 'Bajarles los humos', 'Derrotá 50 élites.', { stat: 'elite', n: 50 });
  def(1, 'barcos40', 'ancla', 'Dueño del río', 'Hundí 40 barcos.', { stat: 'ships', n: 40 });
  def(1, 'jefes12', 'bicornio', 'Una docena de jefes', 'Derrotá 12 jefes.', { stat: 'bosses', n: 12 });
  def(1, 'acto2', 'montana', 'Libertador', 'Completá el Acto II: Guerra de Independencia.', { prog: function () { return [won(0, 1), actSize(1)]; } });
  def(1, 'acto3', 'sol', 'Día de la Soberanía', 'Completá el Acto III y, con él, la campaña.', { prog: function () { return [won(0, 2), actSize(2)]; } });
  def(1, 'est24', 'estrella', 'Constelación', 'Juntá 24 estrellas.', { prog: function () { return [TD.Save.totalStars(), 24]; } });
  def(1, 'normal12', 'granada', 'Como Dios manda', 'Ganá las 12 batallas en normal o en difícil.', { prog: function () { return [won(1), N()]; } });
  def(1, 'intacta', 'corazon', 'Línea intacta', 'Ganá una batalla sin perder ni una vida.');
  def(1, 'arsenal', 'torre', 'Arsenal completo', 'Completá las 8 ramas de mejoras, cada una al menos una vez.', { prog: function () { return [bits(stat('br')), TD.TOWER_KEYS.length * 2]; } });
  def(1, 'estado', 'bandera', 'Estado Mayor', 'Ganá una batalla con cada uno de los tres héroes.', { prog: function () { return [bits(stat('heroWin')), TD.HERO_KEYS.length]; } });
  def(1, 'oro40k', 'moneda', 'Economía de guerra', 'Juntá 40.000 de oro entre todas las batallas.', { stat: 'gold', n: 40000 });
  def(1, 'corneta50', 'corneta', 'Sin respiro', 'Adelantá 50 oleadas (5 s o más antes).', { stat: 'early', n: 50 });
  def(1, 'heroe6', 'galon', 'Foja brillante', 'Llevá a tu héroe al nivel 6, el máximo.', { prog: function () { return [Math.max(1, stat('heroLvl')), 6]; } });
  def(1, 'redoblado', 'corneta', 'A paso redoblado', 'Ganá una batalla adelantando todas sus oleadas.');
  def(1, 'cadenas', 'cadena', 'Las cadenas aguantan', 'Ganá «Las cadenas del Paraná» sin que pase ningún barco.');

  // ----- Oro: difíciles -----
  def(2, 'dificil12', 'sables', 'A sable y coraje', 'Ganá las 12 batallas en difícil.', { prog: function () { return [won(2), N()]; } });
  def(2, 'laureles', 'laurel', 'Laureles eternos', 'Ganá las 12 batallas en difícil y con 3 estrellas.', { prog: function () { return [hard3(), N()]; } });
  def(2, 'est36', 'sol', 'Sol de Mayo', 'Juntá las 36 estrellas.', { prog: function () { return [TD.Save.totalStars(), N() * 3]; } });
  def(2, 'bajas5000', 'bandera', 'Ejército de los Andes', 'Derrotá 5.000 enemigos: tantos como hombres cruzaron la cordillera.', { stat: 'kills', n: 5000 });
  def(2, 'barcos150', 'ancla', 'Almirante de agua dulce', 'Hundí 150 barcos.', { stat: 'ships', n: 150 });
  def(2, 'jefes36', 'escudo', 'Azote de generales', 'Derrotá 36 jefes.', { stat: 'bosses', n: 36 });
  def(2, 'santo', 'bicornio', 'El santo de la espada', 'Derrotá 300 enemigos con tu héroe.', { stat: 'heroKills', n: 300 });
  def(2, 'muralla', 'corazon', 'Muralla criolla', 'Ganá una batalla en difícil sin perder ni una vida.');
  def(2, 'cabral', 'granada', 'Sargento Cabral', 'Ganá «San Lorenzo» en difícil sin que caiga tu héroe.');
  def(2, 'andes', 'montana', 'Hazaña de los Andes', 'Ganá «El Cruce de los Andes» en difícil y con 3 estrellas.', {
    prog: function () { var i = lvlIdx('El Cruce de los Andes'); return [i < 0 ? 0 : TD.Save.starsAt(i, 2), 3]; }
  });
  def(2, 'deguello', 'corneta', 'Toque a degüello', 'Ganá una batalla en difícil adelantando todas sus oleadas.');
  // siempre la última: cuenta a todas las demás
  def(2, 'padre', 'estrella', 'Padre de la Patria', 'Conseguí todas las demás condecoraciones.', {
    prog: function () { return [L.total().got - (L.has('padre') ? 1 : 0), L.list.length - 1]; }
  });

  /* ---------------- estado ---------------- */
  L.has = function (id) { return !!TD.Save.data.ach[id]; };

  // [llevás, hacen falta] o null si la medalla depende de un suceso puntual
  L.progress = function (a) {
    var p;
    if (a.stat) return [Math.min(stat(a.stat), a.n), a.n];
    if (a.prog) { p = a.prog(); p[0] = Math.min(p[0], p[1]); return p; }
    return null;
  };

  // Ganadas, total y recién ganadas (sin mirar) de un metal
  L.count = function (tier) {
    var o = { got: 0, total: 0, fresh: 0 }, i, a, v;
    for (i = 0; i < L.list.length; i++) {
      a = L.list[i];
      if (tier != null && a.tier !== tier) continue;
      o.total++;
      v = TD.Save.data.ach[a.id];
      if (v) { o.got++; if (v === 1) o.fresh++; }
    }
    return o;
  };
  L.total = function () { return L.count(null); };

  // 1.234 (para los contadores grandes)
  L.fmt = function (n) { return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };

  /* ---------------- otorgar ---------------- */
  L.grant = function (id, silent) {
    var d = TD.Save.data;
    if (!L.byId[id] || d.ach[id]) return false;
    d.ach[id] = 1;                      // 1 = nueva · 2 = ya vista en el libro
    if (!silent) L.queue.push(L.byId[id]);
    L.dirty = true;
    return true;
  };

  // Revisa todo lo que se pueda medir. «padre» va última, así que una pasada alcanza.
  L.check = function (silent) {
    var i, a, p, any = false;
    for (i = 0; i < L.list.length; i++) {
      a = L.list[i];
      if (L.has(a.id)) continue;
      p = L.progress(a);
      if (p && p[0] >= p[1] && L.grant(a.id, silent)) any = true;
    }
    if (any) L.flush();
    return any;
  };

  // Los contadores se guardan al terminar la batalla, al salir de ella o al ganar una medalla
  L.flush = function () {
    if (!L.dirty) return;
    L.dirty = false;
    TD.Save.save();
  };

  L.bump = function (k, n) {
    var d = TD.Save.data.stat, l = L.byStat[k], i;
    d[k] = stat(k) + (n == null ? 1 : n);
    L.dirty = true;
    if (!l) return;
    for (i = 0; i < l.length; i++) {
      if (d[k] >= l[i].n && !L.has(l[i].id)) { L.check(); return; }
    }
  };
  // Récord (nivel máximo del héroe)
  L.max = function (k, v) {
    if (v <= stat(k)) return;
    TD.Save.data.stat[k] = v;
    L.dirty = true;
    L.check();
  };
  // Casillero de una colección (ramas completadas, héroes con victoria)
  L.bit = function (k, i) {
    var v = stat(k) | 0;
    if (i < 0 || i > 30 || (v & (1 << i))) return;
    TD.Save.data.stat[k] = v | (1 << i);
    L.dirty = true;
    L.check();
  };

  /* ---------------- sucesos de la batalla ---------------- */
  L.onKill = function (e, byHero) {
    var d = e.def;
    L.bump('kills');
    L.bump('gold', TD.diffGold(e.g.dm, d));
    if (d.boss) L.bump('bosses');
    if (d.naval) L.bump('ships');
    else if (d.look && d.look.kind === 'cav') L.bump('cav');
    if (d.elite) L.bump('elite');
    if (d.trait === 'Blindado') L.bump('heavy');
    if (e.type === 'explorador') L.bump('expl');
    if (byHero) L.bump('heroKills');
  };

  // Se llama al ganar, con estrellas y medallas de dificultad ya anotadas en el guardado
  L.onWin = function (g) {
    var st = g.stats, hard = g.minDiff === 2;
    L.bit('heroWin', TD.HERO_KEYS.indexOf(g.hero.key));
    if (st.leaked === 0) { L.grant('intacta'); if (hard) L.grant('muralla'); }
    if (st.early >= g.lvl.waves.length - 1) { L.grant('redoblado'); if (hard) L.grant('deguello'); }
    if (hard && st.heroDeaths === 0 && g.idx === lvlIdx('San Lorenzo')) L.grant('cabral');
    if (st.navalLeaked === 0 && g.idx === lvlIdx('Las cadenas del Paraná')) L.grant('cadenas');
    L.check();
    L.flush();
  };

  /* ---------------- libro y avisos ---------------- */
  // Marca como vistas las recién ganadas y devuelve cuáles eran (para el cartelito «¡Nueva!»)
  L.markSeen = function () {
    var d = TD.Save.data.ach, out = {}, any = false, i, id;
    for (i = 0; i < L.list.length; i++) {
      id = L.list[i].id;
      if (d[id] === 1) { d[id] = 2; out[id] = true; any = true; }
    }
    if (any) TD.Save.save();
    return out;
  };

  // Al arrancar (y al borrar el progreso). Lo que una partida guardada de antes
  // ya tenía cumplido se otorga sin fanfarria: aparece como nuevo en el libro.
  L.init = function () {
    var d = TD.Save.data, k;
    for (k in d.stat) {
      if (Object.prototype.hasOwnProperty.call(d.stat, k) && !(typeof d.stat[k] === 'number' && isFinite(d.stat[k]) && d.stat[k] >= 0)) delete d.stat[k];
    }
    L.queue.length = 0; L.cur = null; L.dirty = false;
    L.check(true);
  };

  // Avisos: de a uno; si se juntan varios, pasan más rápido
  L.update = function (dt) {
    var c = L.cur;
    if (!c) {
      if (L.queue.length) { L.cur = { a: L.queue.shift(), t: 0 }; TD.Audio.play('medal'); }
      return;
    }
    c.t += dt * (L.queue.length > 1 ? 1.7 : 1);
    if (c.t >= L.TOAST) L.cur = null;
  };

  /* ================================================================
   *                       DIBUJO DE LA MEDALLA
   * ================================================================ */
  // Emblema grabado en el disco: entra en un círculo de radio ~11. c: tinta, hi: brillo del metal.
  function emblem(ctx, icon, c, hi) {
    var i, a, r;
    ctx.fillStyle = c; ctx.strokeStyle = c;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (icon) {
      case 'granada':        // la granada flamígera, insignia de los granaderos
        ctx.beginPath(); ctx.arc(0, 4, 6.3, 0, TAU); ctx.fill();
        ctx.fillRect(-2.3, -4.4, 4.6, 3.4);
        ctx.beginPath();
        ctx.moveTo(-4.2, -4.6); ctx.quadraticCurveTo(-6.6, -9, -2.6, -11.6); ctx.quadraticCurveTo(-3, -8.6, -0.7, -8.3);
        ctx.quadraticCurveTo(-1, -11.4, 1.7, -12.8); ctx.quadraticCurveTo(1.2, -9.8, 3.4, -9);
        ctx.quadraticCurveTo(5.8, -7.6, 4.2, -4.6);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(-2.2, 2, 1.5, 0, TAU); ctx.fill();
        break;
      case 'sables':
        ctx.lineWidth = 2.3;
        ctx.beginPath(); ctx.moveTo(-8, 8); ctx.quadraticCurveTo(2, 2, 8, -9.5); ctx.moveTo(8, 8); ctx.quadraticCurveTo(-2, 2, -8, -9.5); ctx.stroke();
        ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(-9.6, 4.8); ctx.lineTo(-4.8, 9.6); ctx.moveTo(9.6, 4.8); ctx.lineTo(4.8, 9.6); ctx.stroke();
        break;
      case 'estrella':
        ctx.beginPath();
        for (i = 0; i < 10; i++) {
          a = -Math.PI / 2 + i * Math.PI / 5; r = i % 2 === 0 ? 11 : 4.9;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r + 0.6); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r + 0.6);
        }
        ctx.closePath(); ctx.fill();
        break;
      case 'canon':
        ctx.lineCap = 'butt'; ctx.lineWidth = 4.8;
        ctx.beginPath(); ctx.moveTo(-8.5, 0.5); ctx.lineTo(9.5, -6.5); ctx.stroke();
        ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(-2.5, 4.6, 5.6, 0, TAU); ctx.fill();
        ctx.fillStyle = c; ctx.lineWidth = 1.9;
        ctx.beginPath(); ctx.arc(-2.5, 4.6, 5.4, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(-2.5, 4.6, 1.7, 0, TAU); ctx.fill();
        break;
      case 'ancla':
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(0, -8.4, 2.3, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 9.2); ctx.moveTo(-4.8, -2.6); ctx.lineTo(4.8, -2.6); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 1.6, 7.6, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
        break;
      case 'herradura':
        ctx.lineCap = 'butt'; ctx.lineWidth = 4.2;
        ctx.beginPath(); ctx.arc(0, -1, 7.4, 0.32 * Math.PI, 0.68 * Math.PI, true); ctx.stroke();
        ctx.fillStyle = hi;
        for (i = 0; i < 5; i++) { a = Math.PI + i * Math.PI / 4; ctx.beginPath(); ctx.arc(Math.cos(a) * 7.4, -1 + Math.sin(a) * 7.4, 0.95, 0, TAU); ctx.fill(); }
        break;
      case 'moneda':
        ctx.lineWidth = 2.3; ctx.beginPath(); ctx.arc(0, 0, 8.8, 0, TAU); ctx.stroke();
        ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill();
        break;
      case 'corneta':
        ctx.beginPath();
        ctx.moveTo(-9.5, -1.5); ctx.lineTo(3, -1.5); ctx.quadraticCurveTo(7.5, -2.2, 10.5, -7.5); ctx.lineTo(10.5, 7.5);
        ctx.quadraticCurveTo(7.5, 2.2, 3, 1.5); ctx.lineTo(-9.5, 1.5);
        ctx.closePath(); ctx.fill();
        ctx.fillRect(-11.4, -2.6, 2.2, 5.2);
        ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(-2.6, 3.8, 5, 3.3, 0, 0, TAU); ctx.stroke();
        break;
      case 'bicornio':
        ctx.beginPath();
        ctx.moveTo(-11.5, 4.5); ctx.quadraticCurveTo(-6.5, -4.5, 0, -9.5); ctx.quadraticCurveTo(6.5, -4.5, 11.5, 4.5);
        ctx.quadraticCurveTo(0, 0, -11.5, 4.5);
        ctx.closePath(); ctx.fill();
        ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8.5, 7.6); ctx.quadraticCurveTo(0, 3.6, 8.5, 7.6); ctx.stroke();
        ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(0, -3.4, 1.7, 0, TAU); ctx.fill();
        break;
      case 'laurel':
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, 8, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
        for (r = -1; r <= 1; r += 2) {
          for (i = 0; i < 5; i++) {
            a = Math.PI / 2 - r * (0.42 + i * 0.5);
            ctx.beginPath(); ctx.ellipse(Math.cos(a) * 8.4, Math.sin(a) * 8.4, 3.5, 1.6, a - r * 0.75, 0, TAU); ctx.fill();
          }
        }
        break;
      case 'sol':
        ctx.beginPath(); ctx.arc(0, 0, 4.9, 0, TAU); ctx.fill();
        ctx.lineWidth = 1.9;
        for (i = 0; i < 12; i++) {
          a = i * TAU / 12; r = i % 2 ? 9 : 11.2;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6.8, Math.sin(a) * 6.8); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke();
        }
        break;
      case 'corazon':
        r = 8.6;
        ctx.beginPath();
        ctx.moveTo(0, r * 0.95 + 1);
        ctx.bezierCurveTo(-r * 1.3, -r * 0.1 + 1, -r * 0.6, -r * 1.1 + 1, 0, -r * 0.35 + 1);
        ctx.bezierCurveTo(r * 0.6, -r * 1.1 + 1, r * 1.3, -r * 0.1 + 1, 0, r * 0.95 + 1);
        ctx.fill();
        break;
      case 'bandera':
        ctx.lineWidth = 1.9; ctx.beginPath(); ctx.moveTo(-8, -10.5); ctx.lineTo(-8, 10.5); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-8, -9.5); ctx.quadraticCurveTo(-2, -12, 3, -9); ctx.quadraticCurveTo(7, -7, 10.5, -9);
        ctx.lineTo(10.5, 1.5); ctx.quadraticCurveTo(7, 3.5, 3, 1.5); ctx.quadraticCurveTo(-2, -1.5, -8, 1);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = hi; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-6.6, -4.2); ctx.quadraticCurveTo(-2, -6.6, 3, -3.8); ctx.quadraticCurveTo(7, -1.8, 9.4, -3.6); ctx.stroke();
        break;
      case 'torre':
        ctx.beginPath();
        ctx.moveTo(-6, 9.5); ctx.lineTo(-6, -2.5); ctx.lineTo(-8.5, -2.5); ctx.lineTo(-8.5, -9.5); ctx.lineTo(-4.8, -9.5); ctx.lineTo(-4.8, -6.5);
        ctx.lineTo(-1.8, -6.5); ctx.lineTo(-1.8, -9.5); ctx.lineTo(1.8, -9.5); ctx.lineTo(1.8, -6.5); ctx.lineTo(4.8, -6.5); ctx.lineTo(4.8, -9.5);
        ctx.lineTo(8.5, -9.5); ctx.lineTo(8.5, -2.5); ctx.lineTo(6, -2.5); ctx.lineTo(6, 9.5);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = hi;
        ctx.beginPath(); ctx.moveTo(-2.2, 9.5); ctx.lineTo(-2.2, 4.6); ctx.arc(0, 4.6, 2.2, Math.PI, 0); ctx.lineTo(2.2, 9.5); ctx.closePath(); ctx.fill();
        break;
      case 'martillo':
        ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-7.5, 9.5); ctx.lineTo(3, -3); ctx.stroke();
        ctx.save(); ctx.translate(3.6, -3.8); ctx.rotate(-0.876); ctx.fillRect(-2.6, -6.8, 6, 13.6); ctx.restore();
        break;
      case 'galon':
        ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.lineWidth = 2.7;
        for (i = 0; i < 3; i++) { r = -8 + i * 6.2; ctx.beginPath(); ctx.moveTo(-8.5, r + 5.4); ctx.lineTo(0, r); ctx.lineTo(8.5, r + 5.4); ctx.stroke(); }
        break;
      case 'escudo':
        ctx.beginPath();
        ctx.moveTo(-8.5, -9); ctx.lineTo(8.5, -9); ctx.lineTo(8.5, 0); ctx.quadraticCurveTo(8, 7.5, 0, 11); ctx.quadraticCurveTo(-8, 7.5, -8.5, 0);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = hi; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(0, -6.5); ctx.lineTo(0, 7.5); ctx.moveTo(-5.6, -1.8); ctx.lineTo(5.6, -1.8); ctx.stroke();
        break;
      case 'cadena':
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(-4.4, -2.8, 5.8, 3.5, 0.6, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(4.4, 2.8, 5.8, 3.5, 0.6, 0, TAU); ctx.stroke();
        break;
      case 'montana':
        ctx.beginPath(); ctx.moveTo(-11.5, 8); ctx.lineTo(-3.5, -8); ctx.lineTo(1, 0.5); ctx.lineTo(4.5, -4); ctx.lineTo(11.5, 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = hi;
        ctx.beginPath(); ctx.moveTo(-3.5, -8); ctx.lineTo(-6.1, -2.8); ctx.lineTo(-4.2, -4); ctx.lineTo(-2.9, -2.4); ctx.lineTo(-1.2, -3.6); ctx.closePath(); ctx.fill();
        break;
      case 'bolas':
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7.5, -6); ctx.moveTo(0, 0); ctx.lineTo(8, -3.5); ctx.moveTo(0, 0); ctx.lineTo(-1, 8.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(-7.5, -6, 3.2, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -3.5, 3.2, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(-1, 8.5, 2.8, 0, TAU); ctx.fill();
        break;
    }
  }

  function burst(ctx, n, r0, r1) {
    var i, a, r;
    ctx.beginPath();
    for (i = 0; i < n * 2; i++) {
      a = -Math.PI / 2 + i * Math.PI / n; r = i % 2 === 0 ? r1 : r0;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
  }

  /* Medalla con su cinta celeste y blanca. (x, y) es el centro del disco; a escala 1
   * ocupa de y-48 (cinta) a y+19 (y+25 la de oro, por los rayos). El metal da la
   * forma: bronce redonda, plata de canto dentado, oro con rayos de sol.
   * on = false: apagada, todavía sin ganar. */
  L.medal = function (ctx, x, y, s, tier, icon, on) {
    var T = L.TIERS[tier] || L.TIERS[0], g;
    var edge = on ? D.INK : '#7d7054', flat = '#c6ba97';
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineJoin = 'round';
    // cinta
    ctx.beginPath();
    ctx.moveTo(-11, -48); ctx.lineTo(11, -48); ctx.lineTo(11, -28); ctx.lineTo(0, -19.5); ctx.lineTo(-11, -28);
    ctx.closePath();
    ctx.fillStyle = on ? D.CELESTE : '#b6aa8c'; ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = on ? D.BLANCO : '#d2c7a8'; ctx.fillRect(-3.7, -50, 7.4, 34); ctx.restore();
    ctx.strokeStyle = edge; ctx.lineWidth = 1.6; ctx.stroke();
    // anilla
    ctx.strokeStyle = on ? T.lo : edge; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -19, 3, 0, TAU); ctx.stroke();
    // canto según el metal
    if (tier > 0) {
      if (tier === 1) burst(ctx, 16, 17.2, 20.4); else burst(ctx, 12, 16.5, 25);
      ctx.fillStyle = on ? T.mid : flat; ctx.fill();
      ctx.strokeStyle = on ? T.lo : edge; ctx.lineWidth = 1.4; ctx.stroke();
    }
    // disco
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU);
    if (on) {
      g = ctx.createRadialGradient(-5, -6, 2, 0, 0, 18);
      g.addColorStop(0, T.hi); g.addColorStop(0.55, T.mid); g.addColorStop(1, T.lo);
      ctx.fillStyle = g;
    } else ctx.fillStyle = flat;
    ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.strokeStyle = on ? 'rgba(40,25,12,0.4)' : 'rgba(125,112,84,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 13.6, 0, TAU); ctx.stroke();
    emblem(ctx, icon, on ? 'rgba(46,30,14,0.92)' : 'rgba(96,82,58,0.5)', on ? T.hi : flat);
    ctx.restore();
  };
})();
