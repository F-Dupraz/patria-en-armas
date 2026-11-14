/* ============================================================
 * sw.js — service worker de Patria en Armas.
 * Hace que el juego se pueda instalar y jugar sin conexión.
 *
 * Estrategia «primero la red»: con conexión siempre se baja la versión
 * nueva (y se guarda una copia); sin conexión se usa la copia guardada.
 * Así no hay que tocar ningún número de versión al publicar cambios.
 *
 * Si agregás un archivo al juego, sumalo también a ARCHIVOS.
 * ============================================================ */
'use strict';

var CACHE = 'patria-en-armas-v1';

var ARCHIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/util.js',
  'js/pwa.js',
  'js/audio.js',
  'js/data.js',
  'js/levels.js',
  'js/draw.js',
  'js/art.js',
  'js/juice.js',
  'js/logros.js',
  'js/entities.js',
  'js/towers.js',
  'js/game.js',
  'js/ui.js',
  'js/main.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

// Al instalarse guarda todo el juego: desde ese momento funciona sin conexión.
self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ARCHIVOS); })
      .then(function () { return self.skipWaiting(); })
  );
});

// Al activarse borra copias de versiones viejas del caché.
self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) { return k !== CACHE ? caches.delete(k) : null; }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  ev.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.ok) {
          var copia = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copia); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) {
          // una navegación sin copia propia cae en la página del juego
          return hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error());
        });
      })
  );
});
