/* Noticias: destacada, filtro por categoría y lectura completa. */
(function () {
  const U = App.util;
  const local = { cat: "Todas" };

  function abrir(n) {
    App.modal(`${U.portada(n, "")}
      <div class="modal-body">
        <div class="row" style="flex-wrap:wrap"><span class="badge ${U.claseCategoria(n.cat)}">${n.cat}</span><span class="mono small muted">${U.fecha(n.fecha)} · ${n.min} min de lectura</span></div>
        <h2 style="font-size:26px">${U.esc(n.titulo)}</h2>
        <p class="small muted">Por Comunicación Institucional UTSC</p>
        ${n.cuerpo.map(p => `<p>${U.esc(p)}</p>`).join("")}
      </div>
      <div class="modal-foot"><button class="btn btn-outline" data-m="compartir">${I("share-2")} Compartir</button><button class="btn btn-dark" data-m="cerrar">Cerrar</button></div>`,
      { ancho: true, acciones: { compartir: () => App.capacidades.compartir({ titulo: n.titulo, texto: n.resumen, hash: "noticias?n=" + n.id }) } });
    const c = document.querySelector(".overlay .cover"); if (c) c.style.height = "200px";
  }

  App.views.noticias = {
    titulo: "Noticias",
    render() {
      const todas = App.CATALOGO.noticias;
      const cats = ["Todas", ...new Set(todas.map(n => n.cat))];
      if (!todas.length) return `<div class="wrap page"><div class="card empty"><div class="big">${I("wifi-off")}</div><b>No se pudieron cargar las noticias.</b><span>Conéctate a internet una vez para guardarlas en este dispositivo.</span></div></div>`;
      const dest = todas.find(n => n.destacada) || todas[0];
      const lista = todas.filter(n => n !== dest || local.cat !== "Todas").filter(n => local.cat === "Todas" || n.cat === local.cat);
      return `<div class="wrap page stack" style="gap:28px">
        ${local.cat === "Todas" ? `<button class="news-hero" data-a="abrir" data-id="${dest.id}">
          <div class="cover" style="background:linear-gradient(135deg,${dest.grad[0]},${dest.grad[1]})"><span aria-hidden="true" style="font-size:120px;opacity:.5">${I(dest.ico)}</span></div>
          <div class="content"><span class="badge b-blue" style="justify-self:start">${dest.cat}</span><h2>${U.esc(dest.titulo)}</h2><p>${U.esc(dest.resumen)}</p>
          <span class="mono small" style="color:#c3c7d6">${U.fecha(dest.fecha)} · ${dest.min} min de lectura</span></div></button>` : ""}
        ${App.contenido.actualizado ? `<p class="small muted row" style="gap:6px;margin-top:-12px">${I("refresh-cw")} Actualizado el ${U.fecha(App.contenido.actualizado)}${navigator.onLine ? "" : " · mostrando la copia guardada"}</p>` : ""}
        <div class="chips">${cats.map(c => `<button class="chip ${local.cat === c ? "active" : ""}" data-a="cat" data-cat="${c}">${c}</button>`).join("")}</div>
        <div class="news-grid">${lista.map(n => `<button class="card news-card" data-a="abrir" data-id="${n.id}">
            ${U.portada(n, "")}
            <div class="body"><div class="row"><span class="badge ${U.claseCategoria(n.cat)}">${n.cat}</span><span class="mono small muted">${n.min} min</span></div>
            <h3>${U.esc(n.titulo)}</h3><p>${U.esc(n.resumen)}</p><span class="mono small muted">${U.fecha(n.fecha)}</span></div></button>`).join("")}</div>
      </div>`;
    },
    alMostrar() {
      const id = App.consulta().get("n");   // enlace compartido: #noticias?n=ID
      const n = id && App.CATALOGO.noticias.find(x => x.id === id);
      if (n) abrir(n);
    },
    acciones: {
      cat(el) { local.cat = el.dataset.cat; App.render(); },
      abrir(el) { abrir(App.CATALOGO.noticias.find(n => n.id === el.dataset.id)); }
    }
  };
})();
