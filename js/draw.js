/* ============================================================
 * draw.js — primitivas de Canvas 2D: texto, paneles, figuras,
 * jinetes, barcos, banderas, íconos y efectos.
 * Nada de imágenes: todo son rectángulos, arcos, paths y gradientes.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD;
  var D = {};
  TD.Draw = D;

  var TAU = Math.PI * 2;

  // Paleta de época
  D.INK = '#3b2a1a';
  D.INK2 = '#6b5236';
  D.PARCH = '#ead9ad';
  D.PARCH2 = '#d8c28c';
  D.PARCH3 = '#c4a96e';
  D.CELESTE = '#74acdf';
  D.BLANCO = '#f6f2e4';
  D.PUNZO = '#b3142a';
  D.SCARLET = '#cf2b2b';
  D.FRBLUE = '#2b4a9a';
  D.GOLD = '#e0ae32';
  D.GREEN = '#4f8a3c';
  D.FONT = 'Georgia, "Times New Roman", serif';

  /* ---------------- Básicos ---------------- */
  D.rr = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  D.font = function (ctx, size, bold, italic) {
    ctx.font = (italic ? 'italic ' : '') + (bold ? 'bold ' : '') + size + 'px ' + D.FONT;
  };

  D.text = function (ctx, s, x, y, size, color, align, bold, italic) {
    D.font(ctx, size, bold, italic);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color || D.INK;
    ctx.fillText(s, x, y);
  };

  // Texto con contorno (para leerse sobre el mapa)
  D.textO = function (ctx, s, x, y, size, color, align, outline) {
    D.font(ctx, size, true);
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2.5, size / 5);
    ctx.strokeStyle = outline || 'rgba(40,25,12,0.9)';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color || D.BLANCO;
    ctx.fillText(s, x, y);
  };

  // Texto con salto de línea automático. Devuelve la y de la línea siguiente.
  D.wrap = function (ctx, s, x, y, maxW, lh, size, color, align, bold, italic) {
    D.font(ctx, size, bold, italic);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color || D.INK;
    var words = String(s).split(' '), line = '', i;
    for (i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (line && ctx.measureText(test).width > maxW) {
        ctx.fillText(line, x, y);
        y += lh;
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) { ctx.fillText(line, x, y); y += lh; }
    return y;
  };

  D.shadow = function (ctx, x, y, rx, ry) {
    ctx.fillStyle = 'rgba(30,20,10,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
  };

  /* ---------------- Widgets de pergamino ---------------- */
  D.panel = function (ctx, x, y, w, h, alpha) {
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#f0e2bb');
    g.addColorStop(1, '#dcc793');
    ctx.fillStyle = 'rgba(30,20,10,0.35)';
    D.rr(ctx, x + 3, y + 4, w, h, 10); ctx.fill();
    ctx.fillStyle = g;
    D.rr(ctx, x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = D.INK; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(107,82,54,0.55)'; ctx.lineWidth = 1;
    D.rr(ctx, x + 5, y + 5, w - 10, h - 10, 7); ctx.stroke();
    ctx.restore();
  };

  D.button = function (ctx, x, y, w, h, hov, o) {
    o = o || {};
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    if (o.disabled) { g.addColorStop(0, '#cfc3a4'); g.addColorStop(1, '#bdb08e'); }
    else if (o.danger) { g.addColorStop(0, hov ? '#e9b7a0' : '#e0a890'); g.addColorStop(1, hov ? '#d79478' : '#c98568'); }
    else if (o.primary) { g.addColorStop(0, hov ? '#b9d8f2' : '#a5cbea'); g.addColorStop(1, hov ? '#8dbde4' : '#74acdf'); }
    else { g.addColorStop(0, hov ? '#fbf0cf' : '#f0e2bb'); g.addColorStop(1, hov ? '#e6d29f' : '#d6bf88'); }
    ctx.fillStyle = 'rgba(30,20,10,0.3)';
    D.rr(ctx, x + 2, y + 3, w, h, 8); ctx.fill();
    ctx.fillStyle = g;
    D.rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.lineWidth = o.active ? 3.5 : 2;
    ctx.strokeStyle = o.active ? '#2f6ea8' : (o.disabled ? '#8b7a5c' : D.INK);
    ctx.stroke();
  };

  D.star = function (ctx, x, y, r, filled) {
    var i;
    ctx.beginPath();
    for (i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 === 0 ? r : r * 0.45;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = filled ? D.GOLD : 'rgba(107,82,54,0.25)';
    ctx.fill();
    ctx.strokeStyle = D.INK; ctx.lineWidth = Math.max(1, r / 9); ctx.stroke();
  };

  D.coin = function (ctx, x, y, r) {
    ctx.fillStyle = D.GOLD;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7a5a12'; ctx.lineWidth = Math.max(1, r / 5); ctx.stroke();
    ctx.strokeStyle = '#f7dc8a'; ctx.lineWidth = Math.max(1, r / 6);
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.stroke();
  };

  D.heart = function (ctx, x, y, s) {
    ctx.fillStyle = D.PUNZO;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.3, y - s * 0.1, x, y + s * 0.9);
    ctx.fill();
    ctx.strokeStyle = D.INK; ctx.lineWidth = 1.3; ctx.stroke();
  };

  // Sol de Mayo simplificado
  D.sun = function (ctx, x, y, r, t) {
    var i;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((t || 0) * 0.1);
    ctx.fillStyle = D.GOLD; ctx.strokeStyle = '#8a6412'; ctx.lineWidth = Math.max(1, r / 14);
    for (i = 0; i < 16; i++) {
      ctx.rotate(TAU / 16);
      ctx.beginPath();
      if (i % 2 === 0) {
        ctx.moveTo(-r * 0.16, -r * 0.9); ctx.lineTo(0, -r * 1.75); ctx.lineTo(r * 0.16, -r * 0.9);
      } else {
        ctx.moveTo(-r * 0.14, -r * 0.9);
        ctx.quadraticCurveTo(r * 0.3, -r * 1.2, -r * 0.05, -r * 1.4);
        ctx.quadraticCurveTo(r * 0.25, -r * 1.55, 0, -r * 1.7);
        ctx.quadraticCurveTo(r * 0.5, -r * 1.3, r * 0.14, -r * 0.9);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
    // carita
    ctx.fillStyle = '#8a6412';
    ctx.beginPath(); ctx.arc(x - r * 0.33, y - r * 0.15, r * 0.09, 0, TAU); ctx.arc(x + r * 0.33, y - r * 0.15, r * 0.09, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a6412'; ctx.lineWidth = Math.max(1, r / 12);
    ctx.beginPath(); ctx.arc(x, y + r * 0.15, r * 0.35, 0.25, Math.PI - 0.25); ctx.stroke();
  };

  // Bandera patria de la batalla en curso (la fija el Game al empezar; ver TD.flagFor).
  D.natFlag = function () { return window.TD.curFlag || 'arg'; };

  // Banderas: 'arg' (con sol), 'cb' (celeste y blanca sin sol), 'uk', 'fr', 'es', 'punzo'.
  // (x, y) = esquina superior del paño junto al asta.
  D.flag = function (ctx, x, y, w, h, kind, t, dir) {
    dir = dir < 0 ? -1 : 1;
    var wave = Math.sin((t || 0) * 5) * h * 0.12, i;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    function band(y0, y1, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.quadraticCurveTo(w * 0.5, y0 + wave, w, y0 - wave * 0.5);
      ctx.lineTo(w, y1 - wave * 0.5);
      ctx.quadraticCurveTo(w * 0.5, y1 + wave, 0, y1);
      ctx.closePath(); ctx.fill();
    }
    if (kind === 'arg' || kind === 'cb') {
      band(0, h / 3, D.CELESTE); band(h / 3, 2 * h / 3, D.BLANCO); band(2 * h / 3, h, D.CELESTE);
      if (kind === 'arg') {   // el Sol de Mayo se incorporó en 1818
        ctx.fillStyle = D.GOLD; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5 + wave * 0.5, h * 0.12, 0, TAU); ctx.fill();
      }
    } else if (kind === 'fr') {
      for (i = 0; i < 3; i++) {
        ctx.fillStyle = [D.FRBLUE, D.BLANCO, D.SCARLET][i];
        ctx.beginPath();
        ctx.moveTo(w * i / 3, wave * (i / 3)); ctx.lineTo(w * (i + 1) / 3, wave * ((i + 1) / 3) * 0.6);
        ctx.lineTo(w * (i + 1) / 3, h + wave * ((i + 1) / 3) * 0.6); ctx.lineTo(w * i / 3, h + wave * (i / 3));
        ctx.closePath(); ctx.fill();
      }
    } else if (kind === 'uk') {
      band(0, h, D.SCARLET);
      ctx.fillStyle = '#23356b'; ctx.fillRect(0, 0, w * 0.45, h * 0.5);
      ctx.strokeStyle = D.BLANCO; ctx.lineWidth = Math.max(1, h * 0.09);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * 0.45, h * 0.5); ctx.moveTo(w * 0.45, 0); ctx.lineTo(0, h * 0.5);
      ctx.moveTo(w * 0.225, 0); ctx.lineTo(w * 0.225, h * 0.5); ctx.moveTo(0, h * 0.25); ctx.lineTo(w * 0.45, h * 0.25); ctx.stroke();
    } else if (kind === 'es') {
      band(0, h, D.BLANCO);
      ctx.strokeStyle = D.PUNZO; ctx.lineWidth = Math.max(1.2, h * 0.14);
      ctx.beginPath(); ctx.moveTo(1, 1); ctx.lineTo(w - 1, h - 1); ctx.moveTo(w - 1, 1); ctx.lineTo(1, h - 1); ctx.stroke();
    } else {
      band(0, h, D.PUNZO);
    }
    ctx.strokeStyle = 'rgba(40,25,12,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(w * 0.5, wave, w, -wave * 0.5); ctx.lineTo(w, h - wave * 0.5);
    ctx.quadraticCurveTo(w * 0.5, h + wave, 0, h); ctx.closePath(); ctx.stroke();
    ctx.restore();
  };

  // Mástil con bandera; (x, y) es la base del mástil.
  D.flagPole = function (ctx, x, y, hgt, kind, t, w, h, dir) {
    ctx.strokeStyle = '#4a3320'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - hgt); ctx.stroke();
    ctx.fillStyle = D.GOLD; ctx.beginPath(); ctx.arc(x, y - hgt, 1.8, 0, TAU); ctx.fill();
    D.flag(ctx, x, y - hgt + 1, w || 16, h || 10, kind, t, dir);
  };

  /* ---------------- Figuras ---------------- */
  function hat(ctx, o) {
    var c = o.hatc || '#1d1a1a';
    ctx.fillStyle = c; ctx.strokeStyle = 'rgba(20,12,6,0.7)'; ctx.lineWidth = 0.8;
    switch (o.hat) {
      case 'shako':
        ctx.fillRect(-4, -37, 8, 7.5);
        ctx.fillRect(-1, -30.5, 7, 1.6);                       // visera
        ctx.fillStyle = D.GOLD; ctx.fillRect(-1.5, -34.5, 3, 3);   // chapa
        if (o.plume) { ctx.fillStyle = o.plume; ctx.beginPath(); ctx.ellipse(0, -39.5, 1.8, 3, 0, 0, TAU); ctx.fill(); }
        break;
      case 'bicorne':
        ctx.beginPath(); ctx.moveTo(-9, -29); ctx.quadraticCurveTo(-4, -32, 0, -38.5); ctx.quadraticCurveTo(4, -32, 9, -29);
        ctx.quadraticCurveTo(0, -31.5, -9, -29); ctx.closePath(); ctx.fill();
        ctx.fillStyle = D.SCARLET; ctx.beginPath(); ctx.arc(2.5, -32.5, 1.5, 0, TAU); ctx.fill();
        if (o.plume) { ctx.fillStyle = o.plume; ctx.beginPath(); ctx.ellipse(0.5, -39.5, 1.8, 3, 0.2, 0, TAU); ctx.fill(); }
        break;
      case 'morrion':
        ctx.fillStyle = '#16264a';
        ctx.fillRect(-4.2, -39, 8.4, 9.5);
        ctx.fillRect(-1, -30.5, 7.5, 1.6);
        ctx.fillStyle = D.GOLD; ctx.fillRect(-4.2, -32.5, 8.4, 1.5);
        ctx.fillStyle = o.plume || D.SCARLET;
        ctx.beginPath(); ctx.moveTo(1, -39); ctx.quadraticCurveTo(7, -46, 2, -47); ctx.quadraticCurveTo(-1, -44, -1, -39); ctx.closePath(); ctx.fill();
        break;
      case 'gaucho':
        ctx.beginPath(); ctx.ellipse(0, -29.8, 8, 2, 0, 0, TAU); ctx.fill();
        D.rr(ctx, -4, -35, 8, 5.5, 2); ctx.fill();
        break;
      case 'kepi':
        ctx.fillStyle = D.SCARLET; ctx.fillRect(-4, -35.5, 8, 6);
        ctx.fillStyle = '#16264a'; ctx.fillRect(-4, -31, 8, 1.8); ctx.fillRect(-1, -30, 7, 1.5);
        break;
      case 'bearskin':
        ctx.fillStyle = '#17120f';
        ctx.beginPath(); ctx.ellipse(0, -35, 5.2, 8, 0, 0, TAU); ctx.fill();
        if (o.plume) { ctx.fillStyle = o.plume; ctx.beginPath(); ctx.ellipse(4, -38, 1.5, 3.2, 0.3, 0, TAU); ctx.fill(); }
        break;
      case 'gorro':
        ctx.fillStyle = '#4a3a28';
        ctx.beginPath(); ctx.arc(0, -27.5, 4.6, Math.PI, TAU); ctx.fill();
        break;
      default:
        break;
    }
  }

  function weapon(ctx, o, sw, t) {
    ctx.lineCap = 'round';
    switch (o.weapon) {
      case 'musket':
        if (o.aim || sw > 0) {
          var k = o.aim ? -sw * 2.5 : sw * 6;      // retroceso al disparar / estocada de bayoneta
          ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(-1 + k, -17.5); ctx.lineTo(13 + k, -18.5); ctx.stroke();
          ctx.strokeStyle = '#d9d9de'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(13 + k, -18.5); ctx.lineTo(19 + k, -19); ctx.stroke();
        } else {
          ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(2, -11); ctx.lineTo(7, -29); ctx.stroke();
          ctx.strokeStyle = '#d9d9de'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(7, -29); ctx.lineTo(8.5, -35); ctx.stroke();
        }
        break;
      case 'sable':
        var a = -1.25 + sw * 2.3;
        ctx.strokeStyle = o.coat; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(3, -18); ctx.lineTo(3 + Math.cos(a) * 4, -18 + Math.sin(a) * 4); ctx.stroke();
        ctx.strokeStyle = '#e4e4ea'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(3 + Math.cos(a) * 4, -18 + Math.sin(a) * 4);
        ctx.quadraticCurveTo(3 + Math.cos(a + 0.25) * 11, -18 + Math.sin(a + 0.25) * 11, 3 + Math.cos(a) * 17, -18 + Math.sin(a) * 17);
        ctx.stroke();
        break;
      case 'lanza':
        var l = sw * 9;
        ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(-8 + l, -12); ctx.lineTo(18 + l, -24); ctx.stroke();
        ctx.fillStyle = '#d9d9de';
        ctx.beginPath(); ctx.moveTo(18 + l, -24); ctx.lineTo(24 + l, -26.5); ctx.lineTo(19 + l, -21.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = D.PUNZO;
        ctx.beginPath(); ctx.moveTo(14 + l, -22.2); ctx.lineTo(10 + l, -27); ctx.lineTo(10 + l, -20.5); ctx.closePath(); ctx.fill();
        break;
      case 'bolas':
        var sp = (t || 0) * 13;
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(4, -22); ctx.lineTo(5 + Math.cos(sp) * 7, -34 + Math.sin(sp) * 2.5); ctx.stroke();
        ctx.fillStyle = '#cfc8b8';
        ctx.beginPath(); ctx.arc(5 + Math.cos(sp) * 7, -34 + Math.sin(sp) * 2.5, 1.8, 0, TAU);
        ctx.arc(5 + Math.cos(sp + 2.1) * 7, -34 + Math.sin(sp + 2.1) * 2.5, 1.8, 0, TAU); ctx.fill();
        break;
      default:
        break;
    }
  }

  // Torso + cabeza + sombrero + arma. Origen en la cadera (y negativo hacia arriba).
  function torso(ctx, o, sw, t) {
    if (o.cape) {
      ctx.fillStyle = o.cape;
      ctx.beginPath(); ctx.moveTo(-5, -21); ctx.lineTo(-9, -6); ctx.lineTo(-1, -9); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = o.coat;
    D.rr(ctx, -5, -22, 10, 14, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(30,18,8,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    if (o.cuirass) {
      ctx.fillStyle = 'rgba(210,210,220,0.85)';
      D.rr(ctx, -4, -20.5, 8, 8, 2.5); ctx.fill();
      ctx.strokeStyle = 'rgba(60,60,70,0.8)'; ctx.lineWidth = 0.7; ctx.stroke();
    } else if (o.trim) {
      ctx.strokeStyle = o.trim; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-4, -21); ctx.lineTo(4, -10); ctx.moveTo(4, -21); ctx.lineTo(-4, -10); ctx.stroke();
    }
    if (o.sash) { ctx.fillStyle = o.sash; ctx.fillRect(-5, -12.5, 10, 2.6); }
    if (o.poncho) {
      ctx.fillStyle = o.poncho;
      ctx.beginPath(); ctx.moveTo(-7, -22); ctx.lineTo(7, -22); ctx.lineTo(9, -9); ctx.lineTo(0, -5.5); ctx.lineTo(-9, -9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(30,18,8,0.55)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(246,242,228,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-8, -11.5); ctx.lineTo(0, -8); ctx.lineTo(8, -11.5); ctx.stroke();
    }
    if (o.cross) {
      ctx.fillStyle = D.SCARLET; ctx.fillRect(-1, -19.5, 2, 7); ctx.fillRect(-3.5, -17, 7, 2);
    }
    if (o.epaulettes) {
      ctx.fillStyle = D.GOLD; ctx.fillRect(-6.5, -22.5, 3.5, 2.2); ctx.fillRect(3, -22.5, 3.5, 2.2);
    }
    // cabeza
    ctx.fillStyle = o.skin || '#e2b388';
    ctx.beginPath(); ctx.arc(0, -26, 4.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(30,18,8,0.6)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#2a1c12'; ctx.fillRect(1.6, -27, 1.3, 1.5);          // ojo
    if (!o.noHat) hat(ctx, o);
    weapon(ctx, o, sw, t);
  }

  /* Infante. (x, y) = pies. o: coat, pants, hat, trim, weapon, s, face, t, walk, atk (1→0), alpha */
  D.figure = function (ctx, x, y, o) {
    var s = o.s || 1, f = o.face < 0 ? -1 : 1, t = o.t || 0;
    var wk = o.walk ? Math.sin(t * 11) : 0;
    var atk = o.atk || 0;
    var sw = atk > 0 ? Math.sin((1 - atk) * Math.PI) : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f * s * (1 + (o.sq || 0) * 0.6), s * (1 - (o.sq || 0)));
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.lineCap = 'round';
    ctx.translate(o.aim ? 0 : sw * 3, o.walk ? -Math.abs(wk) * 1.3 : 0);
    if (!o.aim) ctx.rotate(sw * 0.2);
    // piernas
    ctx.strokeStyle = o.pants || '#eee'; ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(-2, -9); ctx.lineTo(-2 + wk * 4, -1.5);
    ctx.moveTo(2, -9); ctx.lineTo(2 - wk * 4, -1.5);
    ctx.stroke();
    ctx.strokeStyle = '#2a1c12'; ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(-2 + wk * 4, -1.6); ctx.lineTo(-1.6 + wk * 4, -0.2);
    ctx.moveTo(2 - wk * 4, -1.6); ctx.lineTo(2.4 - wk * 4, -0.2);
    ctx.stroke();
    torso(ctx, o, sw, t);
    ctx.restore();
  };

  /* Jinete. (x, y) = patas del caballo. */
  D.rider = function (ctx, x, y, o) {
    var s = o.s || 1, f = o.face < 0 ? -1 : 1, t = o.t || 0;
    var gph = o.walk ? t * 14 : 0;
    var atk = o.atk || 0;
    var sw = atk > 0 ? Math.sin((1 - atk) * Math.PI) : 0;
    var bob = o.walk ? Math.sin(gph) * 1.6 : 0;
    var i;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f * s * (1 + (o.sq || 0) * 0.6), s * (1 - (o.sq || 0)));
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.lineCap = 'round';
    // patas
    ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2.6;
    var lx = [-9, -5, 6, 10], ph = [0, 2.2, 1.1, 3.3];
    ctx.beginPath();
    for (i = 0; i < 4; i++) {
      var swg = o.walk ? Math.sin(gph + ph[i]) * 5.5 : 0;
      ctx.moveTo(lx[i], -10 + bob); ctx.lineTo(lx[i] + swg, -0.5);
    }
    ctx.stroke();
    // cola
    ctx.strokeStyle = '#1d120a'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-12, -16 + bob); ctx.quadraticCurveTo(-20, -15 + bob, -18 - (o.walk ? 3 : 0), -6 + bob); ctx.stroke();
    // cuerpo
    ctx.fillStyle = o.horse || '#6b4423';
    ctx.beginPath(); ctx.ellipse(0, -14 + bob, 13, 6.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(25,14,6,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    // cuello y cabeza
    ctx.beginPath();
    ctx.moveTo(7, -18 + bob); ctx.lineTo(15, -29 + bob); ctx.lineTo(22, -26 + bob); ctx.lineTo(21, -22.5 + bob); ctx.lineTo(16.5, -22 + bob); ctx.lineTo(13, -12 + bob);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#1d120a'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(8.5, -19 + bob); ctx.lineTo(14.5, -28.5 + bob); ctx.stroke();      // crin
    ctx.fillStyle = '#1d120a'; ctx.fillRect(18.6, -26 + bob, 1.3, 1.4);                             // ojo
    // montura
    ctx.fillStyle = o.saddle || '#3a2a4a';
    D.rr(ctx, -6, -21 + bob, 11, 5, 2); ctx.fill();
    // jinete
    ctx.translate(-1, -12 + bob);
    if (!o.aim) ctx.rotate(sw * 0.15);
    ctx.strokeStyle = o.pants || '#eee'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(3.5, -2); ctx.stroke();
    ctx.strokeStyle = '#2a1c12';
    ctx.beginPath(); ctx.moveTo(3.5, -2.2); ctx.lineTo(4.5, -0.6); ctx.stroke();
    torso(ctx, o, sw, t);
    ctx.restore();
  };

  // Dibuja una unidad según su "look" (infante o jinete)
  D.unit = function (ctx, x, y, o) {
    if (o.kind === 'cav') D.rider(ctx, x, y, o); else D.figure(ctx, x, y, o);
  };

  // Sólo el sombrero, centrado en (x, y) y rotado (para cuando sale volando)
  D.hatAt = function (ctx, x, y, o, rot, s) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s || 1, s || 1);
    ctx.translate(0, 33);
    hat(ctx, o);
    ctx.restore();
  };

  /* Barco. (x, y) = centro en la línea de flotación. o: ship, flag, face, t, s */
  D.ship = function (ctx, x, y, o) {
    var kind = o.ship, t = o.t || 0, f = o.face < 0 ? -1 : 1, s = o.s || 1;
    var L = kind === 'lancha' ? 24 : kind === 'bergantin' ? 36 : kind === 'vapor' ? 42 : 56;
    var H = kind === 'lancha' ? 26 : kind === 'bergantin' ? 40 : kind === 'vapor' ? 40 : 52;
    var masts = kind === 'lancha' ? [0] : kind === 'bergantin' ? [-13, 13] : kind === 'vapor' ? [-22, 24] : [-34, -4, 34];
    var steam = kind === 'vapor' || kind === 'insignia';
    var i;
    // estela
    ctx.save();
    ctx.translate(x, y);
    if (!o.noWake) {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (i = 0; i < 3; i++) {
        var wx = -f * (L + 6 + i * 10 + (t * 14) % 10);
        ctx.moveTo(wx, 5 + i * 1.5); ctx.lineTo(wx - f * 6, 6 + i * 1.5);
      }
      ctx.stroke();
    }
    ctx.translate(0, Math.sin(t * 1.6) * 1.4);
    ctx.scale(f * s, s);
    ctx.rotate(Math.sin(t * 1.1) * 0.02);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    // mástiles y velas (detrás del casco)
    for (i = 0; i < masts.length; i++) {
      var mx = masts[i], mh = H - (i === masts.length - 1 && masts.length > 1 ? 6 : 0);
      ctx.strokeStyle = '#3d2a1c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, -7); ctx.lineTo(mx, -mh - 6); ctx.stroke();
      var sw2 = kind === 'lancha' ? 16 : 20, n = kind === 'lancha' ? 1 : 2, j;
      for (j = 0; j < n; j++) {
        var y0 = -12 - j * (mh - 10) / n, y1 = y0 - (mh - 14) / n, ww = sw2 * (1 - j * 0.22);
        ctx.fillStyle = steam ? '#e2d8bd' : '#efe6cc';
        ctx.beginPath();
        ctx.moveTo(mx - ww / 2, y1); ctx.lineTo(mx + ww / 2, y1);
        ctx.quadraticCurveTo(mx + ww / 2 + 5, (y0 + y1) / 2, mx + ww / 2, y0);
        ctx.lineTo(mx - ww / 2, y0);
        ctx.quadraticCurveTo(mx - ww / 2 + 5, (y0 + y1) / 2, mx - ww / 2, y1);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(60,40,20,0.6)'; ctx.lineWidth = 0.9; ctx.stroke();
      }
    }
    // chimenea
    if (steam) {
      var fx = kind === 'vapor' ? 2 : 16;
      ctx.fillStyle = '#1e1b1a'; ctx.fillRect(fx - 3.5, -30, 7, 23);
      ctx.fillStyle = D.SCARLET; ctx.fillRect(fx - 3.5, -27, 7, 3);
    }
    // casco
    ctx.fillStyle = '#2b1d14';
    ctx.beginPath();
    ctx.moveTo(-L, -9); ctx.lineTo(L + 9, -10);
    ctx.quadraticCurveTo(L + 2, 3, L - 8, 5);
    ctx.lineTo(-L + 6, 5);
    ctx.quadraticCurveTo(-L - 3, 0, -L, -9);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#120b07'; ctx.lineWidth = 1.2; ctx.stroke();
    // franja y troneras
    ctx.fillStyle = '#e3d5a8'; ctx.fillRect(-L + 3, -5.5, 2 * L - 2, 3);
    ctx.fillStyle = '#120b07';
    for (i = -L + 7; i < L - 3; i += 8) ctx.fillRect(i, -5, 2.6, 2.2);
    // bauprés
    ctx.strokeStyle = '#3d2a1c'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(L + 6, -10); ctx.lineTo(L + 17, -15); ctx.stroke();
    // rueda de paletas
    if (steam) {
      var px = kind === 'vapor' ? 2 : 6;
      ctx.fillStyle = '#5a3b22';
      ctx.beginPath(); ctx.arc(px, -1, 9, Math.PI, TAU); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath();
      for (i = 0; i < 5; i++) {
        var a = Math.PI + (i / 4) * Math.PI;
        ctx.moveTo(px, -1); ctx.lineTo(px + Math.cos(a) * 9, -1 + Math.sin(a) * 9);
      }
      ctx.stroke();
    }
    // bandera en popa
    D.flagPole(ctx, -L + 3, -9, 13, o.flag, t, 12, 7.5, -1);
    ctx.restore();
  };

  /* ---------------- Íconos de torres (para botones) ---------------- */
  D.towerIcon = function (ctx, key, x, y, s) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineCap = 'round';
    if (key === 'granaderos') {
      ctx.strokeStyle = '#d9d9de'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-9, 9); ctx.quadraticCurveTo(2, 2, 9, -10); ctx.moveTo(9, 9); ctx.quadraticCurveTo(-2, 2, -9, -10); ctx.stroke();
      ctx.strokeStyle = D.INK; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-9, 9); ctx.quadraticCurveTo(2, 2, 9, -10); ctx.moveTo(9, 9); ctx.quadraticCurveTo(-2, 2, -9, -10); ctx.stroke();
      ctx.strokeStyle = D.GOLD; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(-6, 10); ctx.moveTo(10, 6); ctx.lineTo(6, 10); ctx.stroke();
    } else if (key === 'artilleria') {
      ctx.strokeStyle = '#3a3a3e'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(10, -6); ctx.stroke();
      ctx.fillStyle = '#6b4a2b'; ctx.strokeStyle = D.INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(-3, 6, 6, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-3, 12); ctx.moveTo(-9, 6); ctx.lineTo(3, 6); ctx.stroke();
    } else if (key === 'tiradores') {
      ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(-11, 7); ctx.lineTo(7, -6); ctx.stroke();
      ctx.strokeStyle = '#d9d9de'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(7, -6); ctx.lineTo(13, -10.5); ctx.stroke();
      ctx.strokeStyle = '#3a3a3e'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-5, 2.5); ctx.lineTo(6, -5.5); ctx.stroke();
    } else {
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -7); ctx.moveTo(0, 0); ctx.lineTo(10, -4); ctx.moveTo(0, 0); ctx.lineTo(-1, 10); ctx.stroke();
      ctx.fillStyle = '#cfc8b8'; ctx.strokeStyle = D.INK; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(-9, -7, 3.6, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(10, -4, 3.6, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-1, 10, 3, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  };

  /* ---------------- Efectos ---------------- */
  var RIDER_FX = { kind: 'cav', coat: '#1f3a6e', pants: '#f1ecdc', hat: 'morrion', plume: '#cf2b2b', trim: '#f6f2e4', horse: '#5b3a20', weapon: 'sable', walk: true, t: 0, atk: 0, face: 1, alpha: 1 };
  var GAUCHO_FX = { kind: 'cav', coat: '#8a5a2b', pants: '#3a2a1a', hat: 'gaucho', hatc: '#2a1c12', horse: '#4a2f1c', weapon: 'lanza', poncho: '#b3142a', walk: true, t: 0, atk: 0, face: 1, alpha: 1 };

  D.fx = function (ctx, f) {
    var p = f.t / f.dur, i, a, r;
    if (p < 0) return;
    if (p > 1) p = 1;
    ctx.save();
    switch (f.k) {
      case 'smoke':
        ctx.globalAlpha = (1 - p) * (f.a || 0.55);
        ctx.fillStyle = f.color || '#d8d2c4';
        ctx.beginPath(); ctx.arc(f.x + (f.dx || 0) * p, f.y - (f.rise || 18) * p, (f.r || 5) + (f.grow || 9) * p, 0, TAU); ctx.fill();
        break;
      case 'boom':
        r = f.r * (1 - Math.pow(1 - p, 3));
        ctx.globalAlpha = (1 - p) * 0.85;
        var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, Math.max(1, r));
        if (f.fire) { g.addColorStop(0, '#fff6c9'); g.addColorStop(0.4, '#ff9b2f'); g.addColorStop(1, 'rgba(190,40,20,0)'); }
        else { g.addColorStop(0, '#fff1c4'); g.addColorStop(0.45, '#e9a13c'); g.addColorStop(1, 'rgba(110,80,50,0)'); }
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.72, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = (1 - p) * 0.6;
        ctx.strokeStyle = f.fire ? '#ffb347' : '#8c7046'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, r * 1.05, r * 0.76, 0, 0, TAU); ctx.stroke();
        break;
      case 'flash':
        ctx.globalAlpha = 1 - p;
        ctx.translate(f.x, f.y); ctx.rotate(f.ang || 0);
        ctx.fillStyle = '#fff2b0';
        ctx.beginPath(); ctx.moveTo(0, -3 * (f.s || 1)); ctx.lineTo(12 * (f.s || 1), 0); ctx.lineTo(0, 3 * (f.s || 1)); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff9b2f';
        ctx.beginPath(); ctx.arc(1, 0, 2.6 * (f.s || 1), 0, TAU); ctx.fill();
        break;
      case 'ring':
        ctx.globalAlpha = (1 - p) * (f.a || 0.8);
        ctx.strokeStyle = f.color || D.BLANCO; ctx.lineWidth = f.w || 3;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * p, f.r * p * 0.7, 0, 0, TAU); ctx.stroke();
        break;
      case 'dust':
        ctx.fillStyle = f.color || '#b89a6a';
        for (i = 0; i < 6; i++) {
          a = (f.seed || 0) + i * 1.05;
          ctx.globalAlpha = (1 - p) * 0.5;
          ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * (f.r || 20) * p, f.y + Math.sin(a) * (f.r || 20) * 0.5 * p - 6 * p, 3 + 4 * p, 0, TAU); ctx.fill();
        }
        break;
      case 'splash':
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - p)) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, (f.r || 26) * p, (f.r || 26) * p * 0.4, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = 'rgba(235,245,250,' + (0.85 * (1 - p)) + ')';
        for (i = 0; i < 5; i++) {
          a = -Math.PI / 2 + (i - 2) * 0.35;
          var h = Math.sin(p * Math.PI) * 26;
          ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 14 * p * 2, f.y + Math.sin(a) * h, 2.5, 0, TAU); ctx.fill();
        }
        break;
      case 'tracer':
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = f.color || '#fff6c9'; ctx.lineWidth = f.w || 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
        if (f.w > 3) {
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = f.w * 0.35;
          ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
        }
        break;
      case 'slash':
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * (1 - p) + 1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r || 16, (f.ang || 0) - 0.9 + p * 0.6, (f.ang || 0) + 0.9 + p * 0.6); ctx.stroke();
        break;
      case 'ambush':
        GAUCHO_FX.alpha = p < 0.2 ? p / 0.2 : (p > 0.7 ? (1 - p) / 0.3 : 1);
        GAUCHO_FX.face = f.face; GAUCHO_FX.t = f.t; GAUCHO_FX.walk = false;
        GAUCHO_FX.atk = p < 0.6 ? 1 - p / 0.6 : 0;
        GAUCHO_FX.s = 0.95;
        D.rider(ctx, f.x + f.face * 8 * Math.min(1, p * 3), f.y, GAUCHO_FX);
        break;
      case 'charge':
        for (i = 0; i < 5; i++) {
          RIDER_FX.alpha = Math.min(1, Math.sin(p * Math.PI) * 2.2);
          RIDER_FX.t = f.t + i * 0.3; RIDER_FX.face = f.face || 1; RIDER_FX.atk = (p * 3 + i * 0.3) % 1; RIDER_FX.s = 1.05;
          D.rider(ctx, f.x + (f.face || 1) * (-150 + 300 * p) - i * 9 * (f.face || 1), f.y - 34 + i * 17, RIDER_FX);
        }
        break;
      case 'riders':
        for (i = 0; i < 6; i++) {
          a = f.t * 4.5 + i * TAU / 6;
          GAUCHO_FX.alpha = Math.min(1, Math.sin(p * Math.PI) * 2.5);
          GAUCHO_FX.t = f.t + i; GAUCHO_FX.walk = true; GAUCHO_FX.face = -Math.sin(a) >= 0 ? 1 : -1; GAUCHO_FX.atk = 0; GAUCHO_FX.s = 0.95;
          D.rider(ctx, f.x + Math.cos(a) * f.r * 0.8, f.y + Math.sin(a) * f.r * 0.5, GAUCHO_FX);
        }
        break;
      case 'heal':
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = '#58b24a';
        ctx.fillRect(f.x - 1.5, f.y - 16 * p - 5, 3, 10); ctx.fillRect(f.x - 5, f.y - 16 * p - 1.5, 10, 3);
        break;
      case 'marker':
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = D.CELESTE; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, 16 * (1 - p) + 4, (16 * (1 - p) + 4) * 0.6, 0, 0, TAU); ctx.stroke();
        break;
      case 'flag':
        ctx.globalAlpha = p > 0.8 ? (1 - p) / 0.2 : 1;
        var rise = Math.min(1, p * 5);
        ctx.strokeStyle = 'rgba(116,172,223,0.35)'; ctx.lineWidth = 2;
        for (i = 0; i < 8; i++) {
          a = i * TAU / 8 + f.t * 0.6;
          ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * 20, f.y - 30 + Math.sin(a) * 14); ctx.lineTo(f.x + Math.cos(a) * 46, f.y - 30 + Math.sin(a) * 30); ctx.stroke();
        }
        D.flagPole(ctx, f.x + 12, f.y, 52 * rise, D.natFlag(), f.t, 30, 20, 1);
        break;
      case 'puff':
        ctx.globalAlpha = (1 - p) * 0.7;
        ctx.fillStyle = f.color || '#efe9da';
        for (i = 0; i < 4; i++) {
          a = (f.seed || 0) + i * 1.6;
          ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 9 * p, f.y - 8 + Math.sin(a) * 6 * p - 6 * p, 4 + 3 * p, 0, TAU); ctx.fill();
        }
        break;
      case 'pellets':
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        var bx = f.x2 - f.x, by = f.y2 - f.y;
        for (i = 0; i < 12; i++) {
          var sp = ((i * 37) % 12 - 5.5) / 5.5, q0 = Math.min(1, p * 1.6), q1 = Math.max(0, q0 - 0.18);
          var ox = -by * sp * 0.32, oy = bx * sp * 0.32;
          ctx.beginPath();
          ctx.moveTo(f.x + (bx + ox) * q1, f.y + (by + oy) * q1);
          ctx.lineTo(f.x + (bx + ox) * q0, f.y + (by + oy) * q0);
          ctx.stroke();
        }
        break;
      default:
        break;
    }
    ctx.restore();
  };

  // Barra de vida
  D.hpBar = function (ctx, x, y, w, frac, color) {
    frac = frac < 0 ? 0 : (frac > 1 ? 1 : frac);
    ctx.fillStyle = 'rgba(30,18,8,0.8)';
    ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
    ctx.fillStyle = color || (frac > 0.5 ? '#5cb24a' : frac > 0.25 ? '#e0ae32' : '#cf2b2b');
    ctx.fillRect(x - w / 2, y, w * frac, 3);
  };
})();
