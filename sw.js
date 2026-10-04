/* =====================================================================
   Service worker del Portal UTSC
   (semana 3: service worker y caché · semana 4: datos offline y estrategias ·
    semana 5: notificaciones y push)

   Qué hace:
   1. INSTALACIÓN: guarda en caché el "app shell" (HTML, CSS, JS, fuentes,
      iconos y fotos) para que el portal abra aunque no haya internet.
   2. ACTIVACIÓN: borra los cachés de versiones anteriores.
   3. PETICIONES (fetch): decide de dónde sale cada archivo:
      - Páginas (navegación) ........ red primero; si falla, la copia guardada.
      - Archivos del app shell ...... caché primero (son los que precargamos).
      - Imágenes nuevas ............. caché primero y se guardan al pedirlas
                                      (máximo 60 para no llenar el teléfono).
      - Contenido (data/*.json) ..... stale-while-revalidate: responde con la
                                      copia guardada al instante y en segundo
                                      plano descarga la nueva; si cambió, avisa.
      - /api/ (pagos, etc.) ......... solo red: nunca se guarda en caché.
      - Lo demás del mismo sitio .... red primero; si falla, caché.
      - Otros sitios (IEEE, Moodle…) no se tocan.

   IMPORTANTE: cada vez que cambies un archivo del proyecto, sube VERSION.
   Así el navegador detecta el service worker nuevo y aparece el aviso
   "Hay una versión nueva" en el portal.
   4. SYNC (Background Sync): cuando vuelve la conexión, le pide a la página
      que envíe la cola de acciones pendientes (ver js/sync.js).
   ===================================================================== */

const VERSION = "v1.7.0";
const CACHE_SHELL = `utsc-shell-${VERSION}`;
const CACHE_IMAGENES = "utsc-imagenes";      // se conserva entre versiones
const CACHE_DATOS = "utsc-datos";            // contenido (noticias/eventos), se conserva entre versiones
const DATOS = ["./data/noticias.json"];
const MAX_IMAGENES = 60;

// Todo lo que necesita el portal para funcionar sin conexión.
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/iconos.js",
  "./js/datos.js",
  "./js/bd.js",
  "./js/cuentas.js",
  "./js/nucleo.js",
  "./js/capacidades.js",
  "./js/contenido.js",
  "./js/sync.js",
  "./js/moderacion.js",
  "./js/comunidad.js",
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
  "./js/vistas/moderacion.js",
  "./js/app.js",
  "./js/pwa.js",
  "./fonts/outfit.woff2",
  "./fonts/fraunces.woff2",
  "./fonts/jetbrains-mono-400.woff2",
  "./fonts/jetbrains-mono-700.woff2",
  "./img/logo-utsc.png",
  "./img/campus-aereo.webp",
  "./img/campus-montana.webp",
  "./img/iconos/icono-32.png",
  "./img/iconos/icono-192.png",
  "./img/iconos/icono-512.png",
  "./img/iconos/icono-maskable-512.png",
  "./img/iconos/apple-touch-icon.png"
];

// ---------- 1. Instalación: precarga del app shell ----------
self.addEventListener("install", evento => {
  evento.waitUntil(
    Promise.all([
      caches.open(CACHE_SHELL)
        // { cache: "reload" } evita que se guarde una copia vieja del caché HTTP
        .then(cache => cache.addAll(APP_SHELL.map(url => new Request(url, { cache: "reload" })))),
      // Las noticias también quedan listas desde la instalación.
      caches.open(CACHE_DATOS)
        .then(cache => cache.addAll(DATOS.map(url => new Request(url, { cache: "reload" }))))
    ])
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
  if (url.pathname.includes("/api/")) return;             // solo red: pagos y datos en vivo

  if (url.pathname.includes("/data/")) {
    evento.respondWith(staleWhileRevalidate(evento));
  } else if (req.mode === "navigate") {
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

// Contenido: responde con lo guardado (rápido, funciona offline) y lo actualiza en segundo plano.
async function staleWhileRevalidate(evento) {
  const req = evento.request;
  const cache = await caches.open(CACHE_DATOS);
  const guardado = await cache.match(req, { ignoreSearch: true });
  const textoViejo = guardado ? guardado.clone().text() : Promise.resolve(null);

  const actualizar = fetch(req, { cache: "no-cache" }).then(async resp => {
    if (!resp.ok) return resp;
    const nuevo = await resp.clone().text();
    const viejo = await textoViejo;
    await cache.put(req, resp.clone());
    if (viejo !== null && viejo !== nuevo) avisarClientes({ tipo: "CONTENIDO_ACTUALIZADO", url: req.url });
    return resp;
  }).catch(() => null);

  if (guardado) {
    evento.waitUntil(actualizar);                 // el SW sigue vivo hasta terminar de actualizar
    const headers = new Headers(guardado.headers);
    headers.set("X-Desde-Cache", "1");
    return new Response(guardado.body, { status: guardado.status, statusText: guardado.statusText, headers });
  }
  return (await actualizar) || new Response('{"noticias":[],"eventos":[]}',
    { status: 503, headers: { "Content-Type": "application/json" } });
}

async function avisarClientes(mensaje) {
  const clientes = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clientes.forEach(c => c.postMessage(mensaje));
}

// ---------- 4. Background Sync ----------
// js/sync.js registra la etiqueta "utsc-cola" cuando guarda algo sin conexión.
// El navegador dispara este evento cuando vuelve la red (aunque la pestaña esté en segundo plano).
self.addEventListener("sync", evento => {
  if (evento.tag === "utsc-cola") evento.waitUntil(avisarClientes({ tipo: "SINCRONIZAR" }));
});

// ---------- 5. Notificaciones (semana 5) ----------
// Al tocar una notificación: si el portal ya está abierto se enfoca y va a la sección;
// si no, se abre una ventana nueva.
self.addEventListener("notificationclick", evento => {
  evento.notification.close();
  const destino = new URL((evento.notification.data && evento.notification.data.url) || "./index.html", self.location.href);
  evento.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const abierta = ventanas.find(c => new URL(c.url).pathname === destino.pathname);
    if (abierta) {
      await abierta.focus();
      abierta.postMessage({ tipo: "NAVEGAR", hash: destino.hash.slice(1) });
    } else {
      await self.clients.openWindow(destino.href);
    }
  })());
});

// Push desde un servidor (lista para cuando exista el backend con Supabase):
// el servidor manda { "titulo": "...", "texto": "...", "ir": "blog" } y aquí se muestra.
self.addEventListener("push", evento => {
  let datos = {};
  try { datos = evento.data ? evento.data.json() : {}; } catch (e) { datos = { texto: evento.data && evento.data.text() }; }
  evento.waitUntil(self.registration.showNotification(datos.titulo || "Portal UTSC", {
    body: datos.texto || "Tienes un aviso nuevo.",
    icon: "img/iconos/icono-192.png", badge: "img/iconos/icono-32.png", lang: "es-MX",
    data: { url: "./index.html#" + (datos.ir || "inicio") }
  }));
});
