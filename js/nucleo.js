/* Núcleo: guardado de datos, utilidades, ventanas modales y avisos.
   Semana 4: los datos de cada alumno se guardan en IndexedDB (tabla "estado", ver bd.js).
   localStorage solo guarda el correo de la sesión (es pequeño y se lee al instante). */
(function () {
  const CLAVE_SESION = "utsc-portal-sesion";       // guarda el correo de quien inició sesión
  const claveVieja = correo => "utsc-portal-v3:" + correo; // donde se guardaba antes (semanas 2-3)

  function leer(clave) {
    try { return localStorage.getItem(clave); } catch (e) { return null; }
  }
  function escribir(clave, valor) {
    try {
      if (valor === null) localStorage.removeItem(clave);
      else localStorage.setItem(clave, valor);
      return true;
    } catch (e) { return false; }
  }

  // Carga la sesión guardada (si la hay) y los datos de esa cuenta.
  App.cargar = async function () {
    App.state = null;
    App.sesion = false;
    const correo = leer(CLAVE_SESION);
    if (!correo) return;
    const perfil = await App.cuentas.obtener(correo);
    if (!perfil) { escribir(CLAVE_SESION, null); return; }
    await App.abrirDatos(perfil);
    App.sesion = true;
  };

  // Lee los datos de una cuenta desde IndexedDB; si es nueva, crea sus datos de ejemplo.
  App.abrirDatos = async function (perfil) {
    let estado = null;
    try { estado = await App.bd.leer("estado", perfil.correo); } catch (e) { estado = null; }
    if (estado) delete estado.correo;
    // Migración: si venía de la versión anterior (localStorage), se mueve a IndexedDB.
    if (!estado) {
      try { estado = JSON.parse(leer(claveVieja(perfil.correo)) || "null"); } catch (e) { estado = null; }
    }
    if (!estado || estado.version !== 3) estado = App.crearEstadoInicial(perfil);
    Object.assign(estado.usuario, perfil); // el perfil de la cuenta manda
    App.state = estado;
    if (App.comunidad) await App.comunidad.cargar();   // blog compartido (moderación)
    await App.guardarYa();
    escribir(claveVieja(perfil.correo), null);
  };

  // Guardar: se agrupan los cambios seguidos (por ejemplo, varios "me gusta") en una sola escritura.
  let pendiente = null;
  App.guardar = function () {
    if (!App.state) return;
    clearTimeout(pendiente);
    pendiente = setTimeout(App.guardarYa, 250);
    if (App.comunidad && App.comunidad.listo) App.comunidad.guardar();
  };
  App.guardarYa = async function () {
    clearTimeout(pendiente); pendiente = null;
    if (!App.state) return;
    const registro = Object.assign({ correo: App.state.usuario.correo }, App.state);
    try {
      if (await App.bd.disponible()) { await App.bd.guardar("estado", registro); return; }
    } catch (e) { console.warn("IndexedDB no pudo guardar:", e); }
    // Respaldo (incógnito estricto): localStorage, sin imágenes si no caben.
    const clave = claveVieja(registro.correo);
    if (!escribir(clave, JSON.stringify(App.state))) {
      const copia = JSON.parse(JSON.stringify(App.state));
      (copia.posts || []).forEach(p => { if (p.imagen) p.imagen = null; });
      escribir(clave, JSON.stringify(copia));
    }
  };
  // Si cierras la pestaña justo después de un cambio, se guarda en ese momento.
  window.addEventListener("pagehide", () => { if (pendiente) App.guardarYa(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && pendiente) App.guardarYa(); });

  App.iniciarSesion = async function (perfil) {
    await App.abrirDatos(perfil);
    App.sesion = true;
    escribir(CLAVE_SESION, perfil.correo);
    App.pedirAlmacenamientoPersistente();
  };
  App.cerrarSesion = function () {
    if (pendiente) App.guardarYa();
    if (App.comunidad && App.comunidad.listo) App.comunidad.guardarYa();
    App.sesion = false; escribir(CLAVE_SESION, null);
  };
  App.borrarDatos = async function (correo) {
    escribir(claveVieja(correo), null);
    try {
      await App.bd.borrar("estado", correo);
      const cola = (await App.bd.todos("cola", "correo", correo)) || [];
      for (const a of cola) await App.bd.borrar("cola", a.id);
    } catch (e) { /* sin IndexedDB no hay nada que borrar */ }
  };
  App.restablecer = function () {
    const perfil = App.state.usuario;
    App.state = App.crearEstadoInicial(perfil);
    App.guardar();
  };

  // Pide al navegador que no borre los datos del portal aunque falte espacio.
  App.pedirAlmacenamientoPersistente = async function () {
    if (!navigator.storage || !navigator.storage.persist) return false;
    try { return (await navigator.storage.persisted()) || (await navigator.storage.persist()); } catch (e) { return false; }
  };
  App.registrar = function (txt) {
    App.state.actividad.unshift({ t: Date.now(), txt });
    App.state.actividad = App.state.actividad.slice(0, 50);
  };
  App.notificar = function (mod, txt, ir) {
    const n = { id: "a" + Date.now(), mod, txt, t: Date.now(), leida: false, ir };
    App.state.notificaciones.unshift(n);
    if (App.capacidades) App.capacidades.avisoNuevo(n);   // semana 5: notificación del sistema
  };

  // ---------- Utilidades ----------
  const U = App.util = {};
  U.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  };
  U.iniciales = function (nombre) {
    const p = String(nombre).trim().split(/\s+/);
    return ((p[0] || "")[0] || "").toUpperCase() + ((p[1] || "")[0] || "").toUpperCase();
  };
  U.dinero = n => "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  U.MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  U.DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  U.DIAS_LARGO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  U.aFecha = function (v) {
    if (v instanceof Date) return v;
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const [a, m, d] = v.split("-").map(Number); return new Date(a, m - 1, d); }
    return new Date(v);
  };
  U.fecha = function (v) { const d = U.aFecha(v); return d.getDate() + " " + U.MESES[d.getMonth()] + " " + d.getFullYear(); };
  U.fechaCorta = function (v) { const d = U.aFecha(v); return d.getDate() + " " + U.MESES[d.getMonth()]; };
  U.hoyISO = function () { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  U.hace = function (t) {
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return "Hace un momento";
    if (s < 3600) return "Hace " + Math.floor(s / 60) + " min";
    if (s < 86400) { const h = Math.floor(s / 3600); return "Hace " + h + (h === 1 ? " hora" : " horas"); }
    const d = Math.floor(s / 86400);
    if (d === 1) return "Ayer";
    if (d < 7) return "Hace " + d + " días";
    return U.fecha(t);
  };
  U.hora12 = function (hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h + ":" + String(m).padStart(2, "0") + " hrs";
  };
  U.claseCategoria = function (cat) {
    return ({ "Académico": "b-blue", "Vida universitaria": "b-orange", "Recursos": "b-orange", "Eventos": "b-purple", "Deportes": "b-red",
      "Tecnología": "b-purple", "Institucional": "b-blue", "Cultura": "b-purple" })[cat] || "b-teal";
  };
  U.portada = function (p, extra) {
    return `<div class="cover ${extra || ""}" style="background:linear-gradient(135deg,${p.grad[0]},${p.grad[1]})"><span aria-hidden="true">${I(p.ico)}</span></div>`;
  };
  // Etiqueta para lo que se hizo sin conexión y aún no llega al servidor (semana 4).
  U.pendiente = () => `<span class="badge b-pendiente" title="Se enviará cuando haya conexión">${I("clock")} ${navigator.onLine ? "Enviando…" : "Pendiente de enviar"}</span>`;
  U.carrera = clave => (App.CATALOGO.carreras.find(c => c.clave === clave) || {}).nombre || clave;
  U.depto = id => App.CATALOGO.departamentos.find(d => d.id === id);
  U.tramite = id => App.CATALOGO.tramites.find(t => t.id === id);
  U.libro = id => App.state.libros.find(b => b.id === id);
  U.nombreCompleto = () => App.state.usuario.nombre + " " + App.state.usuario.apellidos;
  U.copiar = function (texto) {
    const ok = () => App.toast("Copiado: " + texto);
    try {
      navigator.clipboard.writeText(texto).then(ok, () => App.toast(texto));
    } catch (e) { App.toast(texto); }
  };
  // Redimensiona una imagen subida para que no ocupe demasiado espacio.
  U.leerImagen = function (archivo, max) {
    return new Promise((resolve, reject) => {
      if (!archivo || !/^image\//.test(archivo.type)) return reject(new Error("El archivo no es una imagen."));
      const lector = new FileReader();
      lector.onerror = () => reject(new Error("No se pudo leer la imagen."));
      lector.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("No se pudo abrir la imagen."));
        img.onload = () => {
          const escala = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.8));
        };
        img.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });
  };

  // ---------- Kárdex: cálculos compartidos por Inicio, Perfil y Kárdex ----------
  // Kárdex de ejemplo según el cuatrimestre de la cuenta: los anteriores con calificación
  // y el actual "en curso". Las materias salen del catálogo (se repiten si hay más de 4).
  App.kardex = function () {
    const base = App.CATALOGO.kardex, actual = Math.max(1, Number(App.state.usuario.semestre) || 1);
    const CICLOS = ["Ene-Abr", "May-Ago", "Sep-Dic"], ROMANOS = ["", " II", " III"];
    const lista = [];
    for (let n = 1; n <= actual; n++) {
      const b = base[(n - 1) % base.length], vuelta = Math.floor((n - 1) / base.length);
      let ciclo = 2 - (actual - n), anio = 2026;          // el cuatrimestre actual es Sep-Dic 2026
      while (ciclo < 0) { ciclo += 3; anio--; }
      lista.push({
        num: n, actual: n === actual, periodo: CICLOS[ciclo] + " " + anio,
        materias: b.materias.map(([m, c, cal], i) => [m + (ROMANOS[vuelta] || ""), c,
          n === actual ? null : (cal != null ? cal : base[0].materias[i][2])])
      });
    }
    return lista;
  };
  App.academico = function () {
    const sems = App.kardex();
    let suma = 0, cred = 0;
    sems.forEach(s => s.materias.forEach(([, c, cal]) => { if (cal != null && cal >= 7) { suma += cal * c; cred += c; } }));
    const total = App.CATALOGO.universidad.creditosCarrera;
    return {
      promedio: cred ? (suma / cred) : 0,
      creditos: cred,
      total,
      avance: Math.min(100, Math.round(cred / total * 100)),
      semestre: App.state.usuario.semestre
    };
  };


  // ---------- Avisos breves ----------
  App.toast = function (msg, tipo) {
    let cont = document.querySelector(".toasts");
    if (!cont) { cont = document.createElement("div"); cont.className = "toasts"; cont.setAttribute("aria-live", "polite"); document.body.appendChild(cont); }
    const t = document.createElement("div");
    t.className = "toast" + (tipo === "error" ? " error" : "");
    t.textContent = msg;
    cont.appendChild(t);
    setTimeout(() => { t.classList.add("saliendo"); setTimeout(() => t.remove(), 220); }, 3000);
  };

  // ---------- Ventanas modales ----------
  // contenido: HTML. acciones: { nombre: fn(el, evento, modal) } para elementos con data-m="nombre".
  App.modal = function (contenido, opciones) {
    opciones = opciones || {};
    App.cerrarModal(true);
    const ov = document.createElement("div");
    ov.className = "overlay";
    ov.innerHTML = `<div class="modal ${opciones.ancho ? "wide" : ""}" role="dialog" aria-modal="true">${contenido}</div>`;
    document.body.appendChild(ov);
    document.body.style.overflow = "hidden";
    const modal = ov.firstElementChild;
    const acciones = Object.assign({ cerrar: () => App.cerrarModal() }, opciones.acciones || {});
    ov.addEventListener("click", e => {
      if (e.target === ov) return App.cerrarModal();
      const el = e.target.closest("[data-m]");
      if (el && acciones[el.dataset.m] && el.tagName !== "FORM") { e.preventDefault(); acciones[el.dataset.m](el, e, modal); }
    });
    ov.addEventListener("submit", e => {
      const f = e.target;
      e.preventDefault();
      if (f.dataset.m && acciones[f.dataset.m]) acciones[f.dataset.m](f, e, modal);
    });
    ov.addEventListener("change", e => {
      const el = e.target.closest("[data-mc]");
      if (el && acciones[el.dataset.mc]) acciones[el.dataset.mc](el, e, modal);
    });
    const foco = modal.querySelector("[autofocus], input, select, textarea, button");
    if (foco) foco.focus();
    App._modalAbierto = ov;
    return modal;
  };
  // Cierra la ventana con una animación corta (o de inmediato si se abre otra encima).
  App.cerrarModal = function (inmediato) {
    const ov = App._modalAbierto;
    if (!ov) return;
    App._modalAbierto = null;
    document.body.style.overflow = "";
    const reducir = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (inmediato || reducir) { ov.remove(); return; }
    ov.classList.add("cerrando");
    setTimeout(() => ov.remove(), 190);
  };
  App.exito = function (ico, titulo, texto, boton, alPulsar) {
    App.modal(`<div class="success"><div class="big" aria-hidden="true">${ico}</div><h2>${U.esc(titulo)}</h2><p>${texto}</p>
      <button class="btn btn-primary" data-m="ok">${U.esc(boton || "Aceptar")}</button></div>`,
      { acciones: { ok: () => { App.cerrarModal(); if (alPulsar) alPulsar(); } } });
  };
  // Confirmación dentro de la página (el navegador del artifact no muestra confirm()).
  App.confirmar = function (titulo, texto, boton, alAceptar, peligro) {
    App.modal(`<div class="modal-head"><h2>${U.esc(titulo)}</h2></div><div class="modal-body"><p class="muted">${texto}</p></div>
      <div class="modal-foot"><button class="btn btn-outline" data-m="cerrar">Cancelar</button>
      <button class="btn ${peligro ? "btn-danger" : "btn-primary"}" data-m="si">${U.esc(boton)}</button></div>`,
      { acciones: { si: () => { App.cerrarModal(); alAceptar(); } } });
  };

  // Validación sencilla: marca el campo y muestra el mensaje debajo.
  App.validar = function (form, reglas) {
    let ok = true;
    form.querySelectorAll(".field-error").forEach(e => e.remove());
    form.querySelectorAll(".invalid").forEach(e => e.classList.remove("invalid"));
    for (const [nombre, fn] of Object.entries(reglas)) {
      const el = form.elements[nombre];
      const msg = fn(el ? (el.value || "").trim() : "", el);
      if (msg) {
        ok = false;
        const nodo = el && el.length && !el.tagName ? el[0].closest(".field") : el;
        if (el && el.classList) el.classList.add("invalid");
        const err = document.createElement("div");
        err.className = "field-error";
        err.textContent = msg;
        const campo = nodo && nodo.closest ? nodo.closest(".field") : null;
        (campo || form).appendChild(err);
      }
    }
    if (!ok) { const p = form.querySelector(".invalid"); if (p) p.focus(); }
    return ok;
  };

  App.views = {};
})();
