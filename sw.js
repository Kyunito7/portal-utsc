/* =====================================================================
   Service worker del Portal UTSC (semana 3: service worker y caché)

   Qué hace:
   1. INSTALACIÓN: guarda en caché el "app shell" (HTML, CSS, JS, fuentes,
      iconos y fotos) para que el portal abra aunque no haya internet.
   2. ACTIVACIÓN: borra los cachés de versiones anteriores.
   3. PETICIONES (fetch): decide de dónde sale cada archivo:
      - Páginas (navegación) ........ red primero; si falla, la copia guardada.
      - Archivos del app shell ...... caché primero (son los que precargamos).
      - Imágenes nuevas ............. caché primero y se guardan al pedirlas
                                      (máximo 60 para no llenar el teléfono).
      - Lo demás del mismo sitio .... red primero; si falla, caché.
      - Otros sitios (IEEE, Moodle…) no se tocan.

   IMPORTANTE: cada vez que cambies un archivo del proyecto, sube VERSION.
   Así el navegador detecta el service worker nuevo y aparece el aviso
   "Hay una versión nueva" en el portal.
   ===================================================================== */

const VERSION = "v1.4.0";
const CACHE_SHELL = `utsc-shell-${VERSION}`;
const CACHE_IMAGENES = "utsc-imagenes";      // se conserva entre versiones
const MAX_IMAGENES = 60;

// Todo lo que necesita el portal para funcionar sin conexión.
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/iconos.js",
  "./js/datos.js",
  "./js/cuentas.js",
  "./js/nucleo.js",
  "./js/menu-usuario.js",
  "./js/vistas/inicio.js",
  "./js/vistas/blog.js",
  "./js/vistas/noticias.js",
  "./js/vistas/directorio.js",
  "./js/vistas/contacto.js",
  "./js/vistas/kardex.js",
  "./js/vistas/horarios.js",
  "./js/vistas/pagos.js",
  "./js/vistas/tramites.js",
  "./js/vistas/biblioteca.js",
  "./js/vistas/driver.js",
  "./js/app.js",
  "./js/pwa.js",
  "./fonts/outfit.woff2",
  "./fonts/fraunces.woff2",
  "./fonts/jetbrains-mono-400.woff2",
  "./fonts/jetbrains-mono-700.woff2",
  "./img/logo-utsc.png",
  "./img/campus-aereo.jpg",
  "./img/campus-montana.jpg",
  "./img/iconos/icono-32.png",
  "./img/iconos/icono-192.png",
  "./img/iconos/icono-512.png",
  "./img/iconos/icono-maskable-512.png",
  "./img/iconos/apple-touch-icon.png"
];

// ---------- 1. Instalación: precarga del app shell ----------
self.addEventListener("install", evento => {
  evento.waitUntil(
    caches.open(CACHE_SHELL)
      // { cache: "reload" } evita que se guarde una copia vieja del caché HTTP
      .then(cache => cache.addAll(APP_SHELL.map(url => new Request(url, { cache: "reload" }))))
  );
  // No se activa solo: espera a que el usuario acepte la actualización (ver pwa.js).
});

// ---------- 2. Activación: limpieza de versiones viejas ----------
self.addEventListener("activate", evento => {
  evento.waitUntil(
    caches.keys()
      .then(nombres => Promise.all(nombres
        .filter(n => n.startsWith("utsc-shell-") && n !== CACHE_SHELL)
        .map(n => caches.delete(n))))
      .then(() => self.clients.claim())   // controla las pestañas abiertas desde ya
  );
});

// El portal pide activar la versión nueva cuando el usuario toca "Actualizar".
self.addEventListener("message", evento => {
  if (evento.data === "ACTIVAR") self.skipWaiting();
  if (evento.data === "VERSION" && evento.ports[0]) evento.ports[0].postMessage(VERSION);
});

// ---------- 3. Estrategias de caché ----------
self.addEventListener("fetch", evento => {
  const req = evento.request;
  if (req.method !== "GET") return;                       // POST, etc. van directo a la red
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // otros sitios: sin tocar

  if (req.mode === "navigate") {
    evento.respondWith(redPrimeroPagina(req));
  } else if (req.destination === "image") {
    evento.respondWith(cachePrimeroImagen(req));
  } else {
    evento.respondWith(cachePrimero(req));
  }
});

// Páginas: intenta la red (para tener el HTML más nuevo) y si no hay internet usa la copia.
async function redPrimeroPagina(req) {
  try {
    const resp = await fetch(req);
    if (resp.ok) {
      const cache = await caches.open(CACHE_SHELL);
      cache.put("./index.html", resp.clone());
    }
    return resp;
  } catch (e) {
    const copia = await caches.match("./index.html", { cacheName: CACHE_SHELL });
    return copia || new Response("<h1>Sin conexión</h1><p>Vuelve a intentarlo cuando tengas internet.</p>",
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 });
  }
}

// CSS, JS, fuentes: primero el caché (rápido y funciona offline); si no está, la red.
async function cachePrimero(req) {
  const guardado = await caches.match(req, { ignoreSearch: true });
  if (guardado) return guardado;
  try {
    const resp = await fetch(req);
    if (resp.ok) (await caches.open(CACHE_SHELL)).put(req, resp.clone());
    return resp;
  } catch (e) {
    return new Response("", { status: 504, statusText: "Sin conexión" });
  }
}

// Imágenes: caché primero; las nuevas se guardan y se borran las más viejas si hay muchas.
async function cachePrimeroImagen(req) {
  const guardado = await caches.match(req, { ignoreSearch: true });
  if (guardado) return guardado;
  try {
    const resp = await fetch(req);
    if (resp.ok) {
      const cache = await caches.open(CACHE_IMAGENES);
      await cache.put(req, resp.clone());
      recortar(cache, MAX_IMAGENES);
    }
    return resp;
  } catch (e) {
    return new Response("", { status: 504, statusText: "Sin conexión" });
  }
}

async function recortar(cache, maximo) {
  const llaves = await cache.keys();
  for (let i = 0; i < llaves.length - maximo; i++) await cache.delete(llaves[i]);
}
