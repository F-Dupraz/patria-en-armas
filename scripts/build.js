'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const SALIDA = path.join(RAIZ, 'dist');

// Lista blanca: archivos y carpetas que viajan a producción.
const PUBLICAR = [
    'index.html',
'manifest.webmanifest',
'sw.js',
'css',
'js',
'icons'
];

// 1) dist limpio
fs.rmSync(SALIDA, { recursive: true, force: true });
fs.mkdirSync(SALIDA, { recursive: true });

// 2) copiar la lista blanca
for (const item of PUBLICAR) {
    const origen = path.join(RAIZ, item);
    if (!fs.existsSync(origen)) {
        console.error('ERROR: falta ' + item + ' en el repo.');
        process.exit(1);
    }
    fs.cpSync(origen, path.join(SALIDA, item), { recursive: true });
}

// 3) verificación: todo lo que el service worker precachea tiene que existir en dist
const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
const bloque = sw.match(/var ARCHIVOS = \[([\s\S]*?)\];/);
let faltan = [];
if (bloque) {
    const rutas = [...bloque[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
    faltan = rutas.filter(r => r !== './' && !fs.existsSync(path.join(SALIDA, r)));
}
if (faltan.length) {
    console.error('ERROR: el sw.js lista archivos que no están en dist/: ' + faltan.join(', '));
    process.exit(1);
}

// 4) verificación: que no se haya colado nada de tools/
if (fs.existsSync(path.join(SALIDA, 'tools'))) {
    console.error('ERROR: tools/ apareció en dist/.');
    process.exit(1);
}

console.log('OK: dist/ listo. Se publican: ' + PUBLICAR.join(', '));
