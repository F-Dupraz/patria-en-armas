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

  /* ---------------- Figuras ----------------
   * Muñecos articulados: piernas con rodilla, brazos con codo (IK de dos
   * segmentos) y tres vistas: perfil (view 0), de frente (1) y de espaldas (-1).
   * Campos de pose en o (todos opcionales):
   *   face ±1, view, fw (ancho 0..1 para el giro), t, walk, spd
   *   ready (guardia), wind (anticipación 0..1), atk (golpe 1→0), hurt (0..1)
   *   aimUp (0..1 arma al hombro), aimA (elevación en rad, + hacia abajo)
   *   reload (fase 0..1 o <0), pistol (0..1), dizzy                         */
  var SKIN = '#e2b388', BOOT = '#2a1c12', LINE = 'rgba(30,18,8,0.6)';
  var SHADES = {};
  function shade(hex, k) {
    var key = hex + k;
    if (SHADES[key]) return SHADES[key];
    var c = String(hex);
    if (c.charAt(0) !== '#' || c.length !== 7) return (SHADES[key] = c);
    var r = parseInt(c.substr(1, 2), 16), g = parseInt(c.substr(3, 2), 16), b = parseInt(c.substr(5, 2), 16);
    return (SHADES[key] = 'rgb(' + Math.round(r * k) + ',' + Math.round(g * k) + ',' + Math.round(b * k) + ')');
  }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function ease(k) { return k <= 0 ? 0 : (k >= 1 ? 1 : k * k * (3 - 2 * k)); }

  // Miembro de dos segmentos de S a H. bend +1: codo hacia atrás/abajo; -1: rodilla hacia adelante.
  function limb(ctx, sx, sy, hx, hy, l1, l2, bend, color, w) {
    var dx = hx - sx, dy = hy - sy, d = Math.sqrt(dx * dx + dy * dy) || 0.001, L = (l1 + l2) * 0.999;
    if (d > L) { hx = sx + dx / d * L; hy = sy + dy / d * L; d = L; }
    var a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    var h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    var ex = sx + dx / d * a - dy / d * h * bend, ey = sy + dy / d * a + dx / d * h * bend;
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
  }
  function hand(ctx, x, y, c) {
    ctx.fillStyle = c || SKIN;
    ctx.beginPath(); ctx.arc(x, y, 1.45, 0, TAU); ctx.fill();
  }
  function aimUpOf(o) { return o.aimUp != null ? o.aimUp : (o.aim && !o.walk ? 1 : 0); }
  // golpe: entra rápido (0→1 en el primer 25 %) y sale lento
  function strikeK(atk) {
    if (!(atk > 0)) return 0;
    var p = 1 - atk;
    return p < 0.25 ? ease(p / 0.25) : 1 - ease((p - 0.25) / 0.75);
  }

  /* ---------- Sombreros (v: vista) ---------- */
  function hat(ctx, o, v) {
    var c = o.hatc || '#1d1a1a';
    v = v || 0;
    ctx.fillStyle = c; ctx.strokeStyle = 'rgba(20,12,6,0.7)'; ctx.lineWidth = 0.8;
    switch (o.hat) {
      case 'shako':
        ctx.fillRect(-4, -37, 8, 7.5);
        if (v === 0) ctx.fillRect(-1, -30.5, 7, 1.6);                // visera de perfil
        else if (v > 0) { ctx.fillStyle = '#0e0c0c'; ctx.fillRect(-4.6, -30.6, 9.2, 1.7); }
        if (v >= 0) { ctx.fillStyle = D.GOLD; ctx.fillRect(-1.5, -34.5, 3, 3); }   // chapa
        if (o.plume) { ctx.fillStyle = o.plume; ctx.beginPath(); ctx.ellipse(0, -39.5, 1.8, 3, 0, 0, TAU); ctx.fill(); }
        break;
      case 'bicorne':
        if (v === 0) {
          ctx.beginPath(); ctx.moveTo(-9, -29); ctx.quadraticCurveTo(-4, -32, 0, -38.5); ctx.quadraticCurveTo(4, -32, 9, -29);
          ctx.quadraticCurveTo(0, -31.5, -9, -29); ctx.closePath(); ctx.fill();
          ctx.fillStyle = D.SCARLET; ctx.beginPath(); ctx.arc(2.5, -32.5, 1.5, 0, TAU); ctx.fill();
        } else {
          // visto de frente/espalda el bicornio se ve angosto y alto
          ctx.beginPath(); ctx.moveTo(-5.5, -29.5); ctx.quadraticCurveTo(-5, -36, 0, -38.5); ctx.quadraticCurveTo(5, -36, 5.5, -29.5);
          ctx.closePath(); ctx.fill();
          if (v > 0) { ctx.fillStyle = D.SCARLET; ctx.beginPath(); ctx.arc(0, -33.5, 1.6, 0, TAU); ctx.fill(); }
        }
        if (o.plume) { ctx.fillStyle = o.plume; ctx.beginPath(); ctx.ellipse(v ? 0 : 0.5, -39.5, 1.8, 3, v ? 0 : 0.2, 0, TAU); ctx.fill(); }
        break;
      case 'morrion':
        ctx.fillStyle = '#16264a';
        ctx.fillRect(-4.2, -39, 8.4, 9.5);
        if (v === 0) ctx.fillRect(-1, -30.5, 7.5, 1.6);
        else if (v > 0) { ctx.fillStyle = '#0b1530'; ctx.fillRect(-4.8, -30.6, 9.6, 1.7); }
        ctx.fillStyle = D.GOLD; ctx.fillRect(-4.2, -32.5, 8.4, 1.5);
        ctx.fillStyle = o.plume || D.SCARLET;
        if (v === 0) { ctx.beginPath(); ctx.moveTo(1, -39); ctx.quadraticCurveTo(7, -46, 2, -47); ctx.quadraticCurveTo(-1, -44, -1, -39); ctx.closePath(); ctx.fill(); }
        else { ctx.beginPath(); ctx.ellipse(0, -43, 2.1, 4.2, 0, 0, TAU); ctx.fill(); }
        break;
      case 'gaucho':
        ctx.beginPath(); ctx.ellipse(0, -29.8, 8, 2, 0, 0, TAU); ctx.fill();
        D.rr(ctx, -4, -35, 8, 5.5, 2); ctx.fill();
        break;
      case 'kepi':
        ctx.fillStyle = D.SCARLET; ctx.fillRect(-4, -35.5, 8, 6);
        ctx.fillStyle = '#16264a'; ctx.fillRect(-4, -31, 8, 1.8);
        if (v === 0) ctx.fillRect(-1, -30, 7, 1.5); else if (v > 0) ctx.fillRect(-4.6, -30, 9.2, 1.5);
        break;
      case 'bearskin':
        ctx.fillStyle = '#17120f';
        ctx.beginPath(); ctx.ellipse(0, -35, 5.2, 8, 0, 0, TAU); ctx.fill();
        if (o.plume) { ctx.fillStyle = o.plume; ctx.beginPath(); ctx.ellipse(v ? -4 : 4, -38, 1.5, 3.2, v ? -0.3 : 0.3, 0, TAU); ctx.fill(); }
        break;
      case 'gorro':
        ctx.fillStyle = '#4a3a28';
        ctx.beginPath(); ctx.arc(0, -27.5, 4.6, Math.PI, TAU); ctx.fill();
        break;
      default:
        break;
    }
  }

  /* ---------- Torso (común a todas las vistas). Origen en la cadera-pie. ---------- */
  function body(ctx, o, v) {
    if (o.cape && v === 0) {
      ctx.fillStyle = o.cape;
      ctx.beginPath(); ctx.moveTo(-5, -21); ctx.lineTo(-9, -6); ctx.lineTo(-1, -9); ctx.closePath(); ctx.fill();
    } else if (o.cape && v > 0) {
      ctx.fillStyle = o.cape;
      ctx.beginPath(); ctx.moveTo(-5.5, -21); ctx.lineTo(-8, -6); ctx.lineTo(8, -6); ctx.lineTo(5.5, -21); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = o.coat;
    D.rr(ctx, -5, -22, 10, 14, 3); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.stroke();
    if (v < 0) {
      // de espaldas: correaje y mochila (o capa), nada de pechera
      if (o.cape) {
        ctx.fillStyle = o.cape;
        ctx.beginPath(); ctx.moveTo(-5.5, -21.5); ctx.lineTo(5.5, -21.5); ctx.lineTo(8, -5); ctx.lineTo(-8, -5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = LINE; ctx.lineWidth = 0.8; ctx.stroke();
      } else if (o.poncho) {
        ponchoShape(ctx, o);
      } else {
        if (o.trim) { ctx.strokeStyle = o.trim; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-4, -21); ctx.lineTo(4, -10); ctx.moveTo(4, -21); ctx.lineTo(-4, -10); ctx.stroke(); }
        if (o.weapon === 'musket' || o.weapon === 'none') {
          ctx.fillStyle = '#4a3523'; D.rr(ctx, -4, -20.5, 8, 8.5, 1.5); ctx.fill();
          ctx.strokeStyle = 'rgba(20,12,6,0.7)'; ctx.lineWidth = 0.7; ctx.stroke();
          ctx.fillStyle = '#8e2a22'; D.rr(ctx, -4.8, -23, 9.6, 3, 1.5); ctx.fill();          // manta enrollada
        }
      }
      if (o.sash) { ctx.fillStyle = o.sash; ctx.fillRect(-5, -12.5, 10, 2.6); }
      if (o.epaulettes) { ctx.fillStyle = D.GOLD; ctx.fillRect(-6.5, -22.5, 3.5, 2.2); ctx.fillRect(3, -22.5, 3.5, 2.2); }
      return;
    }
    if (o.cuirass) {
      ctx.fillStyle = 'rgba(210,210,220,0.85)';
      D.rr(ctx, -4, -20.5, 8, 8, 2.5); ctx.fill();
      ctx.strokeStyle = 'rgba(60,60,70,0.8)'; ctx.lineWidth = 0.7; ctx.stroke();
    } else if (o.trim) {
      ctx.strokeStyle = o.trim; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-4, -21); ctx.lineTo(4, -10); ctx.moveTo(4, -21); ctx.lineTo(-4, -10); ctx.stroke();
    }
    if (o.sash) { ctx.fillStyle = o.sash; ctx.fillRect(-5, -12.5, 10, 2.6); }
    if (o.poncho) ponchoShape(ctx, o);
    if (o.cross) { ctx.fillStyle = D.SCARLET; ctx.fillRect(-1, -19.5, 2, 7); ctx.fillRect(-3.5, -17, 7, 2); }
    if (o.epaulettes) { ctx.fillStyle = D.GOLD; ctx.fillRect(-6.5, -22.5, 3.5, 2.2); ctx.fillRect(3, -22.5, 3.5, 2.2); }
  }
  function ponchoShape(ctx, o) {
    ctx.fillStyle = o.poncho;
    ctx.beginPath(); ctx.moveTo(-7, -22); ctx.lineTo(7, -22); ctx.lineTo(9, -9); ctx.lineTo(0, -5.5); ctx.lineTo(-9, -9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,18,8,0.55)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(246,242,228,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-8, -11.5); ctx.lineTo(0, -8); ctx.lineTo(8, -11.5); ctx.stroke();
  }
  function head(ctx, o, v, t) {
    ctx.fillStyle = o.skin || SKIN;
    ctx.beginPath(); ctx.arc(0, -26, 4.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 0.8; ctx.stroke();
    var blink = ((t || 0) * 0.37 + (o.s || 1) * 3.1) % 3.7 < 0.07;
    ctx.fillStyle = '#2a1c12';
    if (v < 0) {
      ctx.fillStyle = '#3a2716';                           // pelo de la nuca
      ctx.beginPath(); ctx.arc(0, -26.4, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = o.skin || SKIN; ctx.fillRect(-1.7, -23.4, 3.4, 1.5);
      ctx.fillRect(-4.6, -26.8, 1.1, 2); ctx.fillRect(3.5, -26.8, 1.1, 2);   // orejas
    } else if (v > 0) {
      if (blink) { ctx.fillRect(-2.6, -26.6, 1.6, 0.6); ctx.fillRect(1, -26.6, 1.6, 0.6); }
      else { ctx.fillRect(-2.3, -27, 1.2, 1.5); ctx.fillRect(1.1, -27, 1.2, 1.5); }
      if (o.beard || o.hat === 'gaucho') { ctx.fillStyle = 'rgba(42,28,18,0.75)'; ctx.fillRect(-2.5, -23.6, 5, 1.4); }
    } else {
      if (blink) ctx.fillRect(1.4, -26.4, 1.6, 0.6); else ctx.fillRect(1.6, -27, 1.3, 1.5);
      if (o.beard || o.hat === 'gaucho') { ctx.fillStyle = 'rgba(42,28,18,0.75)'; ctx.fillRect(1.2, -23.8, 3, 1.3); }
    }
    if (!o.noHat) hat(ctx, o, v);
  }

  /* ---------- Armas de perfil: pose de manos + dibujo ---------- */
  var PW = { fx: 0, fy: 0, bx: 0, by: 0, freeB: true, freeF: false };
  var SH_F = [1, -20], SH_B = [-0.6, -20.3];       // hombros (adelante / atrás)

  function musketGeom(o, P) {
    // devuelve culata (x,y), ángulo y largo del fusil según la pose
    var u = ease(P.aimU), bx, by, a, len = 17;
    // al hombro (marcha)
    bx = 2.6; by = -10.5; a = -1.3 + P.sway * 0.05; len = 18.5;
    if (P.ready > 0 && u < 1) {
      // en guardia, bayoneta al frente
      var r = P.ready * (1 - u);
      bx = lerp(bx, -3 - P.wind * 4 + P.str * 8, r); by = lerp(by, -13.5, r); a = lerp(a, -0.18 + P.wind * 0.1 - P.str * 0.08, r);
    }
    if (P.reload >= 0 && u < 0.5) {
      var rl = 1 - u * 2;
      bx = lerp(bx, 5.2, rl); by = lerp(by, -2.5, rl); a = lerp(a, -1.5, rl); len = lerp(len, 19, rl);
    }
    if (u > 0) {
      var aa = P.aimA - P.kick * 0.32;
      bx = lerp(bx, -1.8 - P.kick * 2.4 * Math.cos(aa), u); by = lerp(by, -18.6 - P.kick * 2.4 * Math.sin(aa), u);
      a = lerp(a, aa, u); len = lerp(len, 15.5, u);
    }
    P.mx = bx; P.my = by; P.ma = a; P.ml = len;
  }

  function sideWeapon(ctx, o, P, draw) {
    var w = o.weapon, c, s, a, hx, hy, i;
    PW.freeB = true; PW.freeF = false;
    if (P.pistol > 0) PW.freeB = false;
    switch (w) {
      case 'musket':
        musketGeom(o, P);
        c = Math.cos(P.ma); s = Math.sin(P.ma);
        var u = ease(P.aimU);
        var ff = lerp(0.22, 0.26, u), fb = lerp(0.62, 0.62, u);
        PW.fx = P.mx + c * P.ml * ff; PW.fy = P.my + s * P.ml * ff;
        if (P.reload >= 0 && u < 0.5) {
          // baqueta: la mano de atrás empuja arriba y abajo sobre la boca del caño
          var ram = Math.abs(Math.sin(P.reload * Math.PI * 2));
          var tx = P.mx + c * P.ml, ty = P.my + s * P.ml;
          PW.bx = tx + 0.4; PW.by = ty - 2.5 - ram * 7; PW.freeB = false;
          if (draw) { ctx.strokeStyle = '#9a9a9e'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(PW.bx, PW.by - 1); ctx.lineTo(tx + 0.2, ty + 5); ctx.stroke(); }
        } else if (P.pistol <= 0) {
          PW.bx = P.mx + c * P.ml * fb; PW.by = P.my + s * P.ml * fb; PW.freeB = false;
        }
        if (draw) {
          ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 2.3;
          ctx.beginPath(); ctx.moveTo(P.mx, P.my); ctx.lineTo(P.mx + c * P.ml, P.my + s * P.ml); ctx.stroke();
          ctx.strokeStyle = '#2e2a28'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(P.mx + c * P.ml * 0.45, P.my + s * P.ml * 0.45 - 0.9); ctx.lineTo(P.mx + c * P.ml, P.my + s * P.ml - 0.9); ctx.stroke();
          ctx.strokeStyle = '#d9d9de'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(P.mx + c * P.ml, P.my + s * P.ml); ctx.lineTo(P.mx + c * (P.ml + 6), P.my + s * (P.ml + 6)); ctx.stroke();
        }
        break;
      case 'sable':
        // guardia → alzada → tajo → guardia
        var gx = 5.5, gy = -16.5, ga = -0.75;
        hx = 3.6 + P.sway * 0.4; hy = -14.5; a = -1.35 + P.sway * 0.06;
        if (P.ready > 0) { hx = lerp(hx, gx, P.ready); hy = lerp(hy, gy, P.ready); a = lerp(a, ga, P.ready); }
        if (P.wind > 0) { var wk = ease(P.wind); hx = lerp(hx, -1.5, wk); hy = lerp(hy, -27.5, wk); a = lerp(a, -2.75, wk); }
        if (P.atk > 0) {
          var pp = 1 - P.atk, k;
          if (pp < 0.28) { k = ease(pp / 0.28); hx = lerp(-1.5, 8.5, k); hy = lerp(-27.5, -13.5, k); a = lerp(-2.75, 0.6, k); }
          else { k = ease((pp - 0.28) / 0.72); hx = lerp(8.5, gx, k); hy = lerp(-13.5, gy, k); a = lerp(0.6, P.ready > 0 ? ga : -1.35, k); }
          if (draw && pp < 0.45) {
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * (1 - pp / 0.45)) + ')'; ctx.lineWidth = 3.2;
            ctx.beginPath(); ctx.arc(SH_F[0], SH_F[1], 17, Math.max(-2.6, a - 1.8), a); ctx.stroke();
          }
        }
        PW.fx = hx; PW.fy = hy;
        if (draw) {
          c = Math.cos(a); s = Math.sin(a);
          ctx.strokeStyle = D.GOLD; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(hx - s * 2.2, hy + c * 2.2); ctx.lineTo(hx + s * 2.2, hy - c * 2.2); ctx.stroke();   // guarda
          ctx.strokeStyle = '#e4e4ea'; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(hx, hy);
          ctx.quadraticCurveTo(hx + Math.cos(a + 0.12) * 9, hy + Math.sin(a + 0.12) * 9, hx + c * 15, hy + s * 15); ctx.stroke();
        }
        if (P.ready > 0 && P.pistol <= 0) { PW.bx = -4.5; PW.by = -14.5 + P.wind * -2; PW.freeB = false; }
        break;
      case 'lanza':
        a = (P.cav ? -0.45 : -1.42) + P.sway * 0.04;
        var push = 0;
        hx = 3; hy = -15;
        if (P.ready > 0) { a = lerp(a, -0.22, P.ready); hx = lerp(hx, 2, P.ready); hy = lerp(hy, -16, P.ready); }
        push = -P.wind * 4 + P.str * 9;
        c = Math.cos(a); s = Math.sin(a);
        hx += c * push; hy += s * push;
        PW.fx = hx; PW.fy = hy;
        if (P.pistol <= 0 && (P.ready > 0 || P.cav)) { PW.bx = hx - c * 7; PW.by = hy - s * 7; PW.freeB = false; }
        if (draw) {
          var L0 = 11, L1 = 21;
          ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(hx - c * L0, hy - s * L0); ctx.lineTo(hx + c * L1, hy + s * L1); ctx.stroke();
          var tx2 = hx + c * L1, ty2 = hy + s * L1;
          ctx.fillStyle = '#d9d9de';
          ctx.beginPath(); ctx.moveTo(tx2 - s * 2.2, ty2 + c * 2.2); ctx.lineTo(tx2 + c * 6.5, ty2 + s * 6.5); ctx.lineTo(tx2 + s * 2.2, ty2 - c * 2.2); ctx.closePath(); ctx.fill();
          var fl = Math.sin((P.t || 0) * 9) * 1.5;
          ctx.fillStyle = D.PUNZO;
          ctx.beginPath(); ctx.moveTo(tx2 - c * 3, ty2 - s * 3); ctx.lineTo(tx2 - c * 8 + s * (4 + fl), ty2 - s * 8 - c * (4 + fl)); ctx.lineTo(tx2 - c * 8, ty2 - s * 8); ctx.closePath(); ctx.fill();
        }
        break;
      case 'bolas':
        var spin = P.wind > 0, thrown = P.atk > 0 && (1 - P.atk) < 0.65;
        if (P.atk > 0 && (1 - P.atk) < 0.3) { var tk = ease((1 - P.atk) / 0.3); hx = lerp(2, 10, tk); hy = lerp(-31, -20, tk); }
        else if (spin) { var sk = ease(Math.min(1, P.wind * 2)); hx = lerp(4, 2, sk); hy = lerp(-13, -31, sk); }
        else { hx = 4 + P.sway * 0.5; hy = -13; }
        PW.fx = hx; PW.fy = hy;
        if (draw && !thrown) {
          ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 0.9; ctx.fillStyle = '#cfc8b8';
          if (spin && hy < -22) {
            var sp = (P.t || 0) * (8 + P.wind * 16);
            for (i = 0; i < 3; i++) {
              var ba = sp + i * TAU / 3, bxx = hx + Math.cos(ba) * 7.5, byy = hy - 2 + Math.sin(ba) * 2.6;
              ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(bxx, byy); ctx.stroke();
              ctx.beginPath(); ctx.arc(bxx, byy, 1.8, 0, TAU); ctx.fill();
            }
          } else {
            var swg = Math.sin((P.t || 0) * 3) * 1.4;
            for (i = 0; i < 2; i++) {
              var dx2 = (i ? 1.6 : -1.2) + swg, dy2 = i ? 6.5 : 5.2;
              ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + dx2, hy + dy2); ctx.stroke();
              ctx.beginPath(); ctx.arc(hx + dx2, hy + dy2, 1.8, 0, TAU); ctx.fill();
            }
          }
        }
        if (spin || P.atk > 0) { PW.bx = 5; PW.by = -14; PW.freeB = P.pistol > 0; }
        break;
      case 'rammer':
        // artillero con atacador: empuja paralelo al caño
        a = P.aimA; c = Math.cos(a); s = Math.sin(a);
        var ram2 = P.reload >= 0 ? Math.sin(P.reload * Math.PI * 2) * 3.5 : 0;
        hx = 5 + c * ram2; hy = -16 + s * ram2;
        PW.fx = hx; PW.fy = hy; PW.bx = hx - c * 6; PW.by = hy - s * 6; PW.freeB = false;
        if (draw) {
          ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(hx - c * 9, hy - s * 9); ctx.lineTo(hx + c * 20, hy + s * 20); ctx.stroke();
          ctx.fillStyle = '#4a3523'; ctx.beginPath(); ctx.arc(hx + c * 20, hy + s * 20, 1.8, 0, TAU); ctx.fill();
        }
        break;
      case 'linstock':
        // botafuego: vara con la mecha encendida, se baja al disparar
        var lo = P.str;
        hx = 5.5 + lo * 2; hy = -15 + lo * 2;
        a = lerp(-1.05, -0.2, lo);
        c = Math.cos(a); s = Math.sin(a);
        PW.fx = hx; PW.fy = hy;
        if (draw) {
          ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(hx - c * 9, hy - s * 9); ctx.lineTo(hx + c * 10, hy + s * 10); ctx.stroke();
          var glow = 0.7 + Math.sin((P.t || 0) * 17) * 0.3;
          ctx.fillStyle = 'rgba(255,155,47,' + glow + ')';
          ctx.beginPath(); ctx.arc(hx + c * 10.5, hy + s * 10.5, 1.6 + glow * 0.6, 0, TAU); ctx.fill();
        }
        break;
      default:
        // sin arma: el cirujano lleva su maletín
        hx = 4.5 + P.sway * 2.5; hy = -11.5;
        if (P.ready > 0) { hx = 6 + P.str * 4; hy = -17; }
        PW.fx = hx; PW.fy = hy;
        if (draw && o.cross && P.ready <= 0) {
          ctx.fillStyle = '#5a3b22'; D.rr(ctx, hx - 2.5, hy + 0.5, 5.5, 4.2, 1); ctx.fill();
          ctx.fillStyle = D.BLANCO; ctx.fillRect(hx - 0.2, hy + 1.3, 1, 2.6); ctx.fillRect(hx - 1.1, hy + 2.1, 2.8, 1);
        }
        break;
    }
  }

  function pistolArm(ctx, o, P) {
    var a = P.aimA - P.kick * 0.4, k = ease(P.pistol);
    var hx = lerp(-1, SH_B[0] + Math.cos(a) * 10.6, k), hy = lerp(-11, SH_B[1] + Math.sin(a) * 10.6, k);
    limb(ctx, SH_B[0], SH_B[1], hx, hy, 5.6, 5.6, 1, shade(o.coat, 0.72), 2.6);
    ctx.strokeStyle = '#2b2522'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(a) * 4.5, hy + Math.sin(a) * 4.5); ctx.stroke();
    ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.sin(a) * 2 - Math.cos(a), hy + Math.cos(a) * 2); ctx.stroke();
    hand(ctx, hx, hy, o.skin);
  }

  // Parte superior de perfil (brazos, torso, cabeza, arma). Coordenadas con origen a la altura de los pies.
  function upperSide(ctx, o, P) {
    var coat = o.coat;
    sideWeapon(ctx, o, P, false);           // calcula dónde van las manos
    var fx = PW.fx, fy = PW.fy, bx = PW.bx, by = PW.by, freeB = PW.freeB;
    // brazo de atrás
    if (P.pistol > 0) pistolArm(ctx, o, P);
    else {
      if (freeB) { bx = SH_B[0] - P.sway * 3.4; by = -10.3 + Math.abs(P.sway) * -0.6; if (P.cav) { bx = 6; by = -15; } }
      limb(ctx, SH_B[0], SH_B[1], bx, by, 5.6, 5.6, 1, shade(coat, 0.72), 2.6);
      hand(ctx, bx, by, o.skin);
      if (P.cav && freeB && P.reins) {
        ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(P.reins[0], P.reins[1]); ctx.stroke();
      }
    }
    body(ctx, o, 0);
    head(ctx, o, 0, P.t);
    sideWeapon(ctx, o, P, true);
    limb(ctx, SH_F[0], SH_F[1], fx, fy, 5.6, 5.6, 1, coat, 2.7);
    hand(ctx, fx, fy, o.skin);
  }

  // Estado de pose a partir de o (objeto reutilizado)
  var P = { t: 0, ph: 0, sway: 0, ready: 0, wind: 0, atk: 0, str: 0, aimU: 0, aimA: 0, kick: 0, reload: -1, pistol: 0, cav: false, reins: null };
  function pose(o) {
    var t = o.t || 0;
    P.t = t; P.ph = t * 11 * (o.spd || 1);
    P.sway = o.walk ? Math.sin(P.ph) : 0;
    P.ready = o.ready ? 1 : 0;
    P.wind = o.wind || 0;
    P.atk = o.atk || 0;
    P.aimU = aimUpOf(o);
    P.aimA = TD.clamp(o.aimA || 0, -0.95, 0.85);
    P.kick = P.aimU > 0.3 ? P.atk : 0;
    P.str = P.kick > 0 ? 0 : strikeK(P.atk);
    if (o.weapon === 'sable' && P.aimU > 0) P.aimU = 0;
    P.reload = o.reload != null && o.reload >= 0 ? o.reload : -1;
    P.pistol = o.pistol || 0;
    if (P.pistol > 0) P.kick = o.atk || 0;
    P.cav = o.kind === 'cav';
    P.reins = null;
    return P;
  }

  /* ---------- Vista de frente / espaldas ---------- */
  function upperFront(ctx, o, P, v) {
    var coat = o.coat, ws = v > 0 ? -1 : 1, i;
    var w = o.weapon, sw = P.sway;
    var back = v < 0;
    // en vista de espaldas el arma va "delante" (sobre la espalda); de frente, al costado
    function arms() {
      for (i = -1; i <= 1; i += 2) {
        var sx = i * 5.2, sy = -20.4;
        var hx, hy;
        if (i === ws && w !== 'none' && w) { hx = ws * 6.6; hy = -14.5; }
        else if (P.cav) { hx = i * 2.6; hy = -14.5; }
        else { hx = i * 6; hy = -11.4 + (i > 0 ? sw : -sw) * 1.3; }
        limb(ctx, sx, sy, hx, hy, 4.7, 4.7, i > 0 ? -1 : 1, i === ws ? coat : shade(coat, 0.86), 2.6);
        hand(ctx, hx, hy, o.skin);
      }
    }
    function weaponF() {
      var x0 = ws * 6.6;
      ctx.lineCap = 'round';
      switch (w) {
        case 'musket':
          ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 2.3;
          ctx.beginPath(); ctx.moveTo(x0 - ws * 0.3, -9.5); ctx.lineTo(x0 + ws * 1.1, -31); ctx.stroke();
          ctx.strokeStyle = '#d9d9de'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(x0 + ws * 1.1, -31); ctx.lineTo(x0 + ws * 1.4, -36.5); ctx.stroke();
          break;
        case 'sable':
          ctx.strokeStyle = D.GOLD; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(x0 - 2, -15.5); ctx.lineTo(x0 + 2, -15.5); ctx.stroke();
          ctx.strokeStyle = '#e4e4ea'; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(x0, -15); ctx.quadraticCurveTo(x0 + ws * 2.5, -22, x0 + ws * 2, -29.5); ctx.stroke();
          break;
        case 'lanza':
          ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(x0, -4); ctx.lineTo(x0 + ws * 1.5, -42); ctx.stroke();
          ctx.fillStyle = '#d9d9de';
          ctx.beginPath(); ctx.moveTo(x0 + ws * 1.5 - 2, -42); ctx.lineTo(x0 + ws * 1.7, -48.5); ctx.lineTo(x0 + ws * 1.5 + 2, -42); ctx.closePath(); ctx.fill();
          ctx.fillStyle = D.PUNZO;
          ctx.beginPath(); ctx.moveTo(x0 + ws * 1.4, -40); ctx.lineTo(x0 + ws * (6 + Math.sin(P.t * 9) * 1.2), -37.5); ctx.lineTo(x0 + ws * 1.3, -35.5); ctx.closePath(); ctx.fill();
          break;
        case 'bolas':
          ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 0.9; ctx.fillStyle = '#cfc8b8';
          var sg = Math.sin(P.t * 3) * 1.3;
          for (i = 0; i < 2; i++) {
            var bx = x0 + (i ? 1.4 : -1.2) + sg, by = -14.5 + (i ? 6.4 : 5.2);
            ctx.beginPath(); ctx.moveTo(x0, -14.5); ctx.lineTo(bx, by); ctx.stroke();
            ctx.beginPath(); ctx.arc(bx, by, 1.8, 0, TAU); ctx.fill();
          }
          break;
        default:
          if (o.cross) {
            ctx.fillStyle = '#5a3b22'; D.rr(ctx, ws * 6.4 - 2.7, -11, 5.5, 4.2, 1); ctx.fill();
          }
          break;
      }
    }
    if (back) {
      body(ctx, o, v); arms(); head(ctx, o, v, P.t); weaponF();
      hand(ctx, ws * 6.6, -14.5, o.skin);
    } else {
      if (o.cape) body(ctx, { cape: o.cape, coat: o.coat }, 1);
      body(ctx, o, v); head(ctx, o, v, P.t); arms(); weaponF();
      if (w && w !== 'none') hand(ctx, ws * 6.6, -14.5, o.skin);
    }
  }

  /* ---------- Infante. (x, y) = pies ---------- */
  D.figure = function (ctx, x, y, o) {
    var s = o.s || 1, f = o.face < 0 ? -1 : 1, v = o.view || 0, sq = o.sq || 0;
    var fw = o.fw == null ? 1 : o.fw;
    var P = pose(o), i;
    ctx.save();
    ctx.translate(x, y);
    if (o.dizzy) ctx.rotate(Math.sin(P.t * 7) * 0.09);
    ctx.scale((v ? 1 : f) * s * fw * (1 + sq * 0.6), s * (1 - sq));
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var hurt = o.hurt || 0;
    var walk = !!o.walk;
    if (v) {
      // ---- de frente / de espaldas ----
      var bob = walk ? -Math.abs(Math.cos(P.ph)) * 1.2 : Math.sin(P.t * 2.3) * 0.25;
      for (i = -1; i <= 1; i += 2) {
        var lift = walk ? Math.max(0, Math.sin(P.ph + (i > 0 ? Math.PI : 0))) * 2.4 : 0;
        var hx0 = i * 2.1, fx0 = i * 2.5;
        ctx.strokeStyle = o.pants || '#eee'; ctx.lineWidth = 3.3;
        ctx.beginPath(); ctx.moveTo(hx0, -9 + bob); ctx.lineTo(fx0, -1.4 - lift); ctx.stroke();
        ctx.strokeStyle = BOOT; ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.moveTo(fx0, -1.6 - lift); ctx.lineTo(fx0 + i * 0.3, -0.2 - lift); ctx.stroke();
      }
      ctx.translate(0, bob);
      if (hurt) ctx.translate(0, -hurt * 1.5);
      upperFront(ctx, o, P, v);
      ctx.restore();
      return;
    }
    // ---- perfil ----
    var ready = P.ready, wind = P.wind, str = P.str, kick = P.kick;
    var aimU = ease(P.aimU);
    var bob2 = walk ? -Math.abs(Math.cos(P.ph)) * 1.3 : (ready ? 1.3 : Math.sin(P.t * 2.3) * 0.25);
    var lean = (walk ? 0.09 : 0) + ready * 0.07 - wind * 0.13 + str * 0.24 - hurt * 0.32;
    lean = lerp(lean, -0.03 - kick * 0.16, aimU);
    var bx = str * 2.6 - hurt * 2.2 - wind * 1.2 - kick * aimU * 1.4;
    // piernas
    var hipY = -9 + bob2;
    for (i = 0; i < 2; i++) {
      var fx, fy;
      if (walk) {
        var phi = P.ph + i * Math.PI;
        fx = Math.sin(phi) * 4.3; fy = -Math.max(0, Math.cos(phi)) * 2.4;
      } else if (ready) {
        fx = i ? 4.2 + str * 3 : -4.4; fy = 0;
      } else {
        fx = i ? 2.1 : -1.7; fy = 0;
      }
      var hpx = (i ? 0.9 : -0.9) + bx * 0.6;
      limb(ctx, hpx, hipY, fx, fy - 1.3, 5, 5, -1, i ? (o.pants || '#eee') : shade(o.pants || '#eeeeee', 0.8), 3.3);
      ctx.strokeStyle = BOOT; ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.moveTo(fx - 0.6, fy - 1.1); ctx.lineTo(fx + 2.1, fy - 0.4); ctx.stroke();
    }
    ctx.translate(bx, bob2);
    ctx.translate(0, -9); ctx.rotate(lean); ctx.translate(0, 9);
    upperSide(ctx, o, P);
    ctx.restore();
  };

  /* ---------- Jinete. (x, y) = patas del caballo ---------- */
  var HLX = [-9, -5, 6, 10], HPH = [0, 2.2, 1.1, 3.3];
  D.rider = function (ctx, x, y, o) {
    var s = o.s || 1, f = o.face < 0 ? -1 : 1, t = o.t || 0, v = o.view || 0, sq = o.sq || 0;
    var fw = o.fw == null ? 1 : o.fw;
    var gph = o.walk ? t * 14 * (o.spd || 1) : 0;
    var bob = o.walk ? Math.sin(gph) * 1.6 : Math.sin(t * 1.8) * 0.35;
    var P = pose(o), i;
    var hc = o.horse || '#6b4423', hcd = shade(hc, 0.75);
    ctx.save();
    ctx.translate(x, y);
    if (o.dizzy) ctx.rotate(Math.sin(t * 7) * 0.06);
    ctx.scale((v ? 1 : f) * s * fw * (1 + sq * 0.6), s * (1 - sq));
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (v) {
      // ---- caballo de frente / de grupa ----
      var lift = function (k) { return o.walk ? Math.max(0, Math.sin(gph + HPH[k])) * 3 : 0; };
      var tsw = Math.sin(t * (o.walk ? 9 : 2.5)) * (o.walk ? 2.5 : 1.2);
      ctx.strokeStyle = hcd; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-4.8, -10 + bob); ctx.lineTo(-4.8, -1 - lift(0)); ctx.moveTo(4.8, -10 + bob); ctx.lineTo(4.8, -1 - lift(1)); ctx.stroke();
      ctx.fillStyle = hc;
      ctx.beginPath(); ctx.ellipse(0, -14 + bob, 7.5, 6.8, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(25,14,6,0.6)'; ctx.lineWidth = 1; ctx.stroke();
      if (v < 0) {
        ctx.strokeStyle = '#1d120a'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(0, -18 + bob); ctx.quadraticCurveTo(tsw * 0.4, -12 + bob, tsw, -6 + bob); ctx.stroke();
      }
      ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-3, -9 + bob); ctx.lineTo(-3, -0.5 - lift(2)); ctx.moveTo(3, -9 + bob); ctx.lineTo(3, -0.5 - lift(3)); ctx.stroke();
      // montura y piernas del jinete
      ctx.fillStyle = o.saddle || '#3a2a4a';
      D.rr(ctx, -6.5, -21 + bob, 13, 4, 2); ctx.fill();
      for (i = -1; i <= 1; i += 2) {
        ctx.strokeStyle = o.pants || '#eee'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(i * 3, -20 + bob); ctx.lineTo(i * 7.6, -11 + bob); ctx.stroke();
        ctx.strokeStyle = BOOT; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(i * 7.6, -11.5 + bob); ctx.lineTo(i * 7.9, -9.5 + bob); ctx.stroke();
      }
      ctx.save();
      ctx.translate(0, -12 + bob);
      upperFront(ctx, o, P, v);
      ctx.restore();
      if (v > 0) {
        // cabeza del caballo, de frente, por delante del jinete
        var nod = o.walk ? Math.sin(gph + 0.6) * 1 : 0;
        ctx.fillStyle = hc;
        ctx.beginPath(); ctx.ellipse(0, -19 + bob + nod, 3.3, 6.4, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(25,14,6,0.6)'; ctx.lineWidth = 0.9; ctx.stroke();
        ctx.fillStyle = hc;
        ctx.beginPath(); ctx.moveTo(-2.6, -23.5 + bob + nod); ctx.lineTo(-3.4, -28 + bob + nod); ctx.lineTo(-0.8, -24.8 + bob + nod); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(2.6, -23.5 + bob + nod); ctx.lineTo(3.4, -28 + bob + nod); ctx.lineTo(0.8, -24.8 + bob + nod); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1d120a';
        ctx.fillRect(-1.2, -25.6 + bob + nod, 2.4, 3);                      // flequillo
        ctx.fillRect(-3.2, -21.5 + bob + nod, 1.2, 1.3); ctx.fillRect(2, -21.5 + bob + nod, 1.2, 1.3);
        ctx.fillStyle = 'rgba(20,10,5,0.7)';
        ctx.beginPath(); ctx.arc(-1.2, -13.8 + bob + nod, 0.7, 0, TAU); ctx.arc(1.2, -13.8 + bob + nod, 0.7, 0, TAU); ctx.fill();
      }
      ctx.restore();
      return;
    }
    // ---- perfil ----
    var hnod = o.walk ? Math.sin(gph + 0.8) * 1.2 : Math.sin(t * 0.9) * 0.6 + (Math.sin(t * 0.37) > 0.85 ? 2.5 : 0);
    var hurt = o.hurt || 0;
    // patas con articulación
    for (i = 0; i < 4; i++) {
      var swg = o.walk ? Math.sin(gph + HPH[i]) : 0;
      var kx = HLX[i] + swg * 3, ky = -5 + bob * 0.5;
      var lf = o.walk ? Math.max(0, Math.cos(gph + HPH[i])) * 2.5 : 0;
      ctx.strokeStyle = i === 1 || i === 3 ? hcd : '#2a1a10'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(HLX[i], -10 + bob); ctx.lineTo(kx, ky - lf * 0.5); ctx.lineTo(HLX[i] + swg * 5.5, -0.5 - lf); ctx.stroke();
    }
    // cola
    var tw2 = o.walk ? 3 : Math.sin(t * 2.2) * 1.5;
    ctx.strokeStyle = '#1d120a'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-12, -16 + bob); ctx.quadraticCurveTo(-20, -15 + bob, -18 - tw2, -6 + bob); ctx.stroke();
    // cuerpo
    ctx.fillStyle = hc;
    ctx.beginPath(); ctx.ellipse(0, -14 + bob, 13, 6.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(25,14,6,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    // cuello y cabeza (cabecea al galope)
    var hb = bob + hnod;
    ctx.beginPath();
    ctx.moveTo(7, -18 + bob); ctx.lineTo(15, -29 + hb); ctx.lineTo(22, -26 + hb); ctx.lineTo(21, -22.5 + hb); ctx.lineTo(16.5, -22 + hb); ctx.lineTo(13, -12 + bob);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hc;
    ctx.beginPath(); ctx.moveTo(14.5, -28 + hb); ctx.lineTo(15, -32 + hb); ctx.lineTo(16.8, -28.3 + hb); ctx.closePath(); ctx.fill();   // oreja
    ctx.strokeStyle = '#1d120a'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(8.5, -19 + bob); ctx.lineTo(14.5, -28.5 + hb); ctx.stroke();      // crin
    ctx.fillStyle = '#1d120a'; ctx.fillRect(18.6, -26 + hb, 1.3, 1.4);                             // ojo
    // montura
    ctx.fillStyle = o.saddle || '#3a2a4a';
    D.rr(ctx, -6, -21 + bob, 11, 5, 2); ctx.fill();
    // jinete
    ctx.translate(-1, -12 + bob);
    var lean = (o.walk ? 0.1 : 0) - P.wind * 0.12 + P.str * 0.2 - hurt * 0.25;
    ctx.translate(0, -9); ctx.rotate(lean); ctx.translate(0, 9);
    ctx.strokeStyle = o.pants || '#eee'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(3.2, -4.5); ctx.lineTo(2.6, -1.5); ctx.stroke();
    ctx.strokeStyle = BOOT; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(2.6, -2); ctx.lineTo(4.6, -0.6); ctx.stroke();
    P.reins = [22, -10.5 + hnod];
    upperSide(ctx, o, P);
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
    hat(ctx, o, 0);
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

  /* ---------------- Dificultad: uno, dos o tres sables corvos ---------------- */
  // Sable con la punta hacia arriba, centrado en el origen (unos 42 px de alto).
  function sabre(ctx) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // hoja curva
    ctx.beginPath();
    ctx.moveTo(-2.6, 5);
    ctx.quadraticCurveTo(-5.5, -11, 5, -24);
    ctx.quadraticCurveTo(2.2, -9, 2.6, 5);
    ctx.closePath();
    ctx.fillStyle = '#e6e9ee'; ctx.fill();
    ctx.strokeStyle = D.INK; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(-0.9, 2); ctx.quadraticCurveTo(-2.6, -9, 2, -18); ctx.stroke();
    // empuñadura
    ctx.strokeStyle = D.INK; ctx.lineWidth = 5.4;
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 15.5); ctx.stroke();
    ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 15.5); ctx.stroke();
    // gavilán y guardamano dorados (del lado del filo)
    function guard() {
      ctx.beginPath(); ctx.moveTo(-6, 6.5); ctx.lineTo(6, 6.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5.6, 7); ctx.quadraticCurveTo(-8.5, 14, -1, 17.6); ctx.stroke();
    }
    ctx.strokeStyle = D.INK; ctx.lineWidth = 4.8; guard();
    ctx.strokeStyle = D.GOLD; ctx.lineWidth = 2.6; guard();
    ctx.fillStyle = D.GOLD; ctx.strokeStyle = D.INK; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 17.8, 2.5, 0, TAU); ctx.fill(); ctx.stroke();
  }

  function sabreAt(ctx, rot, flip) {
    ctx.save();
    ctx.rotate(rot);
    if (flip) ctx.scale(-1, 1);
    ctx.translate(0, 3);
    sabre(ctx);
    ctx.restore();
  }

  // Emblema de la dificultad: fácil un sable, normal dos cruzados, difícil tres.
  // plain: sin el medallón de fondo (para botones chicos).
  D.diffIcon = function (ctx, key, x, y, s, plain, wob) {
    var d = window.TD.DIFFS[key], n = window.TD.DIFF_KEYS.indexOf(key) + 1;
    if (!d) return;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    if (!plain) {
      ctx.fillStyle = 'rgba(30,20,10,0.25)';
      ctx.beginPath(); ctx.arc(1.5, 2.5, 27, 0, TAU); ctx.fill();
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.arc(0, 0, 27, 0, TAU); ctx.fill();
      ctx.strokeStyle = D.INK; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.strokeStyle = 'rgba(246,242,228,0.75)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, 22.5, 0, TAU); ctx.stroke();
    }
    if (wob) ctx.rotate(wob);
    ctx.scale(1.12, 1.12);
    if (n === 1) sabreAt(ctx, 0.55, false);
    else {
      sabreAt(ctx, -0.72, true);
      sabreAt(ctx, 0.72, false);
      if (n === 3) { ctx.translate(0, -1); ctx.scale(1.08, 1.08); sabreAt(ctx, 0, false); }
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
