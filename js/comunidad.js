/* Comunidad: el blog compartido entre todas las cuentas de este navegador.

   Hasta la semana 4 cada alumno tenía su propia copia del blog. Para que un
   moderador pueda revisar lo que publican los demás, el blog vive ahora en un
   solo lugar (IndexedDB, tabla "comunidad"), igual que viviría en el servidor:
     - posts     : publicaciones con sus comentarios, reportes y estado de moderación
     - avisos    : notificaciones de un usuario para otro ("tu publicación fue aprobada")
     - bitacora  : historial de decisiones de los moderadores
   Cuando exista Supabase, cargar() y guardarYa() se cambian por consultas a la base;
   las pantallas no cambian. */
window.App = window.App || {};

(function () {
  const LLAVE = "blog", RESPALDO = "utsc-portal-comunidad";
  const C = App.comunidad = { posts: [], avisos: [], bitacora: [], listo: false };
  const yo = () => App.state && App.state.usuario.correo;

  C.cargar = async function () {
    let datos = null;
    try { datos = await App.bd.leer("comunidad", LLAVE); } catch (e) { datos = null; }
    if (!datos) { try { datos = JSON.parse(localStorage.getItem(RESPALDO) || "null"); } catch (e) { datos = null; } }
    if (!datos) datos = { posts: App.comunidadInicial(), avisos: [], bitacora: [] };
    C.posts = datos.posts; C.avisos = datos.avisos || []; C.bitacora = datos.bitacora || [];
    C.listo = true;
    migrarPostsPropios();
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
    const registro = { id: LLAVE, posts: C.posts, avisos: C.avisos, bitacora: C.bitacora.slice(0, 200) };
    try { if (await App.bd.disponible()) { await App.bd.guardar("comunidad", registro); return; } } catch (e) { }
    try { localStorage.setItem(RESPALDO, JSON.stringify(registro)); } catch (e) {
      const copia = JSON.parse(JSON.stringify(registro)); copia.posts.forEach(p => p.imagen = null);
      try { localStorage.setItem(RESPALDO, JSON.stringify(copia)); } catch (e2) { }
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

  // ---------- Avisos entre usuarios ----------
  // para: un correo, o "rol:Moderador" para todos los moderadores.
  C.avisar = function (para, mod, txt, ir) {
    C.avisos.push({ id: "av" + Date.now() + Math.random().toString(36).slice(2, 5), para, mod, txt, ir, t: Date.now(), entregadoA: [] });
    C.entregarAvisos();
    C.guardar();
  };
  // Pasa a "Avisos" del usuario actual los que le tocan. (En la semana 5 esto será una notificación push.)
  C.entregarAvisos = function () {
    if (!App.state) return 0;
    const u = App.state.usuario;
    let n = 0;
    C.avisos.forEach(a => {
      const paraMi = a.para === u.correo || (a.para === "rol:" + u.rol);
      if (!paraMi || a.entregadoA.includes(u.correo)) return;
      a.entregadoA.push(u.correo);
      const nueva = { id: a.id, mod: a.mod, txt: a.txt, t: a.t, leida: false, ir: a.ir };
      App.state.notificaciones.unshift(nueva);
      if (App.capacidades) App.capacidades.avisoNuevo(nueva, true);   // viene de otra persona: siempre avisa
      n++;
    });
    // Los avisos personales ya entregados se borran; los de rol se quedan para otros moderadores.
    C.avisos = C.avisos.filter(a => a.para.startsWith("rol:") || !a.entregadoA.includes(a.para));
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
    C.bitacora.unshift({ t: Date.now(), por: App.util.nombreCompleto(), accion, titulo: item.titulo || item.txt, autor: item.autor, motivo: motivo || "" });
  };

  // Al borrar una cuenta se borran sus publicaciones y comentarios.
  C.borrarDe = function (correo) {
    C.posts = C.posts.filter(p => p.correo !== correo);
    C.posts.forEach(p => { p.comentarios = (p.comentarios || []).filter(c => c.correo !== correo); });
    return C.guardarYa();
  };
})();
