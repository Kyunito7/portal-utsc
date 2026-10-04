/* Blog estudiantil: publicar, filtrar, buscar, reaccionar, comentar y reportar.
   Las publicaciones están en App.comunidad (compartidas entre cuentas) y pasan por
   App.moderacion antes de publicarse. */
(function () {
  const U = App.util, C = App.comunidad, MOD = App.moderacion;
  const local = { cat: "Todos", q: "", imagen: null, abiertos: {} };
  // Publicaciones de la comunidad que no están cargadas en este prototipo (para las tendencias).
  const BASE_TENDENCIAS = { ExamenFinal: 36, HackNL2026: 23, ServicioSocial: 16, RedesNeuronales: 11, UTSC2026: 8 };

  function hashtags(txt) { return (txt.match(/#[\wáéíóúñÁÉÍÓÚÑ]+/g) || []).map(t => t.slice(1)); }
  function textoConTags(txt) {
    return U.esc(txt).replace(/#([\wáéíóúñÁÉÍÓÚÑ]+)/g, '<button class="link hashtag" data-a="tag" data-tag="$1">#$1</button>');
  }
  function filtrados() {
    const q = local.q.toLowerCase().replace(/^#/, "");
    return C.visibles()
      .filter(p => local.cat === "Todos" || p.cat === local.cat)
      .filter(p => !q || (p.titulo + " " + p.texto + " " + p.autor).toLowerCase().includes(q));
  }
  function tendencias() {
    const c = Object.assign({}, BASE_TENDENCIAS);
    C.posts.filter(p => MOD.estado(p) === "aprobado").forEach(p => hashtags(p.texto).forEach(t => c[t] = (c[t] || 0) + 1));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }

  // Etiqueta y explicación para lo propio que no está aprobado.
  function etiquetaModeracion(x) {
    const e = MOD.estado(x);
    if (e === "revision") return `<span class="badge b-yellow" title="Solo tú lo ves hasta que un moderador lo apruebe">${I("shield-alert")} En revisión</span>`;
    if (e === "rechazado") return `<span class="badge b-red">${I("shield-x")} Rechazada</span>`;
    return "";
  }
  function avisoModeracion(x) {
    const e = MOD.estado(x);
    if (e === "revision") return `<div class="mod-nota">${I("shield-alert")}<span><b>Solo tú la ves.</b> Un moderador la revisará pronto${x.mod.motivos && x.mod.motivos.length ? ". Motivo: " + U.esc(x.mod.motivos.join(", ")) : ""}.</span></div>`;
    if (e === "rechazado") return `<div class="mod-nota rechazo">${I("shield-x")}<span><b>Un moderador rechazó esta publicación.</b> ${U.esc(x.mod.nota || x.mod.motivos.join(", "))}</span></div>`;
    return "";
  }

  function comentario(c) {
    const propio = C.esMio(c), e = MOD.estado(c);
    return `<div class="comment ${e !== "aprobado" ? "en-revision" : ""}"><span class="avatar avatar-sm">${U.iniciales(c.autor)}</span>
      <div class="grow"><b>${U.esc(c.autor)}</b> <span class="small muted">${c.pendiente ? I("clock") + " Pendiente de enviar" : U.hace(c.t)}</span>
      ${propio && e === "revision" ? `<span class="small c-yellow"> · ${I("shield-alert")} En revisión, solo tú lo ves</span>` : ""}
      ${propio && e === "rechazado" ? `<span class="small c-red"> · ${I("shield-x")} Rechazado por moderación</span>` : ""}
      <p class="small">${U.esc(c.txt)}</p></div></div>`;
  }

  function tarjeta(p) {
    const s = App.state, propio = C.esMio(p), mostrarMat = !propio || s.ajustes.mostrarMatricula;
    const abierto = local.abiertos[p.id], liked = C.meGusta(p), comentarios = C.comentariosVisibles(p);
    return `<article class="card post ${MOD.estado(p) !== "aprobado" ? "post-revision" : ""}" id="post-${p.id}">
      ${p.imagen ? `<img class="post-img" src="${p.imagen}" alt="" loading="lazy" decoding="async">` : p.portada ? U.portada(p.portada, "post-img") : ""}
      <div class="post-body">
        <div class="row-between"><div class="row"><span class="avatar">${U.iniciales(p.autor)}</span>
          <div><b style="display:block;font-size:14px">${U.esc(p.autor)}</b><span class="mono small muted">${mostrarMat ? p.matricula + " · " : ""}${U.hace(p.t)}</span></div></div>
          <span class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">${p.pendiente ? U.pendiente() : ""}${propio ? etiquetaModeracion(p) : ""}<span class="badge ${U.claseCategoria(p.cat)}">${p.cat}</span></span></div>
        ${propio ? avisoModeracion(p) : ""}
        <h3>${U.esc(p.titulo)}</h3>
        <p style="white-space:pre-line">${textoConTags(p.texto)}</p>
        <div class="post-foot">
          <button class="react-btn ${liked ? "on" : ""}" data-a="like" data-id="${p.id}" aria-pressed="${liked}" aria-label="Me gusta">${I("heart")} ${p.likes}</button>
          <button class="react-btn" data-a="comentarios" data-id="${p.id}" aria-expanded="${!!abierto}">${I("message-circle")} ${comentarios.length}</button>
          ${MOD.estado(p) === "aprobado" && !p.pendiente ? `<button class="react-btn" data-a="compartir" data-id="${p.id}" aria-label="Compartir">${I("share-2")} <span class="solo-ancho">Compartir</span></button>` : ""}
          <span class="grow"></span>
          ${propio ? `<button class="react-btn" data-a="eliminar" data-id="${p.id}">${I("trash-2")} Eliminar</button>`
            : C.yaReporte(p) ? `<span class="small muted">${I("flag")} Reportada</span>` : `<button class="react-btn" data-a="reportar" data-id="${p.id}">${I("flag")} Reportar</button>`}
        </div>
        ${abierto ? `<div class="comments">${comentarios.map(comentario).join("")}</div>` : ""}
        ${MOD.estado(p) === "aprobado" ? `<form class="comment-form" data-f="comentario" data-id="${p.id}"><label class="grow"><span hidden>Comentario</span><input class="input" name="txt" maxlength="300" placeholder="Escribe un comentario..." autocomplete="off"></label><button class="btn btn-teal">Enviar</button></form>` : ""}
      </div></article>`;
  }

  // Cuando el servidor confirma, se quita la marca de "pendiente".
  App.cola.alConfirmar("publicacion", d => {
    const p = C.buscar(d.id);
    if (p) { p.pendiente = false; p.t = Date.now(); C.guardar(); }
  });
  App.cola.alConfirmar("comentario", d => {
    const p = C.buscar(d.post);
    const c = p && p.comentarios.find(x => x.id === d.id);
    if (c) { c.pendiente = false; c.t = Date.now(); C.guardar(); }
  });

  // Muestra por qué se bloqueó, dentro del formulario.
  function avisoBloqueo(form, r) {
    let a = form.querySelector(".mod-bloqueo");
    if (!a) { a = document.createElement("div"); a.className = "mod-bloqueo"; form.insertBefore(a, form.querySelector(".composer-foot") || form.lastElementChild); }
    a.innerHTML = `${I("shield-x")}<span><b>No se publicó.</b> ${U.esc(r.motivos.join(". "))}. Edita el texto y vuelve a intentarlo.</span>`;
  }

  App.views.blog = {
    titulo: "Blog Estudiantil", nav: "blog", mod: "blog",
    parciales: {
      lista() {
        const l = filtrados();
        return l.length ? l.map(tarjeta).join("") : `<div class="card empty"><div class="big">${I("search")}</div><b>No hay publicaciones con ese filtro.</b><span>Prueba con otra categoría o borra la búsqueda.</span></div>`;
      }
    },
    render() {
      const u = App.state.usuario, cats = App.CATALOGO.categoriasBlog;
      const pendientesMod = MOD.esModerador() ? C.cuantosPendientes() : 0;
      return `<div class="wrap page"><div class="blog-grid">
        <div class="stack" style="gap:20px">
          <form class="card composer" data-f="publicar" novalidate>
            <div class="row"><span class="avatar">${U.iniciales(U.nombreCompleto())}</span><div><b style="display:block;font-size:14px">${U.esc(U.nombreCompleto())}</b><span class="mono small muted">${u.matricula} · ${u.grupo}</span></div></div>
            <div class="field"><label for="bp-t" hidden>Título</label><input class="input" id="bp-t" name="titulo" maxlength="120" placeholder="Título de tu publicación" style="font-weight:600"></div>
            <div class="field"><label for="bp-x" hidden>Mensaje</label><textarea class="textarea" id="bp-x" name="texto" maxlength="2000" placeholder="Escribe tu mensaje, comparte recursos, noticias o experiencias... Usa #hashtags para que te encuentren."></textarea></div>
            ${local.imagen ? `<div class="composer-preview"><img src="${local.imagen}" alt="Vista previa de la imagen"><button type="button" class="btn btn-sm btn-dark" data-a="quitarImg">Quitar</button></div>` : ""}
            <div class="composer-foot">
              <label for="bp-c" hidden>Categoría</label><select class="select" id="bp-c" name="cat">${cats.map(c => `<option>${c}</option>`).join("")}</select>
              <label class="file-btn">${I("camera")} Imagen<input type="file" accept="image/*" data-c="imagen"></label>
              <span class="grow"></span>
              <button type="button" class="btn btn-ghost" data-a="cancelar">Cancelar</button>
              <button class="btn btn-primary">Publicar</button>
            </div>
          </form>
          <div class="chips" role="group" aria-label="Filtrar por categoría">${["Todos", ...cats].map(c => `<button class="chip ${local.cat === c ? "active" : ""}" data-a="cat" data-cat="${c}">${c}</button>`).join("")}</div>
          <div class="stack" style="gap:20px" data-p="lista">${this.parciales.lista()}</div>
        </div>
        <aside class="side-stack blog-side">
          ${MOD.esModerador() ? `<a class="card card-pad mod-acceso" href="#moderacion">${I("shield-check")}<div class="grow"><b>Panel de moderación</b><span class="small muted">${pendientesMod ? pendientesMod + " por revisar" : "Todo al día"}</span></div>${pendientesMod ? `<span class="count">${pendientesMod}</span>` : ""}</a>` : ""}
          <div class="card card-pad"><label for="bp-q" hidden>Buscar publicaciones</label><input class="input" id="bp-q" type="search" placeholder="Buscar publicaciones..." value="${U.esc(local.q)}" data-c="buscar"></div>
          <div class="card card-pad"><h2 style="font-size:19px;margin-bottom:10px">Tendencias esta semana</h2>
            ${tendencias().map(([t, n]) => `<div class="trend"><button data-a="tag" data-tag="${U.esc(t)}">#${U.esc(t)}</button><span class="mono small muted">${n} posts</span></div>`).join("")}</div>
          <div class="card-dark card-pad stack"><h2 style="font-size:19px">Comunidad UTSC</h2>
            <div class="stats" style="justify-content:space-between"><div class="stat"><b class="c-orange">1,284</b><small>Alumnos</small></div><div class="stat"><b class="c-orange">${C.visibles().length + 338}</b><small>Posts este mes</small></div><div class="stat"><b class="c-orange">98%</b><small>Aprobados</small></div></div>
            <div class="notice-box">${I("shield-check")} Moderación automática activa. Lo que tenga groserías, enlaces sospechosos o posibles amenazas pasa a revisión antes de publicarse.</div></div>
        </aside>
      </div></div>`;
    },
    // Semana 5: abrir una publicación compartida (#blog?p=ID) y recibir lo que otra app compartió.
    alMostrar(root) {
      const recibido = App.capacidades.recibido;
      if (recibido) {
        App.capacidades.recibido = null;
        const f = root.querySelector('[data-f="publicar"]');
        f.titulo.value = recibido.titulo.slice(0, 120); f.texto.value = recibido.texto.slice(0, 2000);
        f.texto.focus();
        App.toast("Se agregó lo que compartiste. Revisa y publica.");
      }
      const id = App.consulta().get("p");
      if (!id) return;
      const p = C.buscar(id);
      if (!p || !C.puedoVer(p)) { App.toast("Esa publicación ya no está disponible.", "error"); return; }
      if (!document.getElementById("post-" + id)) { local.cat = "Todos"; local.q = ""; App.refrescar("lista"); }   // estaba filtrada
      local.abiertos[id] = true; App.refrescar("lista");
      requestAnimationFrame(() => {
        const el = document.getElementById("post-" + id);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("resaltado"); setTimeout(() => el.classList.remove("resaltado"), 2400);
      });
    },
    acciones: {
      compartir(el) {
        const p = C.buscar(el.dataset.id);
        App.capacidades.compartir({ titulo: p.titulo, texto: p.titulo + " · Blog Estudiantil UTSC", hash: "blog?p=" + p.id });
      },
      cat(el) { local.cat = el.dataset.cat; App.render(); },
      tag(el) { local.q = "#" + el.dataset.tag; local.cat = "Todos"; App.render(); window.scrollTo(0, 0); },
      like(el) {
        const p = C.buscar(el.dataset.id), yo = App.state.usuario.correo;
        p.likedBy = p.likedBy || [];
        const ahora = !p.likedBy.includes(yo);
        if (ahora) p.likedBy.push(yo); else p.likedBy = p.likedBy.filter(c => c !== yo);
        p.likes += ahora ? 1 : -1;
        C.guardar(); App.refrescar("lista");
        if (ahora) {
          const b = document.querySelector(`[data-a="like"][data-id="${p.id}"]`);
          if (b) b.classList.add("pop");
          if (navigator.vibrate) navigator.vibrate(12);   // vibración corta en celular
        }
      },
      comentarios(el) { local.abiertos[el.dataset.id] = !local.abiertos[el.dataset.id]; App.refrescar("lista"); },
      quitarImg() { local.imagen = null; App.render(); },
      cancelar() { local.imagen = null; App.render(); },
      reportar(el) {
        const p = C.buscar(el.dataset.id);
        App.modal(`<div class="modal-head"><h2>Reportar publicación</h2><p class="small muted">El equipo de moderación la revisará. Quien la escribió no sabrá que la reportaste.</p></div>
          <form data-m="enviar" novalidate><div class="modal-body"><div class="field"><span class="label">¿Por qué la reportas?</span>
            <div class="radio-list">${MOD.MOTIVOS_REPORTE.map((m, i) => `<label><input type="radio" name="motivo" value="${m}" ${i ? "" : "checked"}><span>${m}</span></label>`).join("")}</div></div></div>
          <div class="modal-foot"><button type="button" class="btn btn-outline" data-m="cerrar">Cancelar</button><button class="btn btn-danger">Reportar</button></div></form>`,
          { acciones: { enviar: f => {
            p.reportes = p.reportes || [];
            p.reportes.push({ correo: App.state.usuario.correo, motivo: f.motivo.value, t: Date.now() });
            p.reportesRevisados = false;
            let oculto = false;
            if (p.reportes.length >= MOD.REPORTES_PARA_OCULTAR && MOD.estado(p) === "aprobado") {
              // Con varios reportes se oculta sola hasta que un moderador decida.
              p.mod = { estado: "revision", motivos: ["Recibió " + p.reportes.length + " reportes"], t: Date.now(), por: "Reportes de la comunidad" };
              oculto = true;
            }
            C.avisar("rol:Moderador", "Moderación", "Reportaron la publicación «" + p.titulo + "» (" + f.motivo.value.toLowerCase() + ")" + (oculto ? ". Se ocultó por acumular reportes." : "."), "moderacion");
            App.registrar("Reportaste la publicación «" + p.titulo + "»"); App.guardar(); C.guardar();
            App.cerrarModal(); App.render();
            App.toast(oculto ? "Gracias. La publicación se ocultó mientras moderación la revisa." : "Gracias. La publicación se envió a moderación.");
          } } });
      },
      eliminar(el) {
        App.confirmar("Eliminar publicación", "La publicación y sus comentarios se borrarán. Esta acción no se puede deshacer.", "Eliminar", () => {
          C.posts = C.posts.filter(x => x.id !== el.dataset.id); C.guardar(); App.render(); App.toast("Publicación eliminada");
        }, true);
      }
    },
    cambios: {
      buscar(el) { local.q = el.value; App.refrescar("lista"); },
      imagen(el) {
        const f = el.files[0];
        if (!f) return;
        if (f.size > 8 * 1024 * 1024) { App.toast("La imagen pesa más de 8 MB. Elige una más ligera.", "error"); return; }
        // Conserva lo escrito antes de volver a pintar.
        const form = el.closest("form"), borrador = { t: form.titulo.value, x: form.texto.value, c: form.cat.value };
        U.leerImagen(f, 1200).then(src => {
          local.imagen = src; App.render();
          const nf = document.querySelector('[data-f="publicar"]'); nf.titulo.value = borrador.t; nf.texto.value = borrador.x; nf.cat.value = borrador.c;
        }).catch(err => App.toast(err.message, "error"));
      }
    },
    formularios: {
      async publicar(f) {
        const ok = App.validar(f, {
          titulo: v => v.length < 5 ? "Escribe un título de al menos 5 caracteres." : "",
          texto: v => v.length < 10 ? "Escribe un mensaje de al menos 10 caracteres." : ""
        });
        if (!ok) return;
        const titulo = f.titulo.value.trim(), texto = f.texto.value.trim(), cat = f.cat.value;
        const r = await MOD.revisar({ titulo, texto });
        if (r.decision === "bloquear") { avisoBloqueo(f, r); return; }
        const u = App.state.usuario, id = "p" + Date.now();
        // La publicación aparece al instante; si hay que revisarla, solo la ve su autor.
        C.posts.unshift({ id, autor: U.nombreCompleto(), matricula: u.matricula, correo: u.correo, cat, t: Date.now(),
          titulo, texto, imagen: local.imagen, portada: null, likes: 0, likedBy: [], reportes: [], comentarios: [], pendiente: true,
          mod: { estado: r.decision === "revisar" ? "revision" : "aprobado", motivos: r.motivos, prioridad: r.prioridad, t: Date.now(), por: r.fuente } });
        if (r.decision === "revisar") C.avisar("rol:Moderador", "Moderación", "Nueva publicación en revisión: «" + titulo + "» (" + r.motivos.join(", ") + ")", "moderacion");
        local.imagen = null; local.cat = "Todos"; local.q = "";
        App.registrar("Publicaste «" + titulo + "» en el blog"); App.guardar(); C.guardar(); App.render();
        App.cola.agregar("publicacion", { id, titulo, texto, cat }, "Publicación «" + titulo + "»");
        if (r.decision === "revisar") App.toast("Tu publicación quedó en revisión. Te avisaremos cuando un moderador la apruebe.");
        else App.toast(navigator.onLine ? "Publicando…" : "Sin conexión: tu publicación se enviará cuando vuelva el internet");
      },
      async comentario(f) {
        const txt = f.txt.value.trim();
        if (!txt) { f.txt.focus(); return; }
        const r = await MOD.revisar({ texto: txt });
        if (r.decision === "bloquear") { App.toast("Tu comentario no se publicó: " + r.motivos.join(". "), "error"); return; }
        const p = C.buscar(f.dataset.id), u = App.state.usuario, id = "c" + Date.now();
        p.comentarios.push({ id, autor: U.nombreCompleto(), correo: u.correo, txt, t: Date.now(), pendiente: true,
          mod: { estado: r.decision === "revisar" ? "revision" : "aprobado", motivos: r.motivos, prioridad: r.prioridad, t: Date.now(), por: r.fuente } });
        if (r.decision === "revisar") C.avisar("rol:Moderador", "Moderación", "Nuevo comentario en revisión en «" + p.titulo + "»", "moderacion");
        local.abiertos[p.id] = true;
        C.guardar(); App.refrescar("lista");
        App.cola.agregar("comentario", { post: p.id, id, txt }, "Comentario en «" + p.titulo + "»");
        if (r.decision === "revisar") App.toast("Tu comentario quedó en revisión: " + r.motivos.join(", "));
        else if (!navigator.onLine) App.toast("Sin conexión: tu comentario se enviará después");
      }
    }
  };
})();
