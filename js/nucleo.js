/* Núcleo: guardado de datos, utilidades, ventanas modales y avisos. */
(function () {
  const CLAVE = "utsc-portal-v2";
  const CLAVE_SESION = "utsc-portal-sesion";

  // ---------- Guardado (localStorage con respaldo en memoria) ----------
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

  App.cargar = function () {
    let estado = null;
    try { estado = JSON.parse(leer(CLAVE) || "null"); } catch (e) { estado = null; }
    if (!estado || estado.version !== 2) estado = App.crearEstadoInicial();
    App.state = estado;
    App.sesion = leer(CLAVE_SESION) === "1";
  };
  App.guardar = function () {
    if (!escribir(CLAVE, JSON.stringify(App.state))) {
      // Si la imagen de una publicación llena el almacenamiento, se guarda sin imágenes.
      const copia = JSON.parse(JSON.stringify(App.state));
      copia.posts.forEach(p => { if (p.imagen) p.imagen = null; });
      escribir(CLAVE, JSON.stringify(copia));
    }
  };
  App.iniciarSesion = function () { App.sesion = true; escribir(CLAVE_SESION, "1"); };
  App.cerrarSesion = function () { App.sesion = false; escribir(CLAVE_SESION, null); };
  App.restablecer = function () {
    App.state = App.crearEstadoInicial();
    App.guardar();
  };
  App.registrar = function (txt) {
    App.state.actividad.unshift({ t: Date.now(), txt });
    App.state.actividad = App.state.actividad.slice(0, 50);
  };
  App.notificar = function (mod, txt, ir) {
    App.state.notificaciones.unshift({ id: "a" + Date.now(), mod, txt, t: Date.now(), leida: false, ir });
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
  App.academico = function () {
    const sems = App.CATALOGO.kardex;
    let suma = 0, cred = 0;
    sems.forEach(s => s.materias.forEach(([, c, cal]) => { if (cal != null && cal >= 7) { suma += cal * c; cred += c; } }));
    const total = App.CATALOGO.universidad.creditosCarrera;
    return {
      promedio: cred ? (suma / cred) : 0,
      creditos: cred,
      total,
      avance: Math.round(cred / total * 100),
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
    setTimeout(() => t.remove(), 3200);
  };

  // ---------- Ventanas modales ----------
  // contenido: HTML. acciones: { nombre: fn(el, evento, modal) } para elementos con data-m="nombre".
  App.modal = function (contenido, opciones) {
    opciones = opciones || {};
    App.cerrarModal();
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
  App.cerrarModal = function () {
    if (App._modalAbierto) { App._modalAbierto.remove(); App._modalAbierto = null; document.body.style.overflow = ""; }
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
