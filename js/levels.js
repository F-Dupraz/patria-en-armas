/* ============================================================
 * levels.js — campaña: 12 niveles en 3 actos
 * Cada nivel: caminos (waypoints), oleadas, objetivos de estrellas,
 * diálogo breve y ficha de enciclopedia.
 * ============================================================ */
(function () {
  'use strict';
  var TD = window.TD;

  // Grupo de una oleada: tipo, cantidad, intervalo (s), demora inicial (s), índice de camino.
  function G(type, n, gap, delay, path) {
    return { type: type, n: n, gap: gap, delay: delay || 0, path: path || 0 };
  }
  // Oleada: pausa (s) antes de la siguiente, oro de premio al superarla, grupos.
  function W(pause, bonus) {
    return { pause: pause, bonus: bonus, groups: Array.prototype.slice.call(arguments, 2) };
  }

  TD.ACTS = [
    { name: 'Acto I — Invasiones Inglesas', years: '1806-1807' },
    { name: 'Acto II — Guerra de Independencia', years: '1812-1818' },
    { name: 'Acto III — Época de Rosas', years: '1845' }
  ];

  /* Objetivos de estrellas disponibles:
   *  lives n     → terminar con al menos n vidas
   *  noSell      → no vender torres
   *  heroAlive   → que el héroe no caiga
   *  maxTowers n → usar como máximo n torres
   *  early n     → adelantar n oleadas con 5 s o más de anticipación */

  TD.LEVELS = [
    /* =================== ACTO I =================== */
    {
      act: 0, name: 'La Reconquista', year: '1806', place: 'Buenos Aires', theme: 'ciudad',
      gold: 250, lives: 20, hpMul: 1, tutorial: true, mapPos: [655, 628],
      paths: [
        { straight: true, pts: [[-40, 190], [300, 190], [300, 430], [660, 430], [660, 210], [980, 210], [980, 500], [1320, 500]] }
      ],
      waves: [
        W(14, 20, G('casaca', 6, 1.5)),
        W(14, 25, G('casaca', 9, 1.2)),
        W(15, 30, G('casaca', 8, 1.1), G('explorador', 4, 0.9, 7)),
        W(16, 35, G('casaca', 12, 0.95), G('cazador', 2, 2, 9)),
        W(18, 40, G('casaca', 10, 0.9), G('explorador', 6, 0.7, 6), G('pesado_brit', 1, 1, 12)),
        W(0, 60, G('casaca', 12, 0.9), G('cazador', 3, 1.8, 5), G('jefe1', 1, 1, 14))
      ],
      stars: [{ t: 'lives', n: 18 }, { t: 'noSell' }, { t: 'heroAlive' }],
      speaker: 'Vigía',
      talk: '¡Casacas rojas avanzando por la calle! Levantá defensas en los solares y no los dejes llegar a la plaza.',
      info: [
        'En junio de 1806 una expedición británica ocupó Buenos Aires, capital del Virreinato del Río de la Plata.',
        'El 12 de agosto, milicias locales y tropas llegadas desde Montevideo, al mando de Santiago de Liniers, reconquistaron la ciudad.',
        'Se combatió calle por calle hasta la Plaza Mayor, donde las fuerzas británicas se rindieron.'
      ]
    },
    {
      act: 0, name: 'Los Corrales de Miserere', year: '1807', place: 'Afueras de Buenos Aires', theme: 'ciudad',
      gold: 280, lives: 20, hpMul: 1.25, mapPos: [718, 592],
      paths: [
        { straight: true, pts: [[-40, 150], [380, 150], [380, 380], [800, 380], [800, 560], [1320, 560]] },
        { straight: true, pts: [[1060, 10], [1060, 210], [800, 210], [800, 380], [800, 560], [1320, 560]] }
      ],
      waves: [
        W(14, 25, G('casaca', 8, 1.3, 0, 0)),
        W(14, 25, G('casaca', 8, 1.2, 0, 1), G('explorador', 3, 0.9, 5, 0)),
        W(15, 30, G('casaca', 10, 1.0, 0, 0), G('casaca', 6, 1.1, 3, 1), G('cazador', 2, 2, 8, 1)),
        W(15, 30, G('explorador', 8, 0.6, 0, 0), G('casaca', 10, 1.0, 2, 1)),
        W(16, 35, G('pesado_brit', 2, 4, 0, 0), G('casaca', 12, 0.9, 2, 1), G('cazador', 3, 1.8, 6, 0)),
        W(16, 40, G('casaca', 14, 0.8, 0, 0), G('casaca', 10, 0.9, 1, 1), G('explorador', 5, 0.7, 8, 1)),
        W(18, 45, G('pesado_brit', 3, 3.5, 0, 1), G('casaca', 12, 0.9, 2, 0), G('cazador', 4, 1.6, 6, 0)),
        W(0, 70, G('casaca', 16, 0.7, 0, 0), G('casaca', 12, 0.8, 1, 1), G('pesado_brit', 2, 3, 10, 0), G('jefe2', 1, 1, 16, 1))
      ],
      stars: [{ t: 'lives', n: 15 }, { t: 'noSell' }, { t: 'early', n: 2 }],
      speaker: 'Chasqui',
      talk: 'Vienen por dos calles a la vez. Repartí bien las defensas, que en el cruce se juntan.',
      info: [
        'En 1807 una segunda expedición británica, mucho más numerosa, desembarcó cerca de Buenos Aires.',
        'Las fuerzas locales intentaron frenarla en los Corrales de Miserere, en las afueras, y fueron desbordadas.',
        'La ciudad aprovechó las horas siguientes para organizar la defensa casa por casa.'
      ]
    },
    {
      act: 0, name: 'La Defensa', year: '1807', place: 'Buenos Aires', theme: 'ciudad',
      gold: 300, lives: 20, hpMul: 1.45, mapPos: [668, 552],
      paths: [
        { straight: true, pts: [[-40, 140], [260, 140], [260, 330], [600, 330], [600, 160], [900, 160], [900, 360], [1320, 360]] },
        { straight: true, pts: [[-40, 570], [440, 570], [440, 480], [900, 480], [900, 360], [1320, 360]] }
      ],
      waves: [
        W(14, 25, G('casaca', 10, 1.1, 0, 0), G('casaca', 6, 1.2, 4, 1)),
        W(14, 30, G('explorador', 6, 0.7, 0, 1), G('casaca', 10, 1.0, 2, 0)),
        W(15, 30, G('casaca', 12, 0.9, 0, 0), G('cazador', 3, 1.8, 2, 1), G('casaca', 8, 1.0, 5, 1)),
        W(15, 35, G('pesado_brit', 2, 4, 0, 0), G('casaca', 12, 0.9, 1, 1), G('explorador', 6, 0.6, 8, 0)),
        W(16, 40, G('casaca', 16, 0.7, 0, 0), G('cirujano', 1, 1, 8, 0), G('casaca', 10, 0.9, 2, 1)),
        W(16, 40, G('pesado_brit', 3, 3.5, 0, 1), G('cazador', 5, 1.5, 1, 0), G('casaca', 12, 0.8, 5, 0)),
        W(16, 45, G('explorador', 10, 0.5, 0, 0), G('explorador', 10, 0.5, 2, 1), G('casaca', 12, 0.8, 8, 0)),
        W(18, 50, G('pesado_brit', 4, 3, 0, 0), G('cirujano', 1, 1, 5, 1), G('casaca', 14, 0.8, 1, 1)),
        W(0, 90, G('casaca', 18, 0.65, 0, 0), G('casaca', 14, 0.7, 1, 1), G('pesado_brit', 3, 3, 10, 1), G('cazador', 4, 1.5, 6, 0), G('jefe3', 1, 1, 18, 0))
      ],
      stars: [{ t: 'lives', n: 15 }, { t: 'heroAlive' }, { t: 'maxTowers', n: 9 }],
      speaker: 'Sargento de milicias',
      talk: 'Hoy pelea toda la ciudad. Ojo con los cirujanos enemigos: curan a su tropa, bajalos primero.',
      info: [
        'El 5 de julio de 1807 las columnas británicas entraron por las calles de Buenos Aires.',
        'Milicias y vecinos las recibieron desde azoteas, cantones y barricadas; tras duras pérdidas, los invasores capitularon.',
        'Las milicias criollas nacidas en estas jornadas serían decisivas en la Revolución de Mayo de 1810.'
      ]
    },

    /* =================== ACTO II =================== */
    {
      act: 1, name: 'Tucumán', year: '1812', place: 'San Miguel de Tucumán', theme: 'campo',
      gold: 320, lives: 20, hpMul: 1.35, mapPos: [432, 172],
      paths: [
        { pts: [[-40, 300], [200, 280], [380, 160], [600, 180], [700, 340], [560, 500], [760, 590], [1000, 520], [1080, 340], [1320, 300]] }
      ],
      waves: [
        W(14, 25, G('realista', 10, 1.2)),
        W(14, 30, G('realista', 10, 1.1), G('caballeria', 3, 1.5, 8)),
        W(15, 30, G('explorador', 8, 0.6), G('realista', 10, 1.0, 4)),
        W(15, 35, G('pesado', 2, 4), G('realista', 12, 0.9, 1), G('cazador', 3, 1.8, 8)),
        W(16, 40, G('caballeria', 8, 1.0), G('realista', 10, 0.9, 6), G('espia', 1, 1, 10)),
        W(16, 40, G('realista', 18, 0.7), G('pesado', 3, 3.5, 8)),
        W(16, 45, G('cazador', 6, 1.5), G('caballeria', 6, 1.0, 5), G('realista', 12, 0.8, 8), G('cirujano', 1, 1, 12)),
        W(18, 50, G('pesado', 5, 3), G('realista', 16, 0.7, 4), G('espia', 2, 5, 10)),
        W(0, 90, G('realista', 20, 0.6), G('caballeria', 8, 1.0, 8), G('pesado', 3, 3, 12), G('jefe4', 1, 1, 20))
      ],
      stars: [{ t: 'lives', n: 15 }, { t: 'noSell' }, { t: 'early', n: 3 }],
      speaker: 'Baqueano',
      talk: 'El enemigo baja confiado por el camino real. Los gauchos conocen cada mata de este campo: usalos.',
      info: [
        'El 24 de septiembre de 1812 el Ejército del Norte, al mando de Manuel Belgrano, enfrentó a los realistas en las afueras de San Miguel de Tucumán.',
        'Belgrano había recibido la orden de replegarse hasta Córdoba, pero decidió dar batalla con el apoyo de la población y de la caballería gaucha.',
        'La victoria frenó el avance realista sobre el norte y fue seguida por el triunfo de Salta en 1813.'
      ]
    },
    {
      act: 1, name: 'San Lorenzo', year: '1813', place: 'Orillas del Paraná', theme: 'costa',
      gold: 340, lives: 20, hpMul: 1.3, mapPos: [600, 322],
      paths: [
        { pts: [[40, 200], [250, 180], [480, 260], [700, 200], [950, 280], [1320, 270]] },
        { pts: [[40, 520], [260, 540], [500, 440], [740, 520], [960, 430], [1120, 330], [1320, 270]] }
      ],
      waves: [
        W(14, 25, G('realista', 8, 1.2, 0, 0), G('realista', 8, 1.2, 2, 1)),
        W(14, 30, G('explorador', 6, 0.7, 0, 0), G('realista', 10, 1.0, 1, 1)),
        W(15, 30, G('realista', 12, 0.9, 0, 0), G('cazador', 3, 1.8, 6, 0), G('caballeria', 4, 1.3, 3, 1)),
        W(15, 35, G('pesado', 2, 4, 0, 1), G('realista', 12, 0.9, 1, 0), G('explorador', 6, 0.6, 8, 1)),
        W(16, 40, G('realista', 14, 0.8, 0, 0), G('realista', 14, 0.8, 1, 1), G('veterano', 1, 1, 10, 0)),
        W(16, 40, G('caballeria', 6, 1.0, 0, 0), G('caballeria', 6, 1.0, 3, 1), G('cazador', 4, 1.6, 8, 1)),
        W(16, 45, G('pesado', 3, 3.5, 0, 0), G('pesado', 3, 3.5, 2, 1), G('realista', 10, 0.9, 8, 0), G('cirujano', 1, 1, 10, 1)),
        W(18, 50, G('realista', 18, 0.65, 0, 0), G('realista', 18, 0.65, 1, 1), G('espia', 2, 5, 10, 0)),
        W(0, 90, G('realista', 16, 0.7, 0, 0), G('pesado', 4, 3, 0, 1), G('caballeria', 8, 1.0, 10, 1), G('cazador', 5, 1.5, 5, 0), G('jefe5', 1, 1, 20, 0))
      ],
      stars: [{ t: 'lives', n: 14 }, { t: 'heroAlive' }, { t: 'noSell' }],
      speaker: 'Vigía del campanario',
      talk: 'Desembarcaron en dos columnas. Que los granaderos los frenen en seco antes de que lleguen al convento.',
      info: [
        'El 3 de febrero de 1813, junto al convento de San Carlos y a orillas del Paraná, una fuerza realista desembarcó para aprovisionarse.',
        'El Regimiento de Granaderos a Caballo, creado por José de San Martín, la cargó por sorpresa en dos columnas.',
        'El combate duró unos quince minutos y fue el bautismo de fuego de los granaderos.'
      ]
    },
    {
      act: 1, name: 'El Cruce de los Andes', year: '1817', place: 'Cordillera de los Andes', theme: 'montana',
      gold: 360, lives: 20, hpMul: 1.65, mapPos: [268, 396],
      paths: [
        { pts: [[-40, 560], [240, 560], [420, 470], [240, 360], [400, 240], [640, 250], [760, 400], [640, 540], [860, 600], [1060, 520], [1040, 340], [1180, 200], [1320, 170]] }
      ],
      waves: [
        W(14, 30, G('realista', 12, 1.1)),
        W(14, 30, G('explorador', 10, 0.5), G('realista', 8, 1.0, 6)),
        W(15, 35, G('realista', 14, 0.9), G('cazador', 4, 1.7, 6)),
        W(15, 35, G('pesado', 3, 3.5), G('caballeria', 5, 1.1, 6)),
        W(16, 40, G('realista', 18, 0.7), G('veterano', 1, 1, 8)),
        W(16, 45, G('caballeria', 10, 0.9), G('espia', 2, 4, 6), G('realista', 10, 0.9, 10)),
        W(16, 45, G('pesado', 5, 3), G('cazador', 6, 1.4, 4), G('cirujano', 1, 1, 10)),
        W(17, 50, G('realista', 22, 0.6), G('explorador', 10, 0.5, 8), G('veterano', 1, 1, 14)),
        W(18, 55, G('pesado', 6, 2.8), G('caballeria', 8, 0.9, 8), G('cirujano', 1, 1, 6), G('espia', 2, 4, 14)),
        W(0, 100, G('realista', 22, 0.6), G('pesado', 4, 3, 8), G('cazador', 6, 1.4, 4), G('veterano', 2, 6, 12), G('jefe6', 1, 1, 22))
      ],
      stars: [{ t: 'lives', n: 14 }, { t: 'maxTowers', n: 9 }, { t: 'early', n: 3 }],
      speaker: 'Arriero',
      talk: 'El sendero es angosto y el aire, finito. Acá cada curva es una trampa: aprovechala.',
      info: [
        'Entre enero y febrero de 1817 el Ejército de los Andes, organizado en Cuyo, cruzó la cordillera hacia Chile.',
        'Unos 5.000 hombres, con mulas, caballos y artillería, avanzaron por varios pasos —los principales, Los Patos y Uspallata— a más de 4.000 metros de altura.',
        'Se la considera una de las grandes maniobras militares de su tiempo.'
      ]
    },
    {
      act: 1, name: 'Chacabuco', year: '1817', place: 'Cuesta de Chacabuco, Chile', theme: 'campo',
      gold: 460, lives: 20, hpMul: 1.12, mapPos: [186, 346],
      paths: [
        { pts: [[1320, 180], [1040, 200], [860, 320], [620, 240], [400, 300], [260, 300], [-40, 340]] },
        { pts: [[1320, 540], [1060, 560], [880, 460], [640, 560], [420, 480], [260, 400], [-40, 340]] }
      ],
      waves: [
        W(15, 30, G('realista', 8, 1.2, 0, 0), G('realista', 8, 1.2, 2, 1)),
        W(15, 30, G('caballeria', 4, 1.3, 0, 0), G('realista', 10, 1.0, 1, 1)),
        W(15, 35, G('realista', 14, 0.8, 0, 0), G('cazador', 4, 1.6, 4, 1), G('explorador', 8, 0.6, 6, 1)),
        W(15, 40, G('pesado', 3, 3.5, 0, 0), G('pesado', 2, 3.5, 2, 1), G('realista', 10, 0.9, 6, 1)),
        W(16, 40, G('caballeria', 8, 0.9, 0, 1), G('realista', 16, 0.7, 1, 0), G('espia', 2, 4, 8, 0)),
        W(16, 45, G('realista', 16, 0.7, 0, 1), G('veterano', 1, 1, 6, 0), G('cazador', 5, 1.5, 3, 0), G('cirujano', 1, 1, 10, 1)),
        W(16, 45, G('pesado', 4, 3, 0, 0), G('pesado', 4, 3, 1, 1), G('caballeria', 6, 1.0, 10, 0)),
        W(17, 50, G('realista', 20, 0.6, 0, 0), G('realista', 20, 0.6, 1, 1), G('veterano', 1, 1, 10, 1), G('espia', 2, 4, 12, 0)),
        W(18, 55, G('caballeria', 10, 0.8, 0, 0), G('caballeria', 10, 0.8, 2, 1), G('pesado', 5, 2.8, 8, 0), G('cirujano', 2, 6, 8, 1)),
        W(0, 100, G('realista', 20, 0.6, 0, 0), G('realista', 20, 0.6, 1, 1), G('pesado', 4, 3, 8, 1), G('veterano', 2, 6, 10, 0), G('cazador', 6, 1.4, 4, 1), G('jefe7', 1, 1, 22, 0))
      ],
      stars: [{ t: 'lives', n: 13 }, { t: 'noSell' }, { t: 'heroAlive' }],
      speaker: 'Chasqui',
      talk: 'Las columnas realistas se juntan al pie de la cuesta. Golpeá donde se amontonan.',
      info: [
        'El 12 de febrero de 1817, pocos días después de cruzar la cordillera, el Ejército de los Andes atacó a las fuerzas realistas en la cuesta de Chacabuco.',
        'El ataque se organizó en dos columnas que debían converger sobre la posición enemiga.',
        'La victoria abrió el camino a Santiago y permitió instalar un gobierno patriota en Chile.'
      ]
    },
    {
      act: 1, name: 'Maipú', year: '1818', place: 'Llanos del Maipo, Chile', theme: 'campo',
      gold: 580, lives: 20, hpMul: 1.1, mapPos: [160, 432],
      paths: [
        { pts: [[-40, 160], [240, 200], [460, 340], [660, 360], [880, 300], [1060, 420], [1320, 440]] },
        { pts: [[-40, 580], [220, 540], [440, 400], [660, 360], [860, 470], [1040, 560], [1320, 560]] }
      ],
      waves: [
        W(15, 30, G('realista', 9, 1.1, 0, 0), G('realista', 9, 1.1, 2, 1)),
        W(15, 35, G('caballeria', 4, 1.3, 0, 0), G('explorador', 6, 0.7, 2, 1)),
        W(15, 35, G('realista', 16, 0.8, 0, 0), G('cazador', 5, 1.5, 3, 1), G('realista', 10, 0.9, 6, 1)),
        W(15, 40, G('pesado', 4, 3.2, 0, 0), G('pesado', 3, 3.2, 2, 1), G('cirujano', 1, 1, 8, 0)),
        W(16, 40, G('caballeria', 6, 1.0, 0, 1), G('realista', 16, 0.7, 1, 0), G('espia', 2, 4, 8, 1)),
        W(16, 45, G('realista', 20, 0.6, 0, 0), G('realista', 16, 0.7, 1, 1), G('veterano', 1, 1, 8, 0), G('veterano', 1, 1, 12, 1)),
        W(16, 45, G('cazador', 8, 1.2, 0, 0), G('pesado', 5, 2.8, 2, 1), G('caballeria', 8, 0.9, 10, 0)),
        W(17, 50, G('explorador', 14, 0.4, 0, 0), G('explorador', 14, 0.4, 1, 1), G('realista', 18, 0.6, 6, 0), G('cirujano', 2, 5, 8, 1)),
        W(17, 50, G('pesado', 6, 2.6, 0, 0), G('pesado', 6, 2.6, 1, 1), G('espia', 3, 3, 8, 0), G('cazador', 6, 1.3, 6, 1)),
        W(18, 55, G('realista', 24, 0.55, 0, 0), G('realista', 24, 0.55, 1, 1), G('caballeria', 10, 0.8, 10, 0), G('veterano', 2, 5, 10, 1)),
        W(18, 60, G('caballeria', 12, 0.7, 0, 0), G('caballeria', 12, 0.7, 1, 1), G('pesado', 6, 2.6, 8, 0), G('cirujano', 2, 5, 8, 1), G('veterano', 2, 5, 14, 0)),
        W(0, 120, G('realista', 24, 0.55, 0, 0), G('realista', 24, 0.55, 1, 1), G('pesado', 5, 2.8, 8, 1), G('veterano', 2, 5, 10, 0), G('cazador', 8, 1.2, 4, 1), G('jefe8', 1, 1, 24, 0))
      ],
      stars: [{ t: 'lives', n: 12 }, { t: 'early', n: 4 }, { t: 'maxTowers', n: 11 }],
      speaker: 'Sargento',
      talk: 'Es la jornada decisiva. Vienen con todo: infantería pesada, caballería y su general en persona.',
      info: [
        'El 5 de abril de 1818, en los llanos del Maipo, cerca de Santiago, el Ejército Unido de los Andes y de Chile enfrentó al ejército realista.',
        'La victoria patriota fue decisiva: aseguró la independencia de Chile.',
        'Además hizo posible la posterior expedición libertadora al Perú.'
      ]
    },

    /* =================== ACTO III =================== */
    {
      act: 2, name: 'Las cadenas del Paraná', year: '1845', place: 'Vuelta de Obligado', theme: 'rio',
      gold: 450, lives: 20, hpMul: 1.7, chainX: 430, mapPos: [622, 502],
      slots: [[190, 370], [360, 372], [540, 370], [730, 372], [910, 370], [1090, 372]],
      paths: [
        { pts: [[-40, 160], [260, 180], [460, 290], [720, 250], [940, 170], [1320, 200]] },
        { naval: true, pts: [[1350, 500], [900, 492], [500, 506], [-70, 496]] }
      ],
      waves: [
        W(14, 30, G('casaca', 12, 1.0, 0, 0)),
        W(14, 35, G('frances', 8, 1.1, 0, 0), G('lancha', 1, 1, 4, 1)),
        W(15, 35, G('casaca', 14, 0.8, 0, 0), G('explorador', 8, 0.6, 6, 0), G('lancha', 2, 8, 2, 1)),
        W(15, 40, G('pesado_fr', 3, 3.5, 0, 0), G('frances', 10, 0.9, 2, 0), G('cazador', 4, 1.6, 8, 0)),
        W(16, 45, G('bergantin', 1, 1, 0, 1), G('casaca', 16, 0.7, 2, 0), G('cirujano', 1, 1, 8, 0)),
        W(16, 45, G('frances', 14, 0.8, 0, 0), G('lancha', 3, 6, 0, 1), G('veterano', 1, 1, 8, 0)),
        W(16, 50, G('pesado_fr', 5, 3, 0, 0), G('explorador', 12, 0.5, 6, 0), G('bergantin', 1, 1, 4, 1), G('lancha', 2, 6, 10, 1)),
        W(17, 50, G('casaca', 20, 0.6, 0, 0), G('frances', 12, 0.8, 4, 0), G('espia', 2, 4, 8, 0), G('bergantin', 2, 10, 2, 1)),
        W(18, 55, G('pesado_fr', 5, 3, 0, 0), G('cazador', 6, 1.4, 4, 0), G('cirujano', 1, 1, 8, 0), G('lancha', 4, 5, 0, 1)),
        W(0, 110, G('frances', 20, 0.6, 0, 0), G('casaca', 16, 0.7, 4, 0), G('veterano', 2, 5, 10, 0), G('bergantin', 1, 1, 2, 1), G('jefe9', 1, 1, 12, 1))
      ],
      stars: [{ t: 'lives', n: 12 }, { t: 'noSell' }, { t: 'heroAlive' }],
      speaker: 'Artillero',
      talk: '¡Humo en el río! Las cadenas los van a frenar un rato: que las baterías de la barranca aprovechen.',
      info: [
        'El 20 de noviembre de 1845 una escuadra anglo-francesa intentó remontar el río Paraná por la fuerza para comerciar con el interior.',
        'La Confederación Argentina, gobernada por Juan Manuel de Rosas, la esperó en un recodo del río: la Vuelta de Obligado.',
        'Allí se tendieron tres gruesas cadenas sobre barcazas, de orilla a orilla, para cerrar el paso.'
      ]
    },
    {
      act: 2, name: 'El desembarco', year: '1845', place: 'Vuelta de Obligado', theme: 'rio',
      gold: 480, lives: 20, hpMul: 2.1, mapPos: [582, 466],
      slots: [[150, 372], [460, 372], [650, 370], [840, 372], [1040, 370]],
      paths: [
        { pts: [[300, 408], [310, 330], [480, 250], [700, 290], [900, 200], [1320, 180]] },
        { pts: [[-40, 140], [220, 160], [480, 250], [700, 290], [900, 200], [1320, 180]] },
        { naval: true, pts: [[1350, 510], [860, 498], [420, 512], [-70, 500]] }
      ],
      waves: [
        W(14, 30, G('frances', 10, 1.0, 0, 0), G('casaca', 8, 1.1, 2, 1)),
        W(14, 35, G('explorador', 10, 0.5, 0, 1), G('frances', 10, 0.9, 2, 0)),
        W(15, 40, G('casaca', 14, 0.8, 0, 1), G('pesado_fr', 3, 3.5, 0, 0), G('lancha', 2, 7, 4, 2)),
        W(15, 40, G('frances', 14, 0.8, 0, 0), G('cazador', 5, 1.5, 3, 1), G('cirujano', 1, 1, 8, 0)),
        W(16, 45, G('pesado_fr', 4, 3, 0, 1), G('frances', 12, 0.8, 1, 0), G('espia', 2, 4, 8, 0), G('lancha', 2, 7, 2, 2)),
        W(16, 45, G('casaca', 20, 0.6, 0, 1), G('frances', 14, 0.7, 2, 0), G('veterano', 1, 1, 8, 0), G('bergantin', 1, 1, 4, 2)),
        W(16, 50, G('explorador', 14, 0.4, 0, 0), G('explorador', 14, 0.4, 1, 1), G('pesado_fr', 5, 2.8, 6, 0), G('cirujano', 2, 5, 8, 1)),
        W(17, 50, G('frances', 20, 0.6, 0, 0), G('casaca', 18, 0.65, 1, 1), G('veterano', 2, 5, 8, 1), G('lancha', 3, 6, 2, 2)),
        W(18, 55, G('pesado_fr', 6, 2.6, 0, 0), G('pesado_fr', 4, 2.8, 1, 1), G('cazador', 8, 1.2, 4, 0), G('espia', 3, 3, 10, 1), G('bergantin', 2, 9, 2, 2)),
        W(0, 110, G('frances', 22, 0.55, 0, 0), G('casaca', 20, 0.6, 1, 1), G('pesado_fr', 5, 2.8, 8, 0), G('veterano', 2, 5, 10, 1), G('lancha', 3, 6, 4, 2), G('jefe10', 1, 1, 22, 0))
      ],
      stars: [{ t: 'lives', n: 12 }, { t: 'early', n: 3 }, { t: 'noSell' }],
      speaker: 'Vigía',
      talk: '¡Botes en la costa! Están desembarcando para tomar las baterías. Que no suban la barranca.',
      info: [
        'Las defensas de Obligado, dirigidas por Lucio N. Mansilla, contaban con cuatro baterías sobre la barranca y unos dos mil hombres.',
        'Tras varias horas de cañoneo, y con las baterías casi sin munición, tropas de la escuadra desembarcaron para tomarlas.',
        'La infantería y la caballería criollas resistieron el asalto en la costa.'
      ]
    },
    {
      act: 2, name: 'Las baterías de la barranca', year: '1845', place: 'Vuelta de Obligado', theme: 'rio',
      gold: 520, lives: 20, hpMul: 1.35, mapPos: [626, 430],
      slots: [[170, 372], [350, 370], [530, 372], [710, 370], [890, 372], [1080, 370]],
      paths: [
        { pts: [[1320, 120], [1040, 160], [900, 300], [660, 300], [520, 170], [300, 190], [160, 300], [-40, 290]] },
        { naval: true, pts: [[-70, 496], [400, 508], [820, 492], [1350, 504]] }
      ],
      waves: [
        W(14, 35, G('frances', 12, 1.0, 0, 0), G('lancha', 1, 1, 2, 1)),
        W(14, 35, G('casaca', 14, 0.8, 0, 0), G('explorador', 8, 0.5, 6, 0), G('lancha', 2, 7, 0, 1)),
        W(15, 40, G('bergantin', 1, 1, 0, 1), G('frances', 14, 0.8, 2, 0), G('cazador', 5, 1.5, 6, 0)),
        W(15, 45, G('vapor', 1, 1, 0, 1), G('pesado_fr', 4, 3, 2, 0), G('casaca', 12, 0.8, 6, 0)),
        W(16, 45, G('frances', 18, 0.65, 0, 0), G('cirujano', 1, 1, 6, 0), G('espia', 2, 4, 8, 0), G('lancha', 3, 6, 2, 1)),
        W(16, 50, G('bergantin', 2, 9, 0, 1), G('pesado_fr', 5, 2.8, 2, 0), G('veterano', 1, 1, 8, 0)),
        W(16, 50, G('vapor', 1, 1, 0, 1), G('lancha', 3, 6, 6, 1), G('casaca', 22, 0.55, 2, 0), G('cazador', 6, 1.3, 6, 0)),
        W(17, 55, G('frances', 20, 0.6, 0, 0), G('explorador', 14, 0.4, 6, 0), G('veterano', 2, 5, 8, 0), G('bergantin', 2, 8, 2, 1)),
        W(17, 55, G('vapor', 2, 12, 0, 1), G('pesado_fr', 6, 2.6, 2, 0), G('cirujano', 2, 5, 8, 0), G('espia', 2, 4, 12, 0)),
        W(18, 60, G('frances', 22, 0.55, 0, 0), G('casaca', 18, 0.6, 4, 0), G('veterano', 2, 5, 10, 0), G('lancha', 4, 5, 0, 1), G('bergantin', 1, 1, 10, 1)),
        W(0, 120, G('frances', 22, 0.55, 0, 0), G('pesado_fr', 6, 2.6, 6, 0), G('cazador', 8, 1.2, 4, 0), G('veterano', 2, 5, 12, 0), G('vapor', 1, 1, 2, 1), G('jefe11', 1, 1, 14, 1))
      ],
      stars: [{ t: 'lives', n: 10 }, { t: 'maxTowers', n: 11 }, { t: 'heroAlive' }],
      speaker: 'Artillero',
      talk: 'Ahora mandan los vapores, más duros y más rápidos. Bala roja y buena puntería.',
      info: [
        'La escuadra aliada combinaba veleros con modernos vapores de guerra, y su artillería superaba en alcance y calibre a la de las baterías de la costa.',
        'Aun así, el combate se prolongó durante buena parte del día y varios buques sufrieron serias averías.',
        'El hostigamiento desde la costa siguió durante 1846 en puntos como El Tonelero y Angostura del Quebracho.'
      ]
    },
    {
      act: 2, name: 'La flota anglo-francesa', year: '1845', place: 'Vuelta de Obligado', theme: 'rio',
      gold: 600, lives: 20, hpMul: 1.45, chainX: 760, mapPos: [586, 394],
      slots: [[150, 372], [330, 370], [500, 372], [760, 370], [930, 372], [1100, 370]],
      paths: [
        { pts: [[-40, 150], [240, 170], [420, 290], [660, 260], [860, 320], [1100, 250], [1320, 270]] },
        { pts: [[630, 408], [640, 340], [660, 260], [860, 320], [1100, 250], [1320, 270]] },
        { naval: true, pts: [[1350, 500], [960, 492], [640, 508], [300, 494], [-70, 502]] }
      ],
      waves: [
        W(15, 35, G('frances', 10, 1.0, 0, 0), G('casaca', 10, 1.0, 2, 1)),
        W(15, 40, G('explorador', 10, 0.5, 0, 0), G('frances', 10, 0.9, 2, 1), G('lancha', 1, 1, 4, 2)),
        W(15, 40, G('pesado_fr', 4, 3, 0, 0), G('casaca', 16, 0.7, 1, 1), G('bergantin', 1, 1, 2, 2)),
        W(15, 45, G('frances', 18, 0.65, 0, 0), G('cazador', 6, 1.3, 3, 1), G('cirujano', 1, 1, 8, 0), G('lancha', 3, 6, 0, 2)),
        W(16, 45, G('vapor', 1, 1, 0, 2), G('pesado_fr', 5, 2.8, 2, 1), G('espia', 2, 4, 6, 0), G('casaca', 14, 0.7, 6, 0)),
        W(16, 50, G('frances', 20, 0.6, 0, 0), G('frances', 14, 0.7, 2, 1), G('veterano', 2, 5, 8, 0), G('bergantin', 2, 9, 0, 2)),
        W(16, 50, G('explorador', 16, 0.4, 0, 0), G('explorador', 12, 0.4, 1, 1), G('pesado_fr', 6, 2.6, 6, 0), G('cirujano', 2, 5, 8, 1), G('lancha', 3, 6, 2, 2)),
        W(17, 55, G('vapor', 2, 12, 0, 2), G('casaca', 24, 0.5, 2, 0), G('cazador', 8, 1.2, 4, 1), G('veterano', 1, 1, 10, 1)),
        W(17, 55, G('frances', 24, 0.5, 0, 0), G('pesado_fr', 6, 2.6, 2, 1), G('espia', 3, 3, 8, 0), G('bergantin', 2, 8, 0, 2), G('lancha', 2, 6, 12, 2)),
        W(18, 60, G('pesado_fr', 8, 2.4, 0, 0), G('frances', 18, 0.6, 2, 1), G('cirujano', 2, 5, 6, 0), G('veterano', 2, 5, 10, 1), G('vapor', 1, 1, 4, 2)),
        W(20, 70, G('casaca', 26, 0.5, 0, 0), G('frances', 22, 0.55, 1, 1), G('cazador', 8, 1.2, 6, 0), G('veterano', 2, 5, 12, 0), G('vapor', 2, 10, 0, 2), G('bergantin', 2, 8, 6, 2)),
        W(0, 150, G('frances', 24, 0.5, 0, 0), G('pesado_fr', 6, 2.6, 4, 1), G('veterano', 2, 5, 10, 0), G('espia', 3, 3, 12, 1), G('lancha', 3, 6, 0, 2), G('jefe12', 1, 1, 10, 2))
      ],
      stars: [{ t: 'lives', n: 10 }, { t: 'noSell' }, { t: 'early', n: 4 }],
      speaker: 'Sargento',
      talk: 'Viene la flota entera con su buque insignia. Si aguanta la barranca, aguanta la patria.',
      info: [
        'La escuadra logró cortar las cadenas y seguir río arriba, pero la expedición resultó un fracaso comercial y fue hostigada desde la costa durante meses.',
        'Gran Bretaña (1849) y Francia (1850) terminaron firmando tratados que reconocieron la soberanía argentina sobre sus ríos interiores.',
        'En recuerdo de aquella jornada, el 20 de noviembre se conmemora el Día de la Soberanía Nacional.'
      ]
    }
  ];

  /* ---------- Texto y evaluación de objetivos ---------- */
  TD.objectiveText = function (o) {
    switch (o.t) {
      case 'lives': return 'Terminá con al menos ' + o.n + ' vidas';
      case 'noSell': return 'No vendas ninguna torre';
      case 'heroAlive': return 'Que tu héroe no caiga';
      case 'maxTowers': return 'Usá como máximo ' + o.n + ' torres';
      case 'early': return 'Adelantá ' + o.n + ' oleadas (5 s o más antes)';
    }
    return '';
  };
  TD.objectiveMet = function (o, g) {
    switch (o.t) {
      case 'lives': return g.lives >= o.n;
      case 'noSell': return g.stats.sold === 0;
      case 'heroAlive': return g.stats.heroDeaths === 0;
      case 'maxTowers': return g.stats.maxTowers <= o.n;
      case 'early': return g.stats.early >= o.n;
    }
    return false;
  };

  /* Bandera de cada época: 'es' (1806-07, bandera española), 'cb' (celeste y blanca
   * sin sol, 1812-1817) y 'arg' (con Sol de Mayo, incorporado en 1818). */
  TD.flagFor = function (lvl) {
    if (lvl.act === 0) return 'es';
    return parseInt(lvl.year, 10) < 1818 ? 'cb' : 'arg';
  };

  // Resumen de una oleada para el HUD: "Casaca roja ×8 · Explorador ×3"
  TD.waveSummary = function (wave) {
    var count = {}, order = [], i, g;
    for (i = 0; i < wave.groups.length; i++) {
      g = wave.groups[i];
      if (!count[g.type]) { count[g.type] = 0; order.push(g.type); }
      count[g.type] += g.n;
    }
    return order.map(function (t) { return TD.ENEMIES[t].name + ' ×' + count[t]; }).join(' · ');
  };
})();
