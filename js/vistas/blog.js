/* Blog estudiantil: publicar, filtrar, buscar, reaccionar, comentar y reportar. */
(function () {
  const U = App.util;
  const local = { cat: "Todos", q: "", imagen: null, abiertos: {} };
  // Publicaciones de la comunidad que no están cargadas en este prototipo (para las tendencias).
  const BASE_TENDENCIAS = { ExamenFinal: 36, HackNL2026: 23, ServicioSocial: 16, RedesNeuronales: 11, UTSC2026: 8 };
  // Moderación automática: palabras que bloquean la publicación.
  const BLOQUEADAS = ["idiota", "estupido", "estúpido", "pendejo", "imbecil", "imbécil", "puto", "verga"];

  function hashtags(txt) { return (txt.match(/#[\wáéíóúñÁÉÍÓÚÑ]+/g) || []).map(t => t.slice(1)); }
  function textoConTags(txt) {
    return U.esc(txt).replace(/#([\wáéíóúñÁÉÍÓÚÑ]+)/g, '<button class="link hashtag" data-a="tag" data-tag="$1">#$1</button>');
  }
  function filtrados() {
    const q = local.q.toLowerCase().replace(/^#/, "");
    return App.state.posts.slice().sort((a, b) => b.t - a.t)
      .filter(p => local.cat === "Todos" || p.cat === local.cat)
      .filter(p => !q || (p.titulo + " " + p.texto + " " + p.autor).toLowerCase().includes(q));
  }
  function tendencias() {
    const c = Object.assign({}, BASE_TENDENCIAS);
    App.state.posts.forEach(p => hashtags(p.texto).forEach(t => c[t] = (c[t] || 0) + 1));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }
  function moderar(txt) {
    const t = txt.toLowerCase();
    return BLOQUEADAS.some(p => new RegExp("\\b" + p + "\\b").test(t));
  }

  function tarjeta(p) {
    const s = App.state, mostrarMat = !p.propio || s.ajustes.mostrarMatricula;
    const abierto = local.abiertos[p.id];
    return `<article class="card post">
      ${p.imagen ? `<img class="post-img" src="${p.imagen}" alt="">` : p.portada ? U.portada(p.portada, "post-img") : ""}
      <div class="post-body">
        <div class="row-between"><div class="row"><span class="avatar">${U.iniciales(p.autor)}</span>
          <div><b style="display:block;font-size:14px">${U.esc(p.autor)}</b><span class="mono small muted">${mostrarMat ? p.matricula + " · " : ""}${U.hace(p.t)}</span></div></div>
          <span class="badge ${U.claseCategoria(p.cat)}">${p.cat}</span></div>
        <h3>${U.esc(p.titulo)}</h3>
        <p style="white-space:pre-line">${textoConTags(p.texto)}</p>
        <div class="post-foot">
          <button class="react-btn ${p.liked ? "on" : ""}" data-a="like" data-id="${p.id}" aria-pressed="${p.liked}" aria-label="Me gusta">${p.liked ? I("heart") : I("heart")} ${p.likes}</button>
          <button class="react-btn" data-a="comentarios" data-id="${p.id}" aria-expanded="${!!abierto}">${I("message-circle")} ${p.comentarios.length}</button>
          <span class="grow"></span>
          ${p.propio ? `<button class="react-btn" data-a="eliminar" data-id="${p.id}">${I("trash-2")} Eliminar</button>`
            : p.reportado ? `<span class="small muted">${I("flag")} Reportada</span>` : `<button class="react-btn" data-a="reportar" data-id="${p.id}">${I("flag")} Reportar</button>`}
        </div>
        ${abierto ? `<div class="comments">${p.comentarios.map(c => `<div class="comment"><span class="avatar avatar-sm">${U.iniciales(c.autor)}</span>
            <div class="grow"><b>${U.esc(c.autor)}</b> <span class="small muted">${U.hace(c.t)}</span><p class="small">${U.esc(c.txt)}</p></div></div>`).join("")}</div>` : ""}
        <form class="comment-form" data-f="comentario" data-id="${p.id}"><label class="grow"><span hidden>Comentario</span><input class="input" name="txt" maxlength="300" placeholder="Escribe un comentario..." autocomplete="off"></label><button class="btn btn-teal">Enviar</button></form>
      </div></article>`;
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
          <div class="card card-pad"><label for="bp-q" hidden>Buscar publicaciones</label><input class="input" id="bp-q" type="search" placeholder="Buscar publicaciones..." value="${U.esc(local.q)}" data-c="buscar"></div>
          <div class="card card-pad"><h2 style="font-size:19px;margin-bottom:10px">Tendencias esta semana</h2>
            ${tendencias().map(([t, n]) => `<div class="trend"><button data-a="tag" data-tag="${U.esc(t)}">#${U.esc(t)}</button><span class="mono small muted">${n} posts</span></div>`).join("")}</div>
          <div class="card-dark card-pad stack"><h2 style="font-size:19px">Comunidad UTSC</h2>
            <div class="stats" style="justify-content:space-between"><div class="stat"><b class="c-orange">1,284</b><small>Alumnos</small></div><div class="stat"><b class="c-orange">${App.state.posts.length + 338}</b><small>Posts este mes</small></div><div class="stat"><b class="c-orange">98%</b><small>Aprobados</small></div></div>
            <div class="notice-box">${I("shield-check")} Moderación automática activa. Todo el contenido es revisado antes de publicarse.</div></div>
        </aside>
      </div></div>`;
    },
    acciones: {
      cat(el) { local.cat = el.dataset.cat; App.render(); },
      tag(el) { local.q = "#" + el.dataset.tag; local.cat = "Todos"; App.render(); window.scrollTo(0, 0); },
      like(el) { const p = App.state.posts.find(x => x.id === el.dataset.id); p.liked = !p.liked; p.likes += p.liked ? 1 : -1; App.guardar(); App.refrescar("lista"); },
      comentarios(el) { local.abiertos[el.dataset.id] = !local.abiertos[el.dataset.id]; App.refrescar("lista"); },
      quitarImg() { local.imagen = null; App.render(); },
      cancelar() { local.imagen = null; App.render(); },
      reportar(el) {
        App.confirmar("Reportar publicación", "El equipo de moderación revisará la publicación. Quien la escribió no sabrá que la reportaste.", "Reportar", () => {
          const p = App.state.posts.find(x => x.id === el.dataset.id); p.reportado = true;
          App.registrar("Reportaste la publicación «" + p.titulo + "»"); App.guardar(); App.refrescar("lista"); App.toast("Gracias. La publicación se envió a moderación.");
        });
      },
      eliminar(el) {
        App.confirmar("Eliminar publicación", "La publicación y sus comentarios se borrarán. Esta acción no se puede deshacer.", "Eliminar", () => {
          App.state.posts = App.state.posts.filter(x => x.id !== el.dataset.id); App.guardar(); App.render(); App.toast("Publicación eliminada");
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
      publicar(f) {
        const ok = App.validar(f, {
          titulo: v => v.length < 5 ? "Escribe un título de al menos 5 caracteres." : "",
          texto: v => v.length < 10 ? "Escribe un mensaje de al menos 10 caracteres." : ""
        });
        if (!ok) return;
        const titulo = f.titulo.value.trim(), texto = f.texto.value.trim();
        if (moderar(titulo + " " + texto)) { App.toast("La moderación automática detectó lenguaje ofensivo. Edita tu publicación.", "error"); return; }
        const u = App.state.usuario;
        App.state.posts.unshift({ id: "p" + Date.now(), autor: U.nombreCompleto(), matricula: u.matricula, propio: true, cat: f.cat.value, t: Date.now(),
          titulo, texto, imagen: local.imagen, portada: null, likes: 0, liked: false, reportado: false, comentarios: [] });
        local.imagen = null; local.cat = "Todos"; local.q = "";
        App.registrar("Publicaste «" + titulo + "» en el blog"); App.guardar(); App.render(); App.toast("Publicación publicada");
      },
      comentario(f) {
        const txt = f.txt.value.trim();
        if (!txt) { f.txt.focus(); return; }
        if (moderar(txt)) { App.toast("Tu comentario tiene lenguaje ofensivo y no se publicó.", "error"); return; }
        const p = App.state.posts.find(x => x.id === f.dataset.id);
        p.comentarios.push({ autor: U.nombreCompleto(), txt, t: Date.now() });
        local.abiertos[p.id] = true;
        App.guardar(); App.refrescar("lista");
      }
    }
  };
})();
