/* Capacidades avanzadas de la PWA — semana 5.
   1. Instalar la app (beforeinstallprompt / instrucciones en iPhone).
   2. Notificaciones del sistema (mostradas por el service worker) e insignia en el icono.
   3. Compartir publicaciones y noticias (Web Share API) y recibir lo que otra app comparte (share_target).
   4. Medición de rendimiento real de cada visita (Core Web Vitals: LCP, CLS, INP).
   Todo es "mejora progresiva": si el navegador no lo soporta, el portal funciona igual. */
window.App = window.App || {};

(function () {
  const K = App.capacidades = {};

  // ======================================================================
  // 1. Instalación
  // ======================================================================
  let avisoInstalar = null;
  K.instalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  K.esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  K.puedeInstalar = () => !K.instalada() && (!!avisoInstalar || K.esIOS());

  // Chrome/Edge/Android avisan que se puede instalar; se guarda el aviso para usarlo con nuestro botón.
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    avisoInstalar = e;
    K.pintarBotones();
  });
  window.addEventListener("appinstalled", () => {
    avisoInstalar = null;
    K.pintarBotones();
    if (App.toast) App.toast("¡Listo! El Portal UTSC quedó instalado como app");
  });

  K.instalar = async function () {
    if (avisoInstalar) {
      avisoInstalar.prompt();
      const { outcome } = await avisoInstalar.userChoice;
      if (outcome === "accepted") avisoInstalar = null;
      K.pintarBotones();
      return;
    }
    // iPhone/iPad no tienen botón automático: se explica cómo hacerlo.
    App.modal(`<div class="modal-head row">${I("smartphone")}<h2>Instala el Portal UTSC</h2></div>
      <div class="modal-body"><ol class="pasos">
        ${K.esIOS()
          ? `<li>Toca el botón <b>Compartir</b> ${I("share")} de Safari.</li><li>Elige <b>Agregar a pantalla de inicio</b>.</li><li>Toca <b>Agregar</b>.</li>`
          : `<li>Abre el menú del navegador (los tres puntos).</li><li>Elige <b>Instalar app</b> o <b>Agregar a pantalla principal</b>.</li><li>Confirma con <b>Instalar</b>.</li>`}
      </ol><p class="small muted">Se abre como una app, sin barra del navegador, y funciona sin conexión.</p></div>
      <div class="modal-foot"><button class="btn btn-dark" data-m="cerrar">Entendido</button></div>`);
  };

  // Muestra u oculta los botones "Instalar app" del menú, inicio y configuración.
  K.pintarBotones = function () {
    const si = K.puedeInstalar();
    document.querySelectorAll("[data-solo-instalable]").forEach(el => el.hidden = !si);
  };

  // ======================================================================
  // 2. Notificaciones del sistema
  // ======================================================================
  K.soportaNotificaciones = () => "Notification" in window && "serviceWorker" in navigator;
  K.permiso = () => K.soportaNotificaciones() ? Notification.permission : "no-soportado";

  K.pedirPermiso = async function () {
    if (!K.soportaNotificaciones()) { App.toast("Tu navegador no permite notificaciones.", "error"); return "no-soportado"; }
    const r = await Notification.requestPermission();
    if (r === "granted") {
      App.state.ajustes.notifSistema = true; App.guardar();
      K.mostrar({ titulo: "Notificaciones activadas", texto: "Así te llegarán los avisos del portal.", ir: "inicio", etiqueta: "prueba" });
    } else if (r === "denied") {
      App.toast("Bloqueaste las notificaciones. Puedes activarlas en el candado de la barra de direcciones.", "error");
    }
    return r;
  };

  // Muestra una notificación usando el service worker (así funciona también con la app instalada en Android).
  K.mostrar = async function ({ titulo, texto, ir, etiqueta }) {
    if (K.permiso() !== "granted" || !App.state || App.state.ajustes.notifSistema === false) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(titulo, {
        body: texto, icon: "img/iconos/icono-192.png", badge: "img/iconos/icono-32.png", lang: "es-MX",
        tag: etiqueta || "utsc-" + Date.now(), data: { url: "./index.html#" + (ir || "inicio") }
      });
      return true;
    } catch (e) { return false; }
  };

  // Cada aviso nuevo del portal también puede salir como notificación del sistema.
  //   urgente = true → sale aunque estés viendo el portal (por ejemplo, decisiones de moderación).
  K.avisoNuevo = function (n, urgente) {
    if (!urgente && document.visibilityState === "visible") return;
    K.mostrar({ titulo: n.mod === "Moderación" ? "Moderación · Portal UTSC" : n.mod + " · Portal UTSC", texto: n.txt, ir: n.ir, etiqueta: n.id });
  };

  // Número en el icono de la app instalada (avisos sin leer).
  K.insignia = function (n) {
    try {
      if (!("setAppBadge" in navigator)) return;
      if (n) navigator.setAppBadge(n); else navigator.clearAppBadge();
    } catch (e) { }
  };

  // Al tocar una notificación, el service worker pide abrir la sección.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", e => {
      if (e.data && e.data.tipo === "NAVEGAR" && e.data.hash) location.hash = e.data.hash;
    });
  }

  // ======================================================================
  // 3. Compartir
  // ======================================================================
  K.enlace = hash => location.origin + location.pathname + "#" + hash;
  K.compartir = async function ({ titulo, texto, hash }) {
    const url = K.enlace(hash);
    if (navigator.share) {
      try { await navigator.share({ title: titulo, text: texto, url }); return; }
      catch (e) { if (e.name === "AbortError") return; }   // el usuario cerró el menú
    }
    App.util.copiar(url);   // computadoras sin menú de compartir: se copia el enlace
  };

  // share_target: si otra app compartió algo con el portal instalado, llega como ?titulo=&texto=&url=
  K.leerCompartido = function () {
    const q = new URLSearchParams(location.search);
    if (!q.has("titulo") && !q.has("texto") && !q.has("url")) return null;
    const datos = { titulo: q.get("titulo") || "", texto: [q.get("texto"), q.get("url")].filter(Boolean).join("\n") };
    history.replaceState(null, "", location.pathname + "#blog");   // limpia la dirección
    return datos;
  };
  K.recibido = K.leerCompartido();

  // ======================================================================
  // 4. Rendimiento: Core Web Vitals de esta visita
  // ======================================================================
  const M = K.metricas = { lcp: null, cls: 0, inp: null, fcp: null, ttfb: null, carga: null };
  function observar(tipo, fn, extra) {
    try { new PerformanceObserver(l => l.getEntries().forEach(fn)).observe(Object.assign({ type: tipo, buffered: true }, extra || {})); } catch (e) { }
  }
  observar("largest-contentful-paint", e => M.lcp = Math.round(e.startTime));
  observar("paint", e => { if (e.name === "first-contentful-paint") M.fcp = Math.round(e.startTime); });
  observar("layout-shift", e => { if (!e.hadRecentInput) M.cls = +(M.cls + e.value).toFixed(3); });
  // INP aproximado: la interacción más lenta (clic, tecla) de la visita.
  observar("event", e => { if (e.interactionId) M.inp = Math.max(M.inp || 0, Math.round(e.duration)); }, { durationThreshold: 16 });
  window.addEventListener("load", () => setTimeout(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav) { M.ttfb = Math.round(nav.responseStart); M.carga = Math.round(nav.loadEventEnd || nav.duration); }
  }, 0));

  // Umbrales oficiales de web.dev: bueno / necesita mejorar / malo
  const UMBRAL = { lcp: [2500, 4000], fcp: [1800, 3000], cls: [0.1, 0.25], inp: [200, 500], ttfb: [800, 1800] };
  K.calificar = (clave, v) => v == null ? "na" : v <= UMBRAL[clave][0] ? "bueno" : v <= UMBRAL[clave][1] ? "medio" : "malo";
})();
