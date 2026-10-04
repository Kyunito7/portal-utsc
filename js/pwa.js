/* PWA: registro del service worker, aviso de versión nueva y aviso de conexión.
   (semana 3: service worker y caché) */
(function () {
  App.pwa = { version: null, listoOffline: false };

  // ---------- Barra de avisos (abajo, encima del contenido) ----------
  function barra(id, html, clase) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.className = "barra-pwa " + (clase || "");
    el.innerHTML = html;
    requestAnimationFrame(() => el.classList.add("visible"));
    return el;
  }
  function quitarBarra(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("visible");
    setTimeout(() => el.remove(), 300);
  }

  // ---------- Conexión ----------
  function revisarConexion(primeraVez) {
    document.documentElement.classList.toggle("sin-conexion", !navigator.onLine);
    if (!navigator.onLine) {
      barra("barra-conexion", `${I("wifi-off")}<span><b>Sin conexión.</b> Estás usando la copia guardada del portal.</span>`, "offline");
    } else {
      quitarBarra("barra-conexion");
      if (!primeraVez) App.toast("Conexión recuperada");
    }
  }
  window.addEventListener("online", () => revisarConexion(false));
  window.addEventListener("offline", () => revisarConexion(false));

  // ---------- Service worker ----------
  if (!("serviceWorker" in navigator)) return;   // navegadores muy viejos: el portal funciona igual, sin offline

  function avisarActualizacion(sw) {
    const el = barra("barra-version", `${I("sparkles")}<span><b>Hay una versión nueva del portal.</b></span>
      <button class="btn btn-sm btn-primary" type="button">Actualizar</button>
      <button class="btn btn-sm btn-ghost" type="button" aria-label="Después">Después</button>`, "nueva");
    const [actualizar, despues] = el.querySelectorAll("button");
    actualizar.addEventListener("click", () => { actualizar.disabled = true; sw.postMessage("ACTIVAR"); });
    despues.addEventListener("click", () => quitarBarra("barra-version"));
  }

  // Cuando el service worker nuevo toma el control, se recarga la página una sola vez.
  let recargando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recargando) return;
    recargando = true;
    location.reload();
  });

  window.addEventListener("load", async () => {
    revisarConexion(true);
    let reg;
    try {
      reg = await navigator.serviceWorker.register("sw.js", { scope: "./" });
    } catch (e) {
      console.warn("No se pudo registrar el service worker:", e.message);
      return;
    }

    // Ya había una versión nueva esperando (por ejemplo, de una visita anterior).
    if (reg.waiting && navigator.serviceWorker.controller) avisarActualizacion(reg.waiting);

    reg.addEventListener("updatefound", () => {
      const nuevo = reg.installing;
      nuevo.addEventListener("statechange", () => {
        if (nuevo.state !== "installed") return;
        if (navigator.serviceWorker.controller) avisarActualizacion(nuevo);   // actualización
        else App.toast("Listo: el portal ya funciona sin internet");          // primera instalación
      });
    });

    // Busca actualizaciones cada vez que vuelves a la pestaña.
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update(); });

    await navigator.serviceWorker.ready;
    App.pwa.listoOffline = true;
    App.pwa.version = await pedirVersion();
  });

  function pedirVersion() {
    return new Promise(resolve => {
      const ctrl = navigator.serviceWorker.controller;
      if (!ctrl) return resolve(null);
      const canal = new MessageChannel();
      canal.port1.onmessage = e => resolve(e.data);
      ctrl.postMessage("VERSION", [canal.port2]);
      setTimeout(() => resolve(null), 1500);
    });
  }

  // Información para la ventana de Configuración.
  App.pwa.resumen = async function () {
    const nombres = await caches.keys();
    let archivos = 0;
    for (const n of nombres) archivos += (await (await caches.open(n)).keys()).length;
    let usado = null;
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      usado = e.usage;
    }
    return { activo: !!navigator.serviceWorker.controller, version: App.pwa.version || (await pedirVersion()), archivos, usado };
  };
  App.pwa.mb = bytes => bytes == null ? "—" : (bytes / 1048576).toFixed(1) + " MB";
})();
