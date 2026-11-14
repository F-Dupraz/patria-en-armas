/* ============================================================
 * art.js — aspecto de las torres (cambia con cada rama y nivel)
 * y fondos de cada temática, pre-renderizados una sola vez.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD, D = TD.Draw;
  var TAU = Math.PI * 2;

  /* ---------------- Solar vacío ---------------- */
  D.slot = function (ctx, x, y, hov, t, armed) {
    ctx.fillStyle = 'rgba(30,20,10,0.22)';
    ctx.beginPath(); ctx.ellipse(x, y + 3, 26, 13, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = hov ? '#d9cdb0' : '#bfb49a';
    ctx.beginPath(); ctx.ellipse(x, y, 24, 12, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = D.INK2; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(107,82,54,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y, 17, 8, 0, 0, TAU); ctx.stroke();
    // estaca con banderín
    ctx.strokeStyle = '#4a3320'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 20); ctx.stroke();
    ctx.fillStyle = armed ? D.GOLD : D.CELESTE;
    var w = Math.sin(t * 4 + x) * 1.5;
    ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + 12, y - 16 + w); ctx.lineTo(x, y - 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40,25,12,0.6)'; ctx.lineWidth = 0.8; ctx.stroke();
    if (hov || armed) {
      ctx.strokeStyle = armed ? 'rgba(224,174,50,0.9)' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, 27 + Math.sin(t * 6) * 1.5, 14 + Math.sin(t * 6), 0, 0, TAU); ctx.stroke();
    }
  };

  /* ---------------- Torres ---------------- */
  var FIG = {};   // objeto reutilizable para dibujar figuras sobre las torres

  function setFig(look, face, t, atk, s) {
    var k;
    for (k in FIG) if (Object.prototype.hasOwnProperty.call(FIG, k)) delete FIG[k];
    for (k in look) if (Object.prototype.hasOwnProperty.call(look, k)) FIG[k] = look[k];
    FIG.face = face; FIG.t = t; FIG.atk = atk; FIG.s = s; FIG.walk = false;
    return FIG;
  }

  function towerTiradores(ctx, tw, b, L, t) {
    var H = 44 + (b === 0 ? L * 3 : 0);
    var Wd = 15 + (b === 1 ? L * 2.5 : 0);
    var i;
    // base de piedra a partir del nivel 2
    if (L >= 2) {
      ctx.fillStyle = '#a09a8e';
      ctx.beginPath(); ctx.moveTo(-19, 7); ctx.lineTo(19, 7); ctx.lineTo(15, -10); ctx.lineTo(-15, -10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5a554c'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-17, -1.5); ctx.lineTo(17, -1.5); ctx.moveTo(-6, 7); ctx.lineTo(-6, -1.5); ctx.moveTo(7, 7); ctx.lineTo(7, -1.5); ctx.moveTo(0, -1.5); ctx.lineTo(0, -10); ctx.stroke();
    }
    // postes del mangrullo
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.moveTo(-13, 5); ctx.lineTo(-9, -H); ctx.moveTo(13, 5); ctx.lineTo(9, -H); ctx.stroke();
    ctx.strokeStyle = '#8a6238'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12.5, -3); ctx.lineTo(9.5, -H + 10); ctx.moveTo(12.5, -3); ctx.lineTo(-9.5, -H + 10);
    ctx.moveTo(-11, -H / 2); ctx.lineTo(11, -H / 2);
    ctx.stroke();
    // escalera
    ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-3, 5); ctx.lineTo(-3, -H); ctx.moveTo(3, 5); ctx.lineTo(3, -H);
    for (i = 0; i < 6; i++) { ctx.moveTo(-3, -2 - i * (H - 6) / 6); ctx.lineTo(3, -2 - i * (H - 6) / 6); }
    ctx.stroke();
    // techo (rama Precisión)
    if (b === 0 && L >= 1) {
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-Wd + 2, -H - 3); ctx.lineTo(-Wd + 2, -H - 30); ctx.moveTo(Wd - 2, -H - 3); ctx.lineTo(Wd - 2, -H - 30); ctx.stroke();
    }
    // tiradores
    var n = b === 1 ? (L >= 3 ? 3 : (L >= 1 ? 2 : 1)) : 1;
    var look = TD.LOOKS.tirador;
    for (i = 0; i < n; i++) {
      var sx = (i - (n - 1) / 2) * 11;
      var o = setFig(look, tw.face, t, (tw.shots % n) === i ? tw.recoil : 0, 0.82);
      if (b === 0 && L >= 1) { o.coat = '#27457d'; o.plume = D.CELESTE; }
      D.figure(ctx, sx, -H - 3, o);
    }
    // plataforma
    ctx.fillStyle = '#8a6238';
    ctx.fillRect(-Wd, -H - 3, Wd * 2, 5);
    ctx.strokeStyle = '#4a3320'; ctx.lineWidth = 1.2; ctx.strokeRect(-Wd, -H - 3, Wd * 2, 5);
    if (b === 1 && L >= 2) {
      // parapeto de bolsas de arena
      ctx.fillStyle = '#cdb98a'; ctx.strokeStyle = '#7a6a45'; ctx.lineWidth = 0.9;
      for (i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.ellipse(-Wd + 4 + i * (Wd * 2 - 8) / 4, -H - 6.5, 5, 3.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
      }
    } else {
      ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-Wd, -H - 3); ctx.lineTo(-Wd, -H - 11); ctx.moveTo(Wd, -H - 3); ctx.lineTo(Wd, -H - 11); ctx.moveTo(-Wd, -H - 10); ctx.lineTo(Wd, -H - 10); ctx.stroke();
    }
    if (b === 0 && L >= 1) {
      ctx.fillStyle = L >= 3 ? '#8a5a2b' : '#b89a4e';
      ctx.beginPath(); ctx.moveTo(-Wd - 4, -H - 29); ctx.lineTo(0, -H - 43); ctx.lineTo(Wd + 4, -H - 29); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5a4a22'; ctx.lineWidth = 1.2; ctx.stroke();
      if (L >= 3) D.flagPole(ctx, 0, -H - 42, 16, 'arg', t, 15, 9, 1);
    }
    if (b === 1 && L >= 3) D.flagPole(ctx, Wd - 1, -H - 4, 26, 'arg', t, 13, 8, 1);
    if (b < 0) {
      ctx.fillStyle = D.CELESTE;
      ctx.beginPath(); ctx.moveTo(-Wd, -H - 11); ctx.lineTo(-Wd - 9, -H - 8); ctx.lineTo(-Wd, -H - 5); ctx.closePath(); ctx.fill();
    }
  }

  function towerArtilleria(ctx, tw, b, L, t) {
    var i;
    var stone = b === 0 && L >= 2;
    var burnt = b === 1 && L >= 2;
    // parapeto
    ctx.fillStyle = stone ? '#a09a8e' : (burnt ? '#5a4a3c' : '#9a7a4c');
    ctx.beginPath();
    ctx.moveTo(-25, 7); ctx.quadraticCurveTo(-28, -13, -13, -15); ctx.lineTo(13, -15); ctx.quadraticCurveTo(28, -13, 25, 7); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = stone ? '#5a554c' : '#4a3320'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (stone) {
      ctx.moveTo(-25, -3); ctx.lineTo(25, -3); ctx.moveTo(-12, 7); ctx.lineTo(-12, -3); ctx.moveTo(4, 7); ctx.lineTo(4, -3); ctx.moveTo(-4, -3); ctx.lineTo(-4, -15); ctx.moveTo(14, -3); ctx.lineTo(13, -14);
    } else {
      for (i = -20; i <= 20; i += 8) { ctx.moveTo(i, 6); ctx.lineTo(i * 0.82, -13); }   // gaviones de mimbre
    }
    ctx.stroke();
    // brasero (rama Fuego)
    if (b === 1 && L >= 1) {
      ctx.fillStyle = '#2e2a28';
      ctx.beginPath(); ctx.moveTo(-27, -6); ctx.lineTo(-15, -6); ctx.lineTo(-17, 3); ctx.lineTo(-25, 3); ctx.closePath(); ctx.fill();
      var fl = 4 + L * 2.5;
      ctx.fillStyle = '#ff9b2f';
      ctx.beginPath(); ctx.moveTo(-26, -6); ctx.quadraticCurveTo(-22 + Math.sin(t * 9) * 2, -6 - fl * 2, -21, -6 - fl * 2.4 - Math.sin(t * 13) * 2); ctx.quadraticCurveTo(-18, -6 - fl, -16, -6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff2b0';
      ctx.beginPath(); ctx.moveTo(-24, -6); ctx.quadraticCurveTo(-21, -6 - fl * 1.2, -20.5, -6 - fl * 1.4); ctx.quadraticCurveTo(-19, -6 - fl * 0.6, -18, -6); ctx.closePath(); ctx.fill();
    }
    // pila de balas
    if (L >= 1) {
      ctx.fillStyle = b === 1 ? '#c0392b' : '#2e2e33';
      for (i = 0; i < Math.min(3, L) + 1; i++) { ctx.beginPath(); ctx.arc(17 + (i % 2) * 5 - (i > 1 ? 2.5 : 0), 3 - (i > 1 ? 4.5 : 0), 2.8, 0, TAU); ctx.fill(); }
    }
    // cañón
    var len = 21 + (b === 0 ? L * 5 : L * 1.5);
    var th = 7 + (b === 0 ? L * 0.7 : L * 1.1);
    ctx.save();
    ctx.translate(0, -19);
    var a = tw.aim;
    // el cañón no apunta hacia abajo dentro del parapeto: se limita visualmente
    ctx.rotate(a);
    ctx.translate(-tw.recoil * 6, 0);
    ctx.fillStyle = b === 1 ? '#2a2422' : '#3a3a3e';
    D.rr(ctx, -9, -th / 2, len + 9, th, 3); ctx.fill();
    ctx.strokeStyle = '#141416'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillRect(len - 3, -th / 2 - 1.2, 3.5, th + 2.4);
    ctx.fillStyle = '#141416'; ctx.beginPath(); ctx.arc(-9, 0, th * 0.42, 0, TAU); ctx.fill();
    if (b === 1) {
      ctx.fillStyle = '#c0392b';
      for (i = 0; i < L; i++) ctx.fillRect(1 + i * 6, -th / 2, 2.5, th);
    } else if (b === 0) {
      ctx.fillStyle = D.GOLD;
      for (i = 0; i < L; i++) ctx.fillRect(2 + i * 9, -th / 2, 1.8, th);
    }
    ctx.restore();
    // rueda
    ctx.fillStyle = '#7d5a36'; ctx.strokeStyle = '#3d2a1c'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(0, -10, 8.5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (i = 0; i < 4; i++) { var ra = i * Math.PI / 4; ctx.moveTo(Math.cos(ra) * 8, -10 + Math.sin(ra) * 8); ctx.lineTo(-Math.cos(ra) * 8, -10 - Math.sin(ra) * 8); }
    ctx.stroke();
    ctx.fillStyle = '#3d2a1c'; ctx.beginPath(); ctx.arc(0, -10, 2.2, 0, TAU); ctx.fill();
    // banderas
    if (L >= 3) D.flagPole(ctx, 22, 2, 38, b === 1 ? 'punzo' : 'arg', t, 16, 10, 1);
    else if (b < 0) { ctx.fillStyle = D.CELESTE; ctx.fillRect(-24, -17, 6, 3); }
  }

  function towerGranaderos(ctx, tw, b, L, t) {
    var W = 22 + (b === 0 ? L * 2 : 0);
    var Ht = 30 + (b === 0 ? L * 4 : 0);
    var i;
    // establo lateral (Asalto 3)
    if (b === 1 && L >= 3) {
      ctx.fillStyle = '#d8c9a8'; ctx.fillRect(W - 2, -20, 16, 24);
      ctx.strokeStyle = D.INK2; ctx.lineWidth = 1.2; ctx.strokeRect(W - 2, -20, 16, 24);
      ctx.fillStyle = '#a8452f'; ctx.beginPath(); ctx.moveTo(W - 4, -20); ctx.lineTo(W + 16, -20); ctx.lineTo(W + 14, -26); ctx.lineTo(W - 2, -27); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3d2a1c'; D.rr(ctx, W + 1, -13, 10, 17, 4); ctx.fill();
      ctx.fillStyle = '#6b4423'; ctx.beginPath(); ctx.ellipse(W + 6, -7, 3, 4.5, 0.3, 0, TAU); ctx.fill();   // cabeza de caballo
    }
    // muro
    var g = ctx.createLinearGradient(-W, 0, W, 0);
    g.addColorStop(0, '#f3ead2'); g.addColorStop(1, '#d9caa6');
    ctx.fillStyle = g;
    ctx.fillRect(-W, -Ht, W * 2, Ht + 5);
    ctx.strokeStyle = D.INK2; ctx.lineWidth = 1.5; ctx.strokeRect(-W, -Ht, W * 2, Ht + 5);
    ctx.fillStyle = 'rgba(107,82,54,0.35)'; ctx.fillRect(-W, 0, W * 2, 5);
    // puerta
    ctx.fillStyle = '#5a3b22';
    ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-6, -9); ctx.quadraticCurveTo(0, -17, 6, -9); ctx.lineTo(6, 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1; ctx.stroke();
    // ventanas con reja
    ctx.fillStyle = '#3d2a1c';
    ctx.fillRect(-W + 5, -Ht + 9, 6, 8); ctx.fillRect(W - 11, -Ht + 9, 6, 8);
    ctx.strokeStyle = '#1a1008'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-W + 8, -Ht + 9); ctx.lineTo(-W + 8, -Ht + 17); ctx.moveTo(W - 8, -Ht + 9); ctx.lineTo(W - 8, -Ht + 17); ctx.stroke();
    if (b === 0) {
      // Guardia: almenas, torreones, escudo
      ctx.fillStyle = '#e6dabb'; ctx.strokeStyle = D.INK2; ctx.lineWidth = 1;
      for (i = -W; i < W - 2; i += 8) { ctx.fillRect(i, -Ht - 5, 5, 5); ctx.strokeRect(i, -Ht - 5, 5, 5); }
      if (L >= 2) {
        ctx.fillStyle = '#d9caa6'; ctx.fillRect(W - 9, -Ht - 16, 13, 16 + Ht * 0.3); ctx.strokeRect(W - 9, -Ht - 16, 13, 16 + Ht * 0.3);
        ctx.fillStyle = '#e6dabb';
        for (i = 0; i < 3; i++) { ctx.fillRect(W - 9 + i * 5, -Ht - 20, 3, 4); ctx.strokeRect(W - 9 + i * 5, -Ht - 20, 3, 4); }
        ctx.fillStyle = '#3d2a1c'; ctx.fillRect(W - 4, -Ht - 10, 3, 6);
      }
      if (L >= 3) {
        ctx.fillStyle = '#d9caa6'; ctx.fillRect(-W - 4, -Ht - 16, 13, 16 + Ht * 0.3); ctx.strokeRect(-W - 4, -Ht - 16, 13, 16 + Ht * 0.3);
        ctx.fillStyle = '#e6dabb';
        for (i = 0; i < 3; i++) { ctx.fillRect(-W - 4 + i * 5, -Ht - 20, 3, 4); ctx.strokeRect(-W - 4 + i * 5, -Ht - 20, 3, 4); }
        // escudo celeste y blanco sobre la puerta
        ctx.fillStyle = D.CELESTE;
        ctx.beginPath(); ctx.moveTo(-6, -Ht + 6); ctx.lineTo(6, -Ht + 6); ctx.lineTo(6, -Ht + 14); ctx.quadraticCurveTo(0, -Ht + 21, -6, -Ht + 14); ctx.closePath(); ctx.fill();
        ctx.fillStyle = D.BLANCO; ctx.fillRect(-6, -Ht + 10, 12, 3.5);
        ctx.strokeStyle = D.INK; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-6, -Ht + 6); ctx.lineTo(6, -Ht + 6); ctx.lineTo(6, -Ht + 14); ctx.quadraticCurveTo(0, -Ht + 21, -6, -Ht + 14); ctx.closePath(); ctx.stroke();
      }
    } else if (b === 1) {
      // Asalto: techo de tejas, sables cruzados, banderín rojo
      ctx.fillStyle = '#a8452f';
      ctx.beginPath(); ctx.moveTo(-W - 4, -Ht); ctx.lineTo(0, -Ht - 13 - L * 2); ctx.lineTo(W + 4, -Ht); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5a2418'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.lineWidth = 0.8;
      ctx.beginPath(); for (i = -W; i <= W; i += 7) { ctx.moveTo(i, -Ht); ctx.lineTo(i * 0.45, -Ht - (13 + L * 2) * 0.55); } ctx.stroke();
      if (L >= 2) {
        ctx.strokeStyle = '#e4e4ea'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-7, -Ht + 18); ctx.quadraticCurveTo(1, -Ht + 13, 7, -Ht + 5); ctx.moveTo(7, -Ht + 18); ctx.quadraticCurveTo(-1, -Ht + 13, -7, -Ht + 5); ctx.stroke();
        ctx.strokeStyle = D.GOLD; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(-8, -Ht + 16); ctx.lineTo(-5.5, -Ht + 19); ctx.moveTo(8, -Ht + 16); ctx.lineTo(5.5, -Ht + 19); ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#c9b78f'; ctx.fillRect(-W - 2, -Ht - 3, W * 2 + 4, 4);
      ctx.strokeStyle = D.INK2; ctx.lineWidth = 1; ctx.strokeRect(-W - 2, -Ht - 3, W * 2 + 4, 4);
    }
    // bandera
    var top = b === 1 ? -Ht - 13 - L * 2 : -Ht - (b === 0 ? 5 : 3);
    D.flagPole(ctx, b === 1 ? 0 : -W + 4, top, 18 + L * 2, b === 1 && L >= 3 ? 'punzo' : 'arg', t, 14 + L, 9 + L * 0.5, 1);
  }

  function towerGauchos(ctx, tw, b, L, t) {
    var i;
    // ombú (rama Boleadoras 2+), detrás del rancho
    if (b === 0 && L >= 2) {
      ctx.fillStyle = '#5a3b22';
      ctx.beginPath(); ctx.moveTo(-26, 2); ctx.quadraticCurveTo(-22, -20, -24, -34); ctx.lineTo(-15, -34); ctx.quadraticCurveTo(-15, -18, -10, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4f7a34';
      ctx.beginPath(); ctx.arc(-20, -44, 17 + L * 2, 0, TAU); ctx.arc(-6, -50, 12 + L * 2, 0, TAU); ctx.arc(-32, -38, 11 + L, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,220,0.14)';
      ctx.beginPath(); ctx.arc(-24, -50, 9 + L, 0, TAU); ctx.fill();
    }
    // lanzas apiladas (Emboscada 2+)
    if (b === 1 && L >= 2) {
      ctx.lineCap = 'round';
      for (i = 0; i < (L >= 3 ? 4 : 2); i++) {
        ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-22 + i * 3, 4); ctx.lineTo(-26 + i * 5, -46 - (i % 2) * 5); ctx.stroke();
        ctx.fillStyle = D.PUNZO;
        ctx.beginPath(); ctx.moveTo(-26 + i * 5, -44 - (i % 2) * 5); ctx.lineTo(-17 + i * 5, -41 - (i % 2) * 5 + Math.sin(t * 5 + i) * 1.5); ctx.lineTo(-25.5 + i * 5, -37 - (i % 2) * 5); ctx.closePath(); ctx.fill();
      }
    }
    // rancho de adobe
    ctx.fillStyle = b === 1 && L >= 3 ? '#a8845a' : '#c9a36b';
    ctx.fillRect(-16, -18, 32, 23);
    ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 1.3; ctx.strokeRect(-16, -18, 32, 23);
    ctx.fillStyle = '#3d2a1c'; ctx.fillRect(-4, -9, 8, 14);
    ctx.fillRect(7, -12, 5, 5);
    // techo de paja
    ctx.fillStyle = b === 1 && L >= 3 ? '#8a7a3e' : '#b89a4e';
    ctx.beginPath(); ctx.moveTo(-21, -17); ctx.lineTo(0, -36); ctx.lineTo(21, -17); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6b5a22'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.beginPath(); for (i = -16; i <= 16; i += 5) { ctx.moveTo(i, -17); ctx.lineTo(i * 0.4, -29); } ctx.stroke();
    // palenque
    ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(19, 6); ctx.lineTo(19, -7); ctx.moveTo(30, 6); ctx.lineTo(30, -7); ctx.moveTo(17, -5); ctx.lineTo(32, -5); ctx.stroke();
    if (b === 0 && L >= 1) {
      // boleadoras colgadas
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 0.9;
      for (i = 0; i < L; i++) {
        var bx = 21 + i * 4.5;
        ctx.beginPath(); ctx.moveTo(bx, -5); ctx.lineTo(bx - 1.5, 2); ctx.moveTo(bx, -5); ctx.lineTo(bx + 1.5, 3); ctx.stroke();
        ctx.fillStyle = '#cfc8b8';
        ctx.beginPath(); ctx.arc(bx - 1.5, 2.5, 1.8, 0, TAU); ctx.arc(bx + 1.5, 3.5, 1.8, 0, TAU); ctx.fill();
      }
    }
    if (b === 0 && L >= 3) {
      // cráneo de vaca sobre la puerta y banderín celeste
      ctx.fillStyle = D.BLANCO; ctx.beginPath(); ctx.ellipse(0, -14, 3, 3.6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = D.BLANCO; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-3, -15); ctx.quadraticCurveTo(-8, -16, -8, -20); ctx.moveTo(3, -15); ctx.quadraticCurveTo(8, -16, 8, -20); ctx.stroke();
      D.flagPole(ctx, 0, -35, 14, 'arg', t, 13, 8, 1);
    }
    if (b === 1) {
      // pajonal para esconderse
      ctx.lineCap = 'round';
      for (i = 0; i < 6 + L * 4; i++) {
        var gx = -30 + (i * 53 % 62), gh = 9 + (i * 17 % 9) + L * 2;
        ctx.strokeStyle = i % 2 ? '#8a9a45' : '#b3a84f'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(gx, 8); ctx.quadraticCurveTo(gx + Math.sin(t * 2 + i) * 2, 8 - gh * 0.6, gx + Math.sin(t * 2 + i) * 4, 8 - gh); ctx.stroke();
      }
    }
    // gaucho de guardia
    var look = TD.LOOKS.gauchoPie;
    var o = setFig(look, tw.face, t, tw.recoil, 0.95);
    if (b === 1) { o.weapon = 'lanza'; o.poncho = '#7a1f1f'; }
    if (b === 0 && L >= 2) o.poncho = D.CELESTE;
    D.figure(ctx, 25, 9, o);
  }

  D.tower = function (ctx, tw) {
    var x = tw.x, y = tw.y;
    D.shadow(ctx, x, y + 5, 30, 10);
    ctx.save();
    ctx.translate(x, y);
    if (tw.disT > 0) ctx.globalAlpha = 0.75;
    switch (tw.key) {
      case 'tiradores': towerTiradores(ctx, tw, tw.branch, tw.level, tw.anim); break;
      case 'artilleria': towerArtilleria(ctx, tw, tw.branch, tw.level, tw.anim); break;
      case 'granaderos': towerGranaderos(ctx, tw, tw.branch, tw.level, tw.anim); break;
      default: towerGauchos(ctx, tw, tw.branch, tw.level, tw.anim); break;
    }
    ctx.restore();
    // galones de nivel
    if (tw.level > 0) {
      var i;
      for (i = 0; i < tw.level; i++) {
        ctx.fillStyle = D.GOLD; ctx.strokeStyle = D.INK; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 8 + i * 8 - 3.5, y + 13); ctx.lineTo(x - 8 + i * 8, y + 9.5); ctx.lineTo(x - 8 + i * 8 + 3.5, y + 13); ctx.lineTo(x - 8 + i * 8, y + 11.5); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
    }
    if (tw.buffT > 0) {
      ctx.strokeStyle = 'rgba(116,172,223,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y + 4, 30 + Math.sin(tw.anim * 6) * 2, 12, 0, 0, TAU); ctx.stroke();
    }
    if (tw.disT > 0) {
      D.hpBar(ctx, x, y - 70, 34, 1 - tw.disT / 5, '#9a9a9a');
      D.textO(ctx, 'fuera de combate', x, y - 76, 11, '#f0d8c8');
    } else if (tw.hp < tw.maxHp - 1) {
      D.hpBar(ctx, x, y - 70, 34, tw.hp / tw.maxHp, D.CELESTE);
    }
  };

  // Vista previa de torre (para la enciclopedia o botones)
  D.towerPreview = function (ctx, key, branch, level, x, y, s, t) {
    var fake = { x: 0, y: 0, key: key, branch: branch, level: level, anim: t || 0, aim: -0.4, face: 1, recoil: 0, shots: 0, disT: 0, buffT: 0, hp: 1, maxHp: 1 };
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    D.tower(ctx, fake);
    ctx.restore();
  };

  /* ---------------- Fondos ---------------- */
  function distPaths(paths, x, y, navalToo) {
    var best = Infinity, i;
    for (i = 0; i < paths.length; i++) {
      if (paths[i].naval && !navalToo) continue;
      var d = paths[i].nearest(x, y).dist;
      if (d < best) best = d;
    }
    return best;
  }
  function distSlots(slots, x, y) {
    var best = Infinity, i;
    for (i = 0; i < slots.length; i++) {
      var d = TD.dist(x, y, slots[i].x, slots[i].y);
      if (d < best) best = d;
    }
    return best;
  }

  function strokePath(ctx, path, width, color) {
    var i, pts = path.pts;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  function tree(ctx, x, y, r, rnd, dark) {
    ctx.fillStyle = 'rgba(30,20,10,0.22)'; ctx.beginPath(); ctx.ellipse(x + 4, y + 3, r * 0.9, r * 0.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a3b22'; ctx.fillRect(x - 2, y - r * 0.6, 4, r * 0.7);
    ctx.fillStyle = dark ? '#4a6e30' : '#5f8a3a';
    ctx.beginPath(); ctx.arc(x, y - r, r, 0, TAU); ctx.arc(x - r * 0.6, y - r * 0.6, r * 0.7, 0, TAU); ctx.arc(x + r * 0.6, y - r * 0.7, r * 0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,210,0.16)';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 1.25, r * 0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(40,50,20,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y - r, r, 0.2, Math.PI - 0.2); ctx.stroke();
  }

  function house(ctx, x, y, w, h, rnd) {
    var walls = ['#efe6cf', '#e9dcc0', '#f3ead6', '#e3d2b0', '#ead8b8'];
    var tile = rnd() < 0.4;
    ctx.fillStyle = 'rgba(30,20,10,0.25)'; ctx.fillRect(x - w / 2 + 4, y - h / 2 + 5, w, h);
    // techo (vista superior)
    ctx.fillStyle = tile ? (rnd() < 0.5 ? '#a8513a' : '#b55f42') : '#d6c8a4';
    ctx.fillRect(x - w / 2, y - h / 2, w, h * 0.6);
    ctx.strokeStyle = D.INK2; ctx.lineWidth = 1.2; ctx.strokeRect(x - w / 2, y - h / 2, w, h * 0.6);
    var i;
    if (tile) {
      ctx.strokeStyle = 'rgba(90,36,24,0.6)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); for (i = 1; i < 4; i++) { ctx.moveTo(x - w / 2, y - h / 2 + i * h * 0.15); ctx.lineTo(x + w / 2, y - h / 2 + i * h * 0.15); } ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(107,82,54,0.5)'; ctx.lineWidth = 1;
      ctx.strokeRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h * 0.6 - 6);       // azotea con pretil
    }
    // frente
    ctx.fillStyle = walls[(rnd() * walls.length) | 0];
    ctx.fillRect(x - w / 2, y - h / 2 + h * 0.6, w, h * 0.4);
    ctx.strokeStyle = D.INK2; ctx.lineWidth = 1.2; ctx.strokeRect(x - w / 2, y - h / 2 + h * 0.6, w, h * 0.4);
    ctx.fillStyle = '#5a3b22';
    var dx = x - w / 2 + 6 + rnd() * (w - 18);
    ctx.fillRect(dx, y + h / 2 - h * 0.28, 6, h * 0.28);
    ctx.fillStyle = '#3d2a1c';
    for (i = 0; i < 3; i++) {
      var wx = x - w / 2 + 5 + i * (w - 14) / 2;
      if (Math.abs(wx - dx) > 7) ctx.fillRect(wx, y + h / 2 - h * 0.27, 4, h * 0.14);
    }
  }

  function rock(ctx, x, y, r, rnd) {
    ctx.fillStyle = 'rgba(30,20,10,0.2)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 2, r, r * 0.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rnd() < 0.5 ? '#8e877d' : '#7f786f';
    ctx.beginPath();
    ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.6, y - r * 0.8); ctx.lineTo(x + r * 0.1, y - r * 1.1); ctx.lineTo(x + r * 0.8, y - r * 0.6); ctx.lineTo(x + r, y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4f4a44'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.8); ctx.lineTo(x + r * 0.1, y - r * 1.1); ctx.lineTo(x - r * 0.1, y - r * 0.4); ctx.closePath(); ctx.fill();
  }

  function peak(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(30,20,10,0.2)';
    ctx.beginPath(); ctx.ellipse(x + 8, y + 2, w * 0.55, h * 0.12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#857d74';
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6f675f';
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w * 0.1, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f4f0';
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x - w * 0.17, y - h * 0.62); ctx.lineTo(x - w * 0.06, y - h * 0.7); ctx.lineTo(x + w * 0.03, y - h * 0.58); ctx.lineTo(x + w * 0.1, y - h * 0.7); ctx.lineTo(x + w * 0.18, y - h * 0.62);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4f4a44'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w / 2, y); ctx.stroke();
  }

  function grassTuft(ctx, x, y, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x - 5, y - 6); ctx.moveTo(x, y); ctx.lineTo(x, y - 8); ctx.moveTo(x + 3, y); ctx.lineTo(x + 5, y - 6); ctx.stroke();
  }

  D.WATER_Y = 414;      // comienzo del agua en los niveles de río
  D.CLIFF_Y = 392;      // borde de la barranca

  D.background = function (g) {
    var c = document.createElement('canvas');
    c.width = TD.W; c.height = TD.H;
    var ctx = c.getContext('2d');
    var lvl = g.lvl, th = lvl.theme, paths = g.paths, slots = g.slots;
    var rnd = TD.rng(4242 + g.idx * 977);
    var i, x, y, gr;
    var W = TD.W, H = TD.H;

    // --- suelo ---
    gr = ctx.createLinearGradient(0, 0, 0, H);
    if (th === 'ciudad') { gr.addColorStop(0, '#cdb07a'); gr.addColorStop(1, '#bd9d66'); }
    else if (th === 'montana') { gr.addColorStop(0, '#b9b2a8'); gr.addColorStop(1, '#9d968c'); }
    else { gr.addColorStop(0, '#b9be74'); gr.addColorStop(1, '#a3ac60'); }
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // manchas para dar textura de acuarela
    for (i = 0; i < 170; i++) {
      x = rnd() * W; y = rnd() * H;
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,245,200,0.07)' : 'rgba(60,40,10,0.06)';
      ctx.beginPath(); ctx.ellipse(x, y, 20 + rnd() * 60, 10 + rnd() * 30, rnd() * 3, 0, TAU); ctx.fill();
    }

    // --- agua ---
    if (th === 'rio') {
      gr = ctx.createLinearGradient(0, D.WATER_Y, 0, H);
      gr.addColorStop(0, '#8fb3b4'); gr.addColorStop(1, '#5d8fa0');
      ctx.fillStyle = gr; ctx.fillRect(0, D.WATER_Y, W, H - D.WATER_Y);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      for (i = 0; i < 90; i++) {
        x = rnd() * W; y = D.WATER_Y + 14 + rnd() * (H - D.WATER_Y - 20);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10, y - 3, x + 22, y); ctx.stroke();
      }
      // barranca
      gr = ctx.createLinearGradient(0, D.CLIFF_Y, 0, D.WATER_Y + 6);
      gr.addColorStop(0, '#a08453'); gr.addColorStop(1, '#6f5836');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(0, D.CLIFF_Y);
      for (x = 0; x <= W; x += 40) ctx.lineTo(x, D.CLIFF_Y + Math.sin(x * 0.03) * 3);
      ctx.lineTo(W, D.WATER_Y + 4);
      for (x = W; x >= 0; x -= 40) ctx.lineTo(x, D.WATER_Y + 4 + Math.sin(x * 0.05) * 3);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(50,35,15,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); for (x = 6; x < W; x += 13) { ctx.moveTo(x, D.CLIFF_Y + 3); ctx.lineTo(x - 3 + rnd() * 6, D.WATER_Y + 2); } ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, D.WATER_Y + 6); for (x = 0; x <= W; x += 20) ctx.lineTo(x, D.WATER_Y + 6 + Math.sin(x * 0.08) * 2); ctx.stroke();
      // cadenas sobre barcazas
      if (lvl.chainX) {
        var cx = lvl.chainX;
        ctx.strokeStyle = '#2e2a28'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(cx, D.WATER_Y - 6);
        for (y = D.WATER_Y + 26; y < H + 30; y += 46) ctx.quadraticCurveTo(cx - 9, y - 23, cx, y);
        ctx.stroke();
        ctx.setLineDash([3, 3]); ctx.strokeStyle = '#6a625c'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(cx, D.WATER_Y - 6);
        for (y = D.WATER_Y + 26; y < H + 30; y += 46) ctx.quadraticCurveTo(cx - 9, y - 23, cx, y);
        ctx.stroke(); ctx.setLineDash([]);
        for (y = D.WATER_Y + 26; y < H; y += 46) {
          ctx.fillStyle = '#4a3320';
          ctx.beginPath(); ctx.moveTo(cx - 20, y - 4); ctx.lineTo(cx + 20, y - 4); ctx.lineTo(cx + 15, y + 5); ctx.lineTo(cx - 15, y + 5); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1; ctx.stroke();
          ctx.strokeStyle = '#3d2a1c'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(cx, y - 4); ctx.lineTo(cx, y - 15); ctx.stroke();
        }
        // poste de amarre en la costa
        ctx.fillStyle = '#3d2a1c'; ctx.fillRect(cx - 3, D.CLIFF_Y - 12, 6, 14);
      }
    }
    if (th === 'costa') {
      gr = ctx.createLinearGradient(0, 0, 80, 0);
      gr.addColorStop(0, '#5d8fa0'); gr.addColorStop(1, '#8fb3b4');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (y = 0; y <= H; y += 30) ctx.lineTo(58 + Math.sin(y * 0.02) * 14, y);
      ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d9cfa0'; ctx.lineWidth = 6;
      ctx.beginPath(); for (y = 0; y <= H; y += 30) { if (y === 0) ctx.moveTo(58, 0); else ctx.lineTo(58 + Math.sin(y * 0.02) * 14, y); } ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
      for (i = 0; i < 26; i++) { x = rnd() * 40; y = rnd() * H; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 6, y - 3, x + 14, y); ctx.stroke(); }
    }

    // --- caminos de tierra ---
    var edge = th === 'montana' ? '#6f675e' : '#8c7046';
    var fill = th === 'montana' ? '#cfc5b4' : (th === 'ciudad' ? '#dcc594' : '#d2b47c');
    for (i = 0; i < paths.length; i++) if (!paths[i].naval) strokePath(ctx, paths[i], 48, edge);
    for (i = 0; i < paths.length; i++) if (!paths[i].naval) strokePath(ctx, paths[i], 42, fill);
    // huellas / adoquines
    for (i = 0; i < paths.length; i++) {
      if (paths[i].naval) continue;
      var d, tmp = {};
      for (d = 6; d < paths[i].length; d += 9) {
        var p = paths[i].at(d, tmp);
        var off = (rnd() - 0.5) * 34;
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(90,60,25,0.16)' : 'rgba(255,245,210,0.2)';
        ctx.beginPath(); ctx.ellipse(p.x - Math.sin(p.ang) * off, p.y + Math.cos(p.ang) * off, 2 + rnd() * 3, 1.5 + rnd() * 1.5, p.ang, 0, TAU); ctx.fill();
      }
    }

    // --- decorados ---
    if (th === 'ciudad') {
      var gx, gy;
      for (gy = 76; gy < 640; gy += 54) {
        for (gx = 30 + ((gy / 54) | 0) % 2 * 14; gx < W; gx += 66) {
          x = gx + (rnd() - 0.5) * 8; y = gy + (rnd() - 0.5) * 6;
          if (distPaths(paths, x, y) < 60 || distSlots(slots, x, y) < 52) { rnd(); continue; }
          if (rnd() < 0.12) tree(ctx, x, y + 12, 11 + rnd() * 4, rnd, true);
          else house(ctx, x, y, 50 + rnd() * 10, 38 + rnd() * 8, rnd);
        }
      }
    } else if (th === 'montana') {
      for (i = 0; i < 26; i++) {
        x = rnd() * W; y = 90 + rnd() * 540;
        if (distPaths(paths, x, y - 20) < 95 || distPaths(paths, x, y) < 70 || distSlots(slots, x, y - 20) < 85) continue;
        peak(ctx, x, y, 90 + rnd() * 70, 70 + rnd() * 60);
      }
      for (i = 0; i < 90; i++) {
        x = rnd() * W; y = 60 + rnd() * 580;
        if (distPaths(paths, x, y) < 38 || distSlots(slots, x, y) < 40) continue;
        rock(ctx, x, y, 6 + rnd() * 9, rnd);
      }
      for (i = 0; i < 40; i++) {
        x = rnd() * W; y = 60 + rnd() * 580;
        if (distPaths(paths, x, y) < 40) continue;
        ctx.fillStyle = 'rgba(250,250,246,0.55)';
        ctx.beginPath(); ctx.ellipse(x, y, 14 + rnd() * 20, 5 + rnd() * 7, rnd(), 0, TAU); ctx.fill();
      }
    } else {
      var maxY = th === 'rio' ? D.CLIFF_Y - 10 : 640;
      var minX = th === 'costa' ? 90 : 0;
      for (i = 0; i < 260; i++) {
        x = minX + rnd() * (W - minX); y = 56 + rnd() * (maxY - 56);
        if (distPaths(paths, x, y) < 30) continue;
        grassTuft(ctx, x, y, rnd() < 0.5 ? '#7d9146' : '#8f9a4e');
      }
      for (i = 0; i < (th === 'rio' ? 44 : 70); i++) {
        x = minX + rnd() * (W - minX); y = 70 + rnd() * (maxY - 70);
        if (distPaths(paths, x, y) < 52 || distPaths(paths, x, y - 16) < 46 || distSlots(slots, x, y - 8) < 56) continue;
        tree(ctx, x, y, 10 + rnd() * 9, rnd, rnd() < 0.5);
      }
      if (th === 'costa') {
        // convento junto a la salida
        var vx = 0, vy = 0, cand = [[1150, 150], [1140, 590], [900, 110], [640, 100], [880, 600], [400, 100]], ci;
        for (ci = 0; ci < cand.length; ci++) {
          var qx = cand[ci][0], qy = cand[ci][1];
          if (distPaths(paths, qx, qy) > 80 && distPaths(paths, qx - 50, qy + 20) > 60 && distPaths(paths, qx + 50, qy + 20) > 60 &&
              distSlots(slots, qx, qy + 10) > 100 && distSlots(slots, qx - 50, qy + 20) > 60 && distSlots(slots, qx + 50, qy + 20) > 60) { vx = qx; vy = qy; break; }
        }
        if (vx) {
          ctx.fillStyle = 'rgba(30,20,10,0.25)'; ctx.fillRect(vx - 56, vy - 26, 120, 64);
          ctx.fillStyle = '#efe6cf'; ctx.fillRect(vx - 60, vy - 30, 120, 60);
          ctx.strokeStyle = D.INK2; ctx.lineWidth = 1.5; ctx.strokeRect(vx - 60, vy - 30, 120, 60);
          ctx.fillStyle = '#a8513a'; ctx.fillRect(vx - 62, vy - 34, 124, 12); ctx.strokeRect(vx - 62, vy - 34, 124, 12);
          ctx.fillStyle = '#efe6cf'; ctx.fillRect(vx + 30, vy - 74, 26, 44); ctx.strokeRect(vx + 30, vy - 74, 26, 44);
          ctx.fillStyle = '#a8513a'; ctx.beginPath(); ctx.moveTo(vx + 27, vy - 74); ctx.lineTo(vx + 43, vy - 92); ctx.lineTo(vx + 59, vy - 74); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#3d2a1c'; ctx.beginPath(); ctx.arc(vx + 43, vy - 58, 5, Math.PI, TAU); ctx.fillRect(vx + 38, vy - 58, 10, 9); ctx.fill();
          for (i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(vx - 46 + i * 17, vy + 8, 5, Math.PI, TAU); ctx.fill(); ctx.fillRect(vx - 51 + i * 17, vy + 8, 10, 12); }
          ctx.strokeStyle = D.INK; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(vx + 43, vy - 92); ctx.lineTo(vx + 43, vy - 104); ctx.moveTo(vx + 39, vy - 100); ctx.lineTo(vx + 47, vy - 100); ctx.stroke();
        }
        // botes varados en la costa
        for (i = 0; i < paths.length; i++) {
          var sp = paths[i].pts[0];
          ctx.fillStyle = '#4a3320';
          ctx.beginPath(); ctx.moveTo(sp[0] - 34, sp[1] + 14); ctx.lineTo(sp[0] + 6, sp[1] + 14); ctx.lineTo(sp[0] + 1, sp[1] + 24); ctx.lineTo(sp[0] - 30, sp[1] + 24); ctx.closePath(); ctx.fill();
        }
      }
      if (th === 'rio') {
        // botes de desembarco al pie de los caminos que nacen en la costa
        for (i = 0; i < paths.length; i++) {
          if (paths[i].naval) continue;
          var s0 = paths[i].pts[0];
          if (s0[1] > D.CLIFF_Y) {
            ctx.fillStyle = '#4a3320';
            ctx.beginPath(); ctx.moveTo(s0[0] - 22, s0[1] + 12); ctx.lineTo(s0[0] + 22, s0[1] + 12); ctx.lineTo(s0[0] + 16, s0[1] + 22); ctx.lineTo(s0[0] - 16, s0[1] + 22); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }
    }

    // viñeta de pergamino
    gr = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
    gr.addColorStop(0, 'rgba(60,40,15,0)'); gr.addColorStop(1, 'rgba(60,40,15,0.28)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    return c;
  };

  // Fondo de pergamino para menús (se genera una sola vez)
  var menuBg = null;
  D.parchment = function (ctx) {
    if (!menuBg) {
      menuBg = document.createElement('canvas');
      menuBg.width = TD.W; menuBg.height = TD.H;
      var c = menuBg.getContext('2d'), rnd = TD.rng(99), i;
      var gr = c.createRadialGradient(TD.W / 2, TD.H / 2, 100, TD.W / 2, TD.H / 2, 800);
      gr.addColorStop(0, '#f1e3bc'); gr.addColorStop(0.7, '#e2cf9f'); gr.addColorStop(1, '#b99d66');
      c.fillStyle = gr; c.fillRect(0, 0, TD.W, TD.H);
      for (i = 0; i < 260; i++) {
        c.fillStyle = rnd() < 0.5 ? 'rgba(255,250,220,0.08)' : 'rgba(90,60,20,0.05)';
        c.beginPath(); c.ellipse(rnd() * TD.W, rnd() * TD.H, 20 + rnd() * 90, 8 + rnd() * 40, rnd() * 3, 0, TAU); c.fill();
      }
      c.strokeStyle = 'rgba(59,42,26,0.8)'; c.lineWidth = 3; c.strokeRect(14, 14, TD.W - 28, TD.H - 28);
      c.strokeStyle = 'rgba(59,42,26,0.45)'; c.lineWidth = 1; c.strokeRect(22, 22, TD.W - 44, TD.H - 44);
    }
    ctx.drawImage(menuBg, 0, 0);
  };
})();
