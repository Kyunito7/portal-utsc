/* Cola de envío ("outbox") y sincronización — semana 4: datos offline.

   Idea: cuando el alumno publica, comenta, escribe a un departamento o pide un
   trámite, la acción se guarda primero en IndexedDB (tabla "cola") y la pantalla
   se actualiza al instante. Después la cola se envía al servidor:
     - de inmediato si hay internet,
     - cuando vuelve la conexión (evento "online"),
     - o cuando el navegador lo decida con Background Sync (Chrome/Edge/Android),
       aunque el alumno ya haya cambiado de pestaña.
   Si el envío falla, la acción se queda en la cola y se reintenta después.
   Así nunca se pierde lo que el alumno escribió sin conexión. */
(function () {
  const ETIQUETA_SYNC = "utsc-cola";

  // ---------- Servidor de prueba ----------
  // El portal todavía no tiene backend. App.api simula uno: tarda un poco y
  // falla si no hay internet. Cuando exista el servidor real, solo cambia esto
  // por un fetch("https://api…", { method: "POST", body: JSON.stringify(accion) }).
  App.api = {
    enviar(accion) {
      return new Promise((resolve, reject) => {
        if (!navigator.onLine) return reject(new Error("Sin conexión"));
        setTimeout(() => navigator.onLine ? resolve({ ok: true, recibido: Date.now(), id: accion.id }) : reject(new Error("Sin conexión")), 500);
      });
    }
  };

  // Qué hacer en la pantalla cuando el servidor confirma cada tipo de acción.
  // Las vistas registran aquí sus funciones (ver blog.js, contacto.js, tramites.js).
  const confirmadores = {};

  const cola = App.cola = { cuantos: 0, procesando: false };
  cola.alConfirmar = function (tipo, fn) { confirmadores[tipo] = fn; };

  function correoActual() { return App.state && App.state.usuario.correo; }

  // Memoria de respaldo si IndexedDB no está disponible (incógnito estricto).
  const memoria = [];
  async function leerCola(correo) {
    if (await App.bd.disponible()) return ((await App.bd.todos("cola", "correo", correo)) || []).sort((a, b) => a.t - b.t);
    return memoria.filter(a => a.correo === correo);
  }
  async function quitar(id) {
    if (await App.bd.disponible()) await App.bd.borrar("cola", id);
    const i = memoria.findIndex(a => a.id === id); if (i >= 0) memoria.splice(i, 1);
  }

  // Guarda una acción en la cola. "resumen" es el texto que ve el alumno en Pendientes.
  cola.agregar = async function (tipo, datos, resumen) {
    const accion = { id: tipo + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      correo: correoActual(), tipo, datos, resumen, t: Date.now(), intentos: 0, sinConexion: !navigator.onLine };
    if (await App.bd.disponible()) await App.bd.guardar("cola", accion); else memoria.push(accion);
    await cola.contar();
    pedirSyncEnSegundoPlano();
    cola.procesar();
    return accion;
  };

  cola.pendientes = async function () { return correoActual() ? leerCola(correoActual()) : []; };
  cola.contar = async function () {
    cola.cuantos = (await cola.pendientes()).length;
    pintarChip();
    return cola.cuantos;
  };

  // Envía todo lo pendiente, en orden. Si una falla, se detiene y lo intenta luego.
  cola.procesar = async function () {
    if (cola.procesando || !App.sesion || !navigator.onLine) return 0;
    cola.procesando = true;
    let enviadas = 0, avisar = 0;   // solo se avisa de lo que se hizo sin conexión
    try {
      for (const accion of await cola.pendientes()) {
        try {
          await App.api.enviar(accion);
        } catch (e) {
          accion.intentos++;
          if (await App.bd.disponible()) await App.bd.guardar("cola", accion);
          break;
        }
        await quitar(accion.id);
        enviadas++;
        if (accion.sinConexion || accion.intentos) avisar++;
        if (confirmadores[accion.tipo]) confirmadores[accion.tipo](accion.datos);
      }
    } finally {
      cola.procesando = false;
    }
    if (enviadas) {
      App.guardar();
      await cola.contar();
      if (App.sesion) App.render();
      if (avisar && document.visibilityState !== "visible" && App.capacidades)
        App.capacidades.mostrar({ titulo: "Portal UTSC", texto: avisar === 1 ? "Se envió lo que hiciste sin conexión." : "Se enviaron " + avisar + " acciones que hiciste sin conexión.", ir: "blog", etiqueta: "sync" });
      if (avisar) App.toast(avisar === 1 ? "Se envió 1 acción pendiente" : "Se enviaron " + avisar + " acciones pendientes");
    }
    return enviadas;
  };

  // Background Sync: el navegador despierta al service worker cuando hay red.
  async function pedirSyncEnSegundoPlano() {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg.sync) await reg.sync.register(ETIQUETA_SYNC);
    } catch (e) { /* Firefox/Safari no lo tienen: se usa el evento "online" */ }
  }
  cola.soportaBackgroundSync = () => "serviceWorker" in navigator && "SyncManager" in window;

  // ---------- Disparadores ----------
  window.addEventListener("online", () => cola.procesar());
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.tipo === "SINCRONIZAR") cola.procesar(); });
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") cola.procesar(); });

  // ---------- Indicador en el encabezado ----------
  function pintarChip() {
    const chip = document.getElementById("chip-cola");
    if (!chip) return;
    chip.hidden = !cola.cuantos;
    chip.querySelector("b").textContent = cola.cuantos;
    chip.setAttribute("aria-label", cola.cuantos + (cola.cuantos === 1 ? " acción pendiente de enviar" : " acciones pendientes de enviar"));
  }
  cola.pintarChip = pintarChip;

  // Ventana con la lista de pendientes.
  cola.mostrar = async function () {
    const U = App.util, lista = await cola.pendientes();
    App.modal(`<div class="modal-head row">${I("cloud-upload")}<div><h2>Pendientes de enviar</h2>
        <span class="small muted">${navigator.onLine ? "Hay conexión: se están enviando." : "Se enviarán solos cuando vuelva la conexión."}</span></div></div>
      <div class="modal-body">${lista.length ? `<ul class="cola-lista">${lista.map(a => `<li>${I(ICONOS[a.tipo] || "clock")}<div class="grow"><b>${U.esc(a.resumen)}</b>
        <span class="small muted">${U.hace(a.t)}${a.intentos ? " · " + a.intentos + (a.intentos === 1 ? " intento" : " intentos") : ""}</span></div></li>`).join("")}</ul>`
        : `<p class="muted">No hay nada pendiente. Todo está enviado.</p>`}</div>
      <div class="modal-foot"><button class="btn btn-outline" data-m="cerrar">Cerrar</button>
        <button class="btn btn-primary" data-m="sync" ${!lista.length || !navigator.onLine ? "disabled" : ""}>${I("refresh-cw")} Sincronizar ahora</button></div>`,
      { acciones: { sync: async el => { el.disabled = true; App.cerrarModal(); await cola.procesar(); } } });
  };
  const ICONOS = { publicacion: "notebook-pen", comentario: "message-circle", mensaje: "mail", tramite: "file-text" };
})();
