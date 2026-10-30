/* Comunidad: el blog compartido (publicaciones, comentarios, reportes), los avisos entre
   usuarios y la bitácora de moderación.

   Funciona de dos formas, igual que las cuentas (js/cuentas.js):
   - MODO DEMOSTRACIÓN: todo vive en este navegador (IndexedDB, tabla "comunidad"), compartido
     entre las cuentas de prueba. Sirve para revisar el portal sin servidor.
   - MODO REAL (Supabase): el blog vive en la base de datos (supabase/blog.sql) y lo ven todos los
     alumnos desde cualquier dispositivo. Una copia se guarda en IndexedDB para abrirlo sin internet.
     Cada cambio (publicar, comentar, me gusta, reportar, eliminar, moderar) entra a la cola de
     envío (js/sync.js), así lo que se hace sin conexión se envía solo al volver el internet.

   En los dos modos el campo "correo" de publicaciones, comentarios, me gusta y reportes es la
   identidad del autor: el correo en modo demostración y el id de Supabase en modo real
   (así nunca se exponen los correos de los alumnos). Las pantallas no cambian. */
window.App = window.App || {};

(function () {
  const RESPALDO = "utsc-portal-comunidad";
  const C = App.comunidad = { posts: [], avisos: [], bitacora: [], listo: false, ultimaSync: 0 };

  // ¿Estamos en modo real con una sesión de Supabase?
  C.nube = () => !!(App.cuentas && App.cuentas.modo === "nube" && App.state && App.state.usuario.id);
  // Identidad de quien usa el portal (ver arriba).
  const yo = C.yo = () => App.state && (C.nube() ? App.state.usuario.id : App.state.usuario.correo);
  // Ids únicos aunque dos alumnos publiquen en el mismo milisegundo.
  C.nuevoId = pre => pre + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  // Dónde se guarda la copia local: el blog de prueba y el de cada cuenta real van separados.
  const llave = () => C.nube() ? "blog-nube:" + yo() : "blog";

  C.cargar = async function () {
    let datos = null;
    try { datos = await App.bd.leer("comunidad", llave()); } catch (e) { datos = null; }
    if (!datos) { try { datos = JSON.parse(localStorage.getItem(RESPALDO + (C.nube() ? ":" + yo() : "")) || "null"); } catch (e) { datos = null; } }
    if (!datos) datos = { posts: C.nube() ? [] : App.comunidadInicial(), avisos: [], bitacora: [] };
    C.posts = datos.posts || []; C.avisos = datos.avisos || []; C.bitacora = datos.bitacora || [];
    C.listo = true;
    if (!C.nube()) migrarPostsPropios();
    else {
      // Trae lo más nuevo del servidor, sin hacer esperar más de 4 s para pintar la pantalla.
      await Promise.race([C.sincronizar(), new Promise(r => setTimeout(r, 4000))]);
    }
    C.entregarAvisos();
    await C.guardarYa();
  };

  // Semanas 2-4: las publicaciones propias estaban dentro de los datos del alumno. Se pasan a la comunidad.
  function migrarPostsPropios() {
    const s = App.state;
    if (!s || !Array.isArray(s.posts)) return;
    s.posts.filter(p => p.propio && !C.posts.some(x => x.id === p.id)).forEach(p => {
      C.posts.push({ id: p.id, autor: p.autor, matricula: p.matricula, correo: yo(), cat: p.cat, t: p.t, titulo: p.titulo, texto: p.texto,
        imagen: p.imagen || null, portada: p.portada || null, likes: p.likes || 0, likedBy: p.liked ? [yo()] : [], reportes: [],
        comentarios: (p.comentarios || []).map((c, i) => Object.assign({ id: p.id + "-k" + i }, c)), pendiente: p.pendiente });
    });
    delete s.posts;
    App.guardar();
  }

  let espera = null;
  C.guardar = function () { clearTimeout(espera); espera = setTimeout(C.guardarYa, 250); };
  C.guardarYa = async function () {
    clearTimeout(espera); espera = null;
    if (!C.listo) return;
    const registro = { id: llave(), posts: C.posts, avisos: C.avisos, bitacora: C.bitacora.slice(0, 200) };
    try { if (await App.bd.disponible()) { await App.bd.guardar("comunidad", registro); return; } } catch (e) { }
    const clave = RESPALDO + (C.nube() ? ":" + yo() : "");
    try { localStorage.setItem(clave, JSON.stringify(registro)); } catch (e) {
      const copia = JSON.parse(JSON.stringify(registro)); copia.posts.forEach(p => p.imagen = null);
      try { localStorage.setItem(clave, JSON.stringify(copia)); } catch (e2) { }
    }
  };
  window.addEventListener("pagehide", () => { if (espera) C.guardarYa(); });

  // ---------- Quién ve qué ----------
  const M = () => App.moderacion;
  C.esMio = x => !!x && x.correo === yo();
  // Lo aprobado lo ven todos; lo que está en revisión o rechazado solo su autor (los moderadores lo ven en su panel).
  C.puedoVer = x => M().estado(x) === "aprobado" || C.esMio(x);
  C.visibles = () => C.posts.filter(C.puedoVer).sort((a, b) => b.t - a.t);
  C.comentariosVisibles = p => (p.comentarios || []).filter(C.puedoVer);
  C.buscar = id => C.posts.find(p => p.id === id);
  C.meGusta = p => (p.likedBy || []).includes(yo());
  C.yaReporte = p => (p.reportes || []).some(r => r.correo === yo());
  // A quién se le avisa sobre una publicación o comentario.
  C.destino = item => item.correo;

  // Cifras reales para la tarjeta "Comunidad UTSC" del blog.
  C.estadisticas = function () {
    const vis = C.visibles(), hoy = new Date(), inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime();
    const decididos = C.posts.filter(p => M().estado(p) !== "revision");
    const aprobados = decididos.filter(p => M().estado(p) === "aprobado").length;
    return {
      autores: new Set(vis.map(p => p.correo)).size,
      mes: vis.filter(p => p.t >= inicioMes).length,
      aprobados: decididos.length ? Math.round(aprobados / decididos.length * 100) : 100
    };
  };

  // ---------- Cambios que se mandan al servidor (solo modo real) ----------
  // Entran a la cola de envío: si no hay internet se mandan después.
  C.remoto = function (tipo, datos, resumen) {
    if (C.nube()) App.cola.agregar(tipo, datos, resumen);
  };

  // ---------- Avisos entre usuarios ----------
  // para: la identidad de alguien (ver arriba), o "rol:Moderador" para todos los moderadores.
  C.avisar = function (para, mod, txt, ir) {
    if (!para) return;
    const aviso = { id: C.nuevoId("av"), para, mod, txt, ir, t: Date.now(), entregadoA: [] };
    C.avisos.push(aviso);
    C.remoto("aviso", { id: aviso.id, para, mod, txt, ir }, "Aviso: " + txt.slice(0, 60));
    C.entregarAvisos();
    C.guardar();
  };
  // Pasa a "Avisos" del usuario actual los que le tocan.
  C.entregarAvisos = function () {
    if (!App.state) return 0;
    const u = App.state.usuario, id = yo();
    const vistos = App.state.avisosVistos = App.state.avisosVistos || [];
    let n = 0;
    C.avisos.forEach(a => {
      const paraMi = a.para === id || (a.para === "rol:" + u.rol);
      if (!paraMi || (a.entregadoA || []).includes(id) || vistos.includes(a.id)) return;
      (a.entregadoA = a.entregadoA || []).push(id);
      vistos.unshift(a.id);
      const nueva = { id: a.id, mod: a.mod, txt: a.txt, t: a.t, leida: false, ir: a.ir };
      App.state.notificaciones.unshift(nueva);
      if (App.capacidades) App.capacidades.avisoNuevo(nueva, true);   // viene de otra persona: siempre avisa
      n++;
    });
    App.state.avisosVistos = vistos.slice(0, 300);
    // Los avisos personales ya entregados se borran; los de rol se quedan para otros moderadores.
    C.avisos = C.avisos.filter(a => a.para.startsWith("rol:") || !(a.entregadoA || []).includes(a.para));
    if (n) { App.guardar(); C.guardar(); }
    return n;
  };

  // ---------- Pendientes para moderadores ----------
  C.enRevision = function () {
    const lista = [];
    C.posts.forEach(p => {
      if (M().estado(p) === "revision") lista.push({ tipo: "post", post: p, item: p });
      (p.comentarios || []).forEach(c => { if (M().estado(c) === "revision") lista.push({ tipo: "comentario", post: p, item: c }); });
    });
    // Primero lo urgente (amenazas), luego lo más viejo.
    return lista.sort((a, b) => ((b.item.mod.prioridad === "alta") - (a.item.mod.prioridad === "alta")) || a.item.mod.t - b.item.mod.t);
  };
  C.reportadas = () => C.posts.filter(p => M().estado(p) === "aprobado" && (p.reportes || []).length && !p.reportesRevisados);
  C.cuantosPendientes = () => C.enRevision().length + C.reportadas().length;

  C.registrar = function (accion, item, motivo) {
    const r = { t: Date.now(), por: App.util.nombreCompleto(), accion, titulo: item.titulo || item.txt, autor: item.autor, motivo: motivo || "" };
    C.bitacora.unshift(r);
    C.remoto("bitacora", r, "Bitácora: " + accion.toLowerCase() + " «" + String(r.titulo).slice(0, 40) + "»");
  };

  // Al borrar una cuenta se borran sus publicaciones y comentarios
  // (en Supabase se borran solos: ON DELETE CASCADE desde auth.users).
  C.borrarDe = function (id) {
    C.posts = C.posts.filter(p => p.correo !== id);
    C.posts.forEach(p => { p.comentarios = (p.comentarios || []).filter(c => c.correo !== id); });
    return C.guardarYa();
  };

  // =====================================================================
  // MODO REAL: lectura y escritura en Supabase (tablas de supabase/blog.sql)
  // =====================================================================
  const ms = s => s ? new Date(s).getTime() : Date.now();
  const modDe = r => ({ estado: r.mod_estado, motivos: r.mod_motivos || [], prioridad: r.mod_prioridad || "normal",
    t: ms(r.mod_t || r.creado), por: r.mod_por || "", nota: r.mod_nota || "" });

  let sincronizando = null;
  // Trae publicaciones, comentarios, me gusta, reportes, avisos y bitácora. Regresa true si pudo.
  C.sincronizar = function () {
    if (!C.nube() || !navigator.onLine) return Promise.resolve(false);
    if (sincronizando) return sincronizando;
    sincronizando = (async () => {
      const sb = await App.cuentas.cliente();
      const desde = new Date(Date.now() - 30 * 864e5).toISOString();
      const nada = Promise.resolve({ data: [] });
      const r = await Promise.all([
        sb.from("blog_publicaciones").select("*").order("creado", { ascending: false }).limit(300),
        sb.from("blog_comentarios").select("*").order("creado", { ascending: true }).limit(3000),
        sb.from("blog_reacciones").select("publicacion_id,usuario_id").limit(20000),
        sb.from("blog_reportes").select("*").limit(3000),
        sb.from("blog_avisos").select("*").gte("creado", desde).order("creado", { ascending: true }).limit(500),
        M().esModerador() ? sb.from("blog_bitacora").select("*").order("creado", { ascending: false }).limit(200) : nada
      ]);
      const fallo = r.find(x => x.error);
      if (fallo) throw fallo.error;
      const [pubs, coms, reacs, reps, avs, bit] = r.map(x => x.data || []);

      const porPost = (lista, campo) => lista.reduce((m, x) => ((m[x[campo]] = m[x[campo]] || []).push(x), m), {});
      const comsDe = porPost(coms, "publicacion_id"), reacsDe = porPost(reacs, "publicacion_id"), repsDe = porPost(reps, "publicacion_id");
      const anteriores = C.posts;
      const posts = pubs.map(p => {
        const likedBy = (reacsDe[p.id] || []).map(x => x.usuario_id);
        return { id: p.id, autor: p.autor, matricula: p.matricula || "", correo: p.autor_id, cat: p.cat, t: ms(p.creado),
          titulo: p.titulo, texto: p.texto, imagen: p.imagen || null, imagenAlt: p.imagen_alt || "", portada: null,
          likes: likedBy.length, likedBy, reportesRevisados: !!p.reportes_revisados,
          reportes: (repsDe[p.id] || []).map(x => ({ correo: x.usuario_id, motivo: x.motivo, t: ms(x.creado) })),
          comentarios: (comsDe[p.id] || []).map(c => ({ id: c.id, autor: c.autor, correo: c.autor_id, txt: c.txt, t: ms(c.creado), mod: modDe(c) })),
          mod: modDe(p) };
      });
      // Lo que este alumno hizo sin conexión y todavía no llega al servidor se conserva.
      const remotos = new Set(posts.map(p => p.id));
      anteriores.filter(p => p.pendiente && !remotos.has(p.id) && p.correo === yo()).forEach(p => posts.unshift(p));
      anteriores.forEach(p => {
        const nuevo = posts.find(x => x.id === p.id);
        if (!nuevo || nuevo === p) return;
        (p.comentarios || []).filter(c => c.pendiente && c.correo === yo() && !nuevo.comentarios.some(x => x.id === c.id))
          .forEach(c => nuevo.comentarios.push(c));
      });
      C.posts = posts;
      const yaTengo = new Map(C.avisos.map(a => [a.id, a]));
      C.avisos = avs.map(a => ({ id: a.id, para: a.para, mod: a.modulo, txt: a.txt, ir: a.ir, t: ms(a.creado),
        entregadoA: (yaTengo.get(a.id) || {}).entregadoA || [] }));
      if (M().esModerador()) C.bitacora = bit.map(b => ({ t: ms(b.creado), por: b.por, accion: b.accion, titulo: b.titulo, autor: b.autor, motivo: b.motivo || "" }));
      C.ultimaSync = Date.now();
      await C.guardarYa();
      return true;
    })().catch(e => { console.warn("No se pudo actualizar el blog:", (e && e.message) || e); return false; })
      .finally(() => { sincronizando = null; });
    return sincronizando;
  };

  // Vuelve a pedir el blog y repinta sin borrar lo que el alumno está escribiendo.
  C.refrescar = async function () {
    if (!C.nube() || !App.sesion) return;
    if (!(await C.sincronizar())) return;
    C.entregarAvisos();
    if (App._modalAbierto) return;
    const ruta = App.ruta();
    if (ruta === "blog") App.refrescar("lista");
    else if (ruta === "moderacion") App.render();
  };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") C.refrescar(); });
  window.addEventListener("online", () => C.refrescar());
  setInterval(() => {
    if (document.visibilityState === "visible" && App.sesion && ["blog", "moderacion"].includes(App.ruta())) C.refrescar();
  }, 30000);

  // Convierte un error de Supabase: los de red se reintentan; los que rechaza la base (permisos,
  // datos inválidos) no se van a arreglar solos, así que se marcan como permanentes.
  function revisar(res) {
    if (!res || !res.error) return res;
    const e = new Error(res.error.message || "Error del servidor");
    e.permanente = !!res.error.code && !/fetch|network/i.test(res.error.message || "");
    throw e;
  }
  const filaMod = m => ({ mod_estado: m.estado, mod_motivos: m.motivos || [], mod_prioridad: m.prioridad || "normal",
    mod_por: m.por || null, mod_nota: m.nota || null, mod_t: new Date(m.t || Date.now()).toISOString() });

  const ENVIAR = {
    async publicacion(sb, d) {
      const p = C.buscar(d.id);
      if (!p) return;   // la borró antes de que se enviara
      revisar(await sb.from("blog_publicaciones").upsert({ id: p.id, autor: p.autor, matricula: p.matricula || null, cat: p.cat,
        titulo: p.titulo, texto: p.texto, imagen: p.imagen || null, imagen_alt: p.imagenAlt || null,
        mod_estado: p.mod.estado, mod_motivos: p.mod.motivos || [], mod_prioridad: p.mod.prioridad || "normal", mod_por: p.mod.por || null },
        { onConflict: "id", ignoreDuplicates: true }));
    },
    async comentario(sb, d) {
      const p = C.buscar(d.post), c = p && (p.comentarios || []).find(x => x.id === d.id);
      if (!c) return;
      revisar(await sb.from("blog_comentarios").upsert({ id: c.id, publicacion_id: p.id, autor: c.autor, txt: c.txt,
        mod_estado: c.mod.estado, mod_motivos: c.mod.motivos || [], mod_prioridad: c.mod.prioridad || "normal", mod_por: c.mod.por || null },
        { onConflict: "id", ignoreDuplicates: true }));
    },
    async reaccion(sb, d) {
      if (d.si) revisar(await sb.from("blog_reacciones").upsert({ publicacion_id: d.post }, { onConflict: "publicacion_id,usuario_id", ignoreDuplicates: true }));
      else revisar(await sb.from("blog_reacciones").delete().eq("publicacion_id", d.post).eq("usuario_id", yo()));
    },
    async reporte(sb, d) {
      revisar(await sb.from("blog_reportes").upsert({ publicacion_id: d.post, motivo: d.motivo }, { onConflict: "publicacion_id,usuario_id", ignoreDuplicates: true }));
    },
    async eliminar(sb, d) {
      revisar(await sb.from("blog_publicaciones").delete().eq("id", d.id));
    },
    async moderar(sb, d) {
      const cambios = d.mod ? filaMod(d.mod) : {};
      if (d.reportesRevisados !== undefined) cambios.reportes_revisados = d.reportesRevisados;
      revisar(await sb.from(d.tabla === "comentario" ? "blog_comentarios" : "blog_publicaciones").update(cambios).eq("id", d.id));
    },
    async aviso(sb, d) {
      revisar(await sb.from("blog_avisos").upsert({ id: d.id, para: d.para, modulo: d.mod, txt: d.txt.slice(0, 400), ir: d.ir || null },
        { onConflict: "id", ignoreDuplicates: true }));
    },
    async bitacora(sb, d) {
      revisar(await sb.from("blog_bitacora").insert({ por: d.por, accion: d.accion, titulo: String(d.titulo || "").slice(0, 200), autor: d.autor, motivo: d.motivo || null }));
    }
  };
  // Lo usa App.api.enviar (js/sync.js) en modo real. Regresa null si el tipo no es del blog.
  C.enviar = async function (accion) {
    const fn = ENVIAR[accion.tipo];
    if (!fn) return null;
    const sb = await App.cuentas.cliente();
    await fn(sb, accion.datos);
    return { ok: true, recibido: Date.now(), id: accion.id };
  };
})();
