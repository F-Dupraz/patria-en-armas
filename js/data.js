/* ============================================================
 * data.js — tabla de daño, torres y ramas, enemigos y héroes
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD;

  /* ---------- Tipos de daño contra tipos de armadura ----------
   * contundente: castiga a la tropa ligera, rebota en la pesada.
   * perforante : hecho para atravesar armadura media y pesada.
   * fuego      : parejo, rinde contra armadura media y pesada.   */
  TD.DMG = {
    cont:  { ligera: 1.25, media: 1.0,  pesada: 0.5 },
    perf:  { ligera: 0.75, media: 1.1,  pesada: 1.4 },
    fuego: { ligera: 1.0,  media: 1.25, pesada: 1.25 }
  };
  TD.DMG_NAMES = { cont: 'contundente', perf: 'perforante', fuego: 'fuego' };
  TD.ARMORS = ['ligera', 'media', 'pesada'];

  TD.SELL_RATE = 0.6;                       // vender devuelve el 60 % de lo invertido
  TD.TOWER_KEYS = ['granaderos', 'artilleria', 'tiradores', 'gauchos'];

  /* ---------- Torres ----------
   * Cada torre: base + 2 ramas de 3 niveles. Al completar una rama
   * se desbloquea la habilidad activa.                              */
  TD.TOWERS = {
    granaderos: {
      // La clave interna sigue siendo 'granaderos'; el nombre visible cambia según el acto:
      // 1806-07 defendió Buenos Aires el Regimiento de Patricios; los Granaderos a Caballo nacen en 1812.
      name: 'Granaderos', names: ['Patricios', 'Granaderos', 'Infantería'], short: 'Cuartel', cost: 70,
      desc: 'Cuartel: tres soldados que bloquean el paso y pelean cuerpo a cuerpo.',
      base: { sHp: 85, sDmg: 7, sRate: 1.0, sArmor: 0, respawn: 9, range: 140, type: 'cont' },
      branches: [
        { key: 'guardia', name: 'Guardia', desc: 'Más vida y coraza: aguantan mucho más.',
          levels: [
            { cost: 90,  sHp: 150, sDmg: 9,  sArmor: 0.15 },
            { cost: 140, sHp: 230, sDmg: 12, sArmor: 0.28 },
            { cost: 200, sHp: 330, sDmg: 16, sArmor: 0.40 }
          ] },
        { key: 'asalto', name: 'Asalto', desc: 'Más daño (perforante) y vuelven antes.',
          levels: [
            { cost: 100, sHp: 100, sDmg: 15, respawn: 6.5, type: 'perf' },
            { cost: 150, sHp: 125, sDmg: 23, respawn: 4.5, type: 'perf' },
            { cost: 210, sHp: 150, sDmg: 33, sRate: 0.85, respawn: 3, type: 'perf' }
          ] }
      ],
      ability: { name: 'Carga al sable', cd: 18, desc: 'Empuja y aturde a los enemigos del frente.' }
    },

    artilleria: {
      name: 'Artillería criolla', short: 'Cañón', cost: 125,
      desc: 'Cañón: daño en área, disparo lento. Ideal contra grupos y contra barcos (×1.6).',
      base: { dmg: 38, rate: 2.6, range: 165, splash: 52, type: 'cont', ball: 1, naval: 1.6 },
      branches: [
        { key: 'alcance', name: 'Alcance', desc: 'Más rango y balas más grandes.',
          levels: [
            { cost: 150, dmg: 60,  range: 205, splash: 58, ball: 1.3 },
            { cost: 220, dmg: 90,  range: 245, splash: 64, ball: 1.6 },
            { cost: 300, dmg: 135, range: 290, splash: 72, ball: 2.0 }
          ] },
        { key: 'fuego', name: 'Fuego', desc: 'Bala roja: quema y abarca más área.',
          levels: [
            { cost: 160, dmg: 42, type: 'fuego', range: 170, splash: 68, burn: 8,  burnT: 3 },
            { cost: 230, dmg: 58, type: 'fuego', range: 175, splash: 82, burn: 14, burnT: 4 },
            { cost: 310, dmg: 80, type: 'fuego', range: 180, splash: 96, burn: 22, burnT: 5 }
          ] }
      ],
      ability: { name: 'Descarga de metralla', cd: 20, desc: 'Barre un área grande con metralla.' }
    },

    tiradores: {
      name: 'Tiradores', short: 'Fusil', cost: 100,
      desc: 'Mangrullo de fusileros: largo alcance y mucho daño a un solo blanco.',
      base: { dmg: 26, rate: 1.4, range: 185, type: 'perf', targets: 1, crit: 0, critMult: 2, pierce: 0 },
      branches: [
        { key: 'precision', name: 'Precisión', desc: 'Críticos e ignora parte de la armadura.',
          levels: [
            { cost: 130, dmg: 44,  rate: 1.5,  range: 210, crit: 0.15, pierce: 0.15 },
            { cost: 190, dmg: 70,  rate: 1.5,  range: 235, crit: 0.25, pierce: 0.30 },
            { cost: 260, dmg: 105, rate: 1.45, range: 260, crit: 0.35, critMult: 2.5, pierce: 0.45 }
          ] },
        { key: 'cadencia', name: 'Cadencia', desc: 'Más disparos; después apunta a dos blancos.',
          levels: [
            { cost: 120, dmg: 24, rate: 0.85, range: 190 },
            { cost: 180, dmg: 28, rate: 0.70, range: 195, targets: 2 },
            { cost: 250, dmg: 36, rate: 0.52, range: 200, targets: 2 }
          ] }
      ],
      ability: { name: 'Tiro certero', cd: 16, desc: 'Un disparo que atraviesa a todos los enemigos en línea.' }
    },

    gauchos: {
      name: 'Gauchos', short: 'Guerrilla', cost: 90,
      desc: 'Guerrilla gaucha: hostiga desde los costados y frena con boleadoras.',
      base: { dmg: 11, rate: 1.1, range: 150, slow: 0.35, slowT: 2.0, type: 'cont', splash: 0 },
      branches: [
        { key: 'boleadoras', name: 'Boleadoras', desc: 'Frenan más fuerte y por más tiempo.',
          levels: [
            { cost: 100, dmg: 15, slow: 0.45, slowT: 2.8, range: 160 },
            { cost: 150, dmg: 20, slow: 0.55, slowT: 3.6, range: 170, splash: 40 },
            { cost: 210, dmg: 28, slow: 0.65, slowT: 4.5, range: 180, splash: 55 }
          ] },
        { key: 'emboscada', name: 'Emboscada', desc: 'Aparecen detrás del enemigo: daño extra por la espalda.',
          levels: [
            { cost: 110, dmg: 36, rate: 1.2, ambush: true, back: 0.4, type: 'perf', slow: 0.2, slowT: 1 },
            { cost: 170, dmg: 52, rate: 1.1, ambush: true, back: 0.6, type: 'perf', slow: 0.2, slowT: 1 },
            { cost: 240, dmg: 72, rate: 1.0, ambush: true, back: 0.8, type: 'perf', slow: 0.2, slowT: 1 }
          ] }
      ],
      ability: { name: 'Montonera', cd: 24, desc: 'Invoca varios gauchos a caballo por unos segundos.' }
    }
  };

  // Nombre visible de una torre según el acto (0, 1, 2). Sin acto: todas las variantes.
  TD.towerName = function (key, act) {
    var d = TD.TOWERS[key];
    if (!d.names) return d.name;
    if (act != null && d.names[act]) return d.names[act];
    return d.names.slice(0, 2).join(' / ');
  };

  /* ---------- Enemigos ----------
   * hp, spd (px/s), armor, gold, lives (vidas que resta si pasa),
   * dmg/rate (cuerpo a cuerpo), ranged, elite, boss, naval, look.   */
  var E = {};
  TD.ENEMIES = E;

  // --- Comunes ---
  E.casaca = { name: 'Casaca roja', trait: 'Común', hp: 55, spd: 40, armor: 'ligera', gold: 5, lives: 1, dmg: 6, rate: 1.0, r: 9,
    look: { kind: 'inf', coat: '#cf2b2b', pants: '#d9d4c4', hat: 'shako', trim: '#f6f2e4', plume: '#f6f2e4', weapon: 'musket' } };
  E.realista = { name: 'Infante realista', trait: 'Común', hp: 70, spd: 38, armor: 'ligera', gold: 6, lives: 1, dmg: 7, rate: 1.0, r: 9,
    look: { kind: 'inf', coat: '#b3142a', pants: '#f1ecdc', hat: 'bicorne', trim: '#e9c64a', weapon: 'musket' } };
  E.frances = { name: 'Soldado francés', trait: 'Común', hp: 95, spd: 42, armor: 'media', gold: 8, lives: 1, dmg: 8, rate: 1.0, r: 9,
    look: { kind: 'inf', coat: '#2b4a9a', pants: '#f1ecdc', hat: 'kepi', trim: '#f6f2e4', weapon: 'musket' } };

  // --- Rápidos ---
  E.explorador = { name: 'Explorador', trait: 'Rápido', hp: 38, spd: 88, armor: 'ligera', gold: 5, lives: 1, dmg: 5, rate: 0.8, r: 8,
    look: { kind: 'inf', coat: '#7a6a45', pants: '#5a4a35', hat: 'gorro', weapon: 'sable', s: 0.9 } };
  E.caballeria = { name: 'Caballería ligera', trait: 'Rápido', hp: 120, spd: 92, armor: 'media', gold: 11, lives: 1, dmg: 10, rate: 0.9, r: 13,
    look: { kind: 'cav', coat: '#b3142a', pants: '#f1ecdc', hat: 'shako', trim: '#e9c64a', plume: '#e9c64a', horse: '#5b3a20', weapon: 'sable' } };

  // --- Lentos y blindados ---
  E.pesado = { name: 'Infantería pesada', trait: 'Blindado', hp: 340, spd: 24, armor: 'pesada', gold: 20, lives: 2, dmg: 14, rate: 1.2, r: 11,
    look: { kind: 'inf', coat: '#8f0f20', pants: '#3a3a44', hat: 'bearskin', trim: '#e9c64a', weapon: 'musket', s: 1.3, cuirass: true } };
  E.pesado_brit = { name: 'Granadero británico', trait: 'Blindado', hp: 300, spd: 25, armor: 'pesada', gold: 18, lives: 2, dmg: 13, rate: 1.2, r: 11,
    look: { kind: 'inf', coat: '#b8201f', pants: '#e9e4d4', hat: 'bearskin', trim: '#f6f2e4', weapon: 'musket', s: 1.3, cuirass: true } };
  E.pesado_fr = { name: 'Infante de marina', trait: 'Blindado', hp: 380, spd: 25, armor: 'pesada', gold: 22, lives: 2, dmg: 15, rate: 1.2, r: 11,
    look: { kind: 'inf', coat: '#1f3878', pants: '#f1ecdc', hat: 'bearskin', trim: '#e9c64a', weapon: 'musket', s: 1.3, cuirass: true } };

  // --- Tiradores: disparan a soldados y torres ---
  E.cazador = { name: 'Cazador', trait: 'Tirador', hp: 65, spd: 36, armor: 'ligera', gold: 10, lives: 1, dmg: 6, rate: 1.0, r: 9,
    ranged: { range: 125, dmg: 9, rate: 1.7, towerDmg: 10 },
    look: { kind: 'inf', coat: '#2f5a3a', pants: '#3a3a35', hat: 'shako', trim: '#1b1b1b', plume: '#2f5a3a', weapon: 'musket', aim: true } };

  // --- Élites ---
  E.cirujano = { name: 'Cirujano de campaña', trait: 'Élite: cura aliados', elite: 'heal', hp: 420, spd: 34, armor: 'media', gold: 40, lives: 2, dmg: 8, rate: 1.2, r: 10,
    look: { kind: 'inf', coat: '#f1ecdc', pants: '#3a3a44', hat: 'bicorne', weapon: 'none', s: 1.2, cross: true } };
  E.espia = { name: 'Infiltrado', trait: 'Élite: se vuelve invisible', elite: 'invis', hp: 330, spd: 58, armor: 'ligera', gold: 40, lives: 2, dmg: 14, rate: 0.9, r: 10,
    look: { kind: 'inf', coat: '#3b3340', pants: '#2a2530', hat: 'gaucho', hatc: '#1d1a22', weapon: 'sable', s: 1.15, cape: '#2a2230' } };
  E.veterano = { name: 'Veterano de línea', trait: 'Élite: regenera vida', elite: 'regen', hp: 750, spd: 30, armor: 'pesada', gold: 50, lives: 3, dmg: 20, rate: 1.1, r: 12,
    look: { kind: 'inf', coat: '#7d0e1c', pants: '#f1ecdc', hat: 'bearskin', trim: '#e9c64a', plume: '#e9c64a', weapon: 'musket', s: 1.45, cuirass: true } };

  // --- Navales: avanzan por el río y cañonean las torres de la costa ---
  E.lancha = { name: 'Lancha cañonera', trait: 'Naval', naval: true, hp: 240, spd: 28, armor: 'media', gold: 18, lives: 2, r: 24,
    ranged: { range: 215, towerDmg: 14, rate: 3.2 },
    look: { kind: 'ship', ship: 'lancha', flag: 'uk' } };
  E.bergantin = { name: 'Bergantín', trait: 'Naval', naval: true, hp: 620, spd: 20, armor: 'media', gold: 40, lives: 3, r: 34,
    ranged: { range: 240, towerDmg: 20, rate: 2.8 },
    look: { kind: 'ship', ship: 'bergantin', flag: 'fr' } };
  E.vapor = { name: 'Vapor de guerra', trait: 'Naval', naval: true, hp: 1000, spd: 24, armor: 'pesada', gold: 65, lives: 5, r: 40,
    ranged: { range: 260, towerDmg: 24, rate: 2.6 },
    look: { kind: 'ship', ship: 'vapor', flag: 'uk' } };

  // --- Jefes: tres fases (66 % y 33 %) ---
  function boss(id, name, hp, spd, armor, gold, look, summon, n, major) {
    E[id] = {
      name: name, trait: 'Jefe', hp: hp, spd: spd, armor: armor, gold: gold, lives: major ? 20 : 10,
      dmg: major ? 45 : 30, rate: 1.0, r: 17,
      boss: { summon: summon, n: n, towerDmg: major ? 36 : 28, major: !!major },
      look: look
    };
  }
  function cav(coat, trim, plume, horse) {
    return { kind: 'cav', coat: coat, pants: '#f1ecdc', hat: 'bicorne', trim: trim, plume: plume, horse: horse, weapon: 'sable', s: 1.7, epaulettes: true };
  }
  boss('jefe1', 'Capitán británico', 800, 26, 'media', 80, cav('#cf2b2b', '#f6f2e4', '#f6f2e4', '#3d2a1c'), 'casaca', 3, false);
  boss('jefe2', 'Mayor británico', 1300, 26, 'media', 100, cav('#cf2b2b', '#e9c64a', '#f6f2e4', '#3d2a1c'), 'casaca', 4, false);
  boss('jefe3', 'Brigadier británico', 2400, 24, 'pesada', 160, cav('#cf2b2b', '#e9c64a', '#f6f2e4', '#e8e2d2'), 'pesado_brit', 2, true);
  boss('jefe4', 'Coronel realista', 1900, 27, 'media', 130, cav('#b3142a', '#e9c64a', '#e9c64a', '#3d2a1c'), 'realista', 5, false);
  boss('jefe5', 'Capitán de desembarco', 2100, 28, 'media', 140, cav('#b3142a', '#f6f2e4', '#e9c64a', '#2a1c12'), 'explorador', 6, false);
  boss('jefe6', 'Jefe de avanzada', 2500, 27, 'pesada', 150, cav('#8f0f20', '#e9c64a', '#f6f2e4', '#6b5a48'), 'caballeria', 3, false);
  boss('jefe7', 'Brigadier realista', 2600, 27, 'pesada', 170, cav('#b3142a', '#e9c64a', '#f6f2e4', '#3d2a1c'), 'realista', 6, false);
  boss('jefe8', 'General realista', 4800, 25, 'pesada', 260, cav('#b3142a', '#e9c64a', '#f6f2e4', '#e8e2d2'), 'pesado', 3, true);
  boss('jefe10', 'Coronel de desembarco', 4000, 26, 'pesada', 220, cav('#2b4a9a', '#e9c64a', '#cf2b2b', '#3d2a1c'), 'frances', 6, false);

  function navalBoss(id, name, hp, spd, gold, ship, flag, n, major) {
    E[id] = {
      name: name, trait: 'Jefe naval', naval: true, hp: hp, spd: spd, armor: 'pesada', gold: gold, lives: major ? 20 : 10, r: ship === 'insignia' ? 52 : 42,
      ranged: { range: 270, towerDmg: 26, rate: 2.6 },
      boss: { summon: 'lancha', n: n, towerDmg: major ? 34 : 28, major: !!major },
      look: { kind: 'ship', ship: ship, flag: flag }
    };
  }
  navalBoss('jefe9', 'Corbeta de vanguardia', 2400, 17, 200, 'vapor', 'fr', 2, false);
  navalBoss('jefe11', 'Fragata a vapor', 3800, 18, 260, 'insignia', 'fr', 2, false);
  navalBoss('jefe12', 'Buque insignia de la flota', 8000, 16, 400, 'insignia', 'uk', 3, true);

  /* ---------- Héroes ---------- */
  TD.HERO_XP = [60, 150, 280, 450, 660];    // experiencia acumulada para los niveles 2 a 6
  TD.HEROES = {
    sanmartin: {
      name: 'San Martín', title: 'Jefe del Ejército de los Andes',
      bio: 'Creador de los Granaderos a Caballo. Resistente y de sable firme: ideal para plantar en un cruce.',
      hp: 440, dmg: 24, rate: 0.9, spd: 85, armor: 0.2, type: 'perf', regen: 5,
      look: { kind: 'inf', coat: '#1f3a6e', pants: '#f1ecdc', hat: 'bicorne', trim: '#e9c64a', plume: '#74acdf', weapon: 'sable', s: 1.35, epaulettes: true },
      // Presencia histórica por acto: 'yes' estuvo · 'part' estuvo en parte · 'no' no estuvo
      epochs: [
        { s: 'no',   t: 'En España, lejos del Río de la Plata' },
        { s: 'part', t: 'Desde 1812: 4 de 5 batallas (no Tucumán)' },
        { s: 'no',   t: 'Exiliado en Francia (murió en 1850)' }
      ],
      ability: { name: 'Carga de granaderos', cd: 24, desc: 'Una carga de caballería arrolla la zona: daña y aturde.' },
      tree: [
        { name: 'Temple', desc: '+25 % de vida y más regeneración.' },
        { name: 'Sable corvo', desc: '+25 % de daño y golpea más rápido.' },
        { name: 'Disciplina', desc: 'La carga pega +30 % y vuelve antes.' }
      ]
    },
    belgrano: {
      name: 'Belgrano', title: 'Jefe del Ejército del Norte',
      bio: 'Abogado devenido general y creador de la bandera. Pelea menos, pero vuelve mejores a todos los demás.',
      hp: 340, dmg: 18, rate: 1.0, spd: 80, armor: 0.1, type: 'cont', regen: 4,
      look: { kind: 'inf', coat: '#27457d', pants: '#f1ecdc', hat: 'bicorne', trim: '#f6f2e4', plume: '#f6f2e4', weapon: 'sable', s: 1.3, epaulettes: true, sash: '#74acdf' },
      epochs: [
        { s: 'no',   t: 'No fue protagonista: se fue en 1806' },
        { s: 'part', t: 'Solo en Tucumán (1812)' },
        { s: 'no',   t: 'Murió en 1820' }
      ],
      ability: { name: 'Jurar la bandera', cd: 28, desc: 'Las torres cercanas disparan más rápido y tus soldados se curan.' },
      tree: [
        { name: 'Constancia', desc: '+25 % de vida y más regeneración.' },
        { name: 'Instrucción', desc: '+25 % de daño y golpea más rápido.' },
        { name: 'Bandera', desc: 'El juramento dura +30 % y vuelve antes.' }
      ]
    },
    guemes: {
      name: 'Güemes', title: 'Caudillo de los gauchos de Salta',
      bio: 'Defendió la frontera norte con sus gauchos. Veloz, a caballo: llega a todos lados y frena columnas enteras.',
      hp: 360, dmg: 20, rate: 0.65, spd: 130, armor: 0.1, type: 'perf', regen: 4,
      look: { kind: 'cav', coat: '#9a1b22', pants: '#3a2a1a', hat: 'gaucho', hatc: '#2a1c12', trim: null, horse: '#4a2f1c', weapon: 'lanza', s: 1.25, poncho: '#b3142a' },
      epochs: [
        { s: 'yes', t: 'Peleó en 1806 (toma del buque Justina)' },
        { s: 'no',  t: 'Peleaba en Salta, no en estas batallas' },
        { s: 'no',  t: 'Murió en 1821' }
      ],
      ability: { name: 'Guerra gaucha', cd: 22, desc: 'Emboscada general: ralentiza y hiere a todos los enemigos cercanos.' },
      tree: [
        { name: 'Aguante', desc: '+25 % de vida y más regeneración.' },
        { name: 'Lanza', desc: '+25 % de daño y golpea más rápido.' },
        { name: 'Baqueanos', desc: 'La emboscada rinde +30 % y vuelve antes.' }
      ]
    }
  };
  TD.HERO_KEYS = ['sanmartin', 'belgrano', 'guemes'];

  // Aspecto de los soldados propios
  TD.LOOKS = {
    granadero: { kind: 'inf', coat: '#1f3a6e', pants: '#f1ecdc', hat: 'morrion', trim: '#f6f2e4', plume: '#cf2b2b', weapon: 'sable' },
    guardia: { kind: 'inf', coat: '#1f3a6e', pants: '#f1ecdc', hat: 'morrion', trim: '#74acdf', plume: '#74acdf', weapon: 'sable', s: 1.12, cuirass: true },
    asalto: { kind: 'inf', coat: '#27457d', pants: '#f1ecdc', hat: 'morrion', trim: '#e9c64a', plume: '#cf2b2b', weapon: 'sable', s: 1.05 },
    gaucho: { kind: 'cav', coat: '#8a5a2b', pants: '#3a2a1a', hat: 'gaucho', hatc: '#2a1c12', horse: '#6b4423', weapon: 'lanza', poncho: '#74acdf' },
    tirador: { kind: 'inf', coat: '#74acdf', pants: '#f1ecdc', hat: 'shako', trim: '#f6f2e4', plume: '#f6f2e4', weapon: 'musket', aim: true },
    gauchoPie: { kind: 'inf', coat: '#8a5a2b', pants: '#3a2a1a', hat: 'gaucho', hatc: '#2a1c12', weapon: 'bolas', poncho: '#9a6a3a' }
  };
})();
