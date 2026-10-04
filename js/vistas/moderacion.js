/* Panel de moderación: solo para cuentas con rol "Moderador".
   - En revisión: lo que el filtro automático (o 3 reportes) mandó a revisar.
   - Reportadas: publicaciones visibles que alguien reportó.
   - Historial: decisiones tomadas (bitácora). */
(function () {
  const U = App.util, C = App.comunidad, MOD = App.moderacion;
  const local = { tab: "revision" };

  function buscarItem(postId, comId) {
    const post = C.buscar(postId);
    return { post, item: comId ? post && post.comentarios.find(c => c.id === comId) : post };
  }

  function tarjetaRevision({ tipo, post, item }) {
    const alta = item.mod.prioridad === "alta";
    const ids = `data-post="${post.id}" ${tipo === "comentario" ? `data-com="${item.id}"` : ""}`;
    return `<article class="card mod-item ${alta ? "urgente" : ""}">
      <div class="row-between" style="flex-wrap:wrap;gap:8px">
        <div class="row"><span class="avatar">${U.iniciales(item.autor)}</span><div><b style="display:block;font-size:14px">${U.esc(item.autor)}</b>
          <span class="mono small muted">${tipo === "comentario" ? "Comentario en «" + U.esc(post.titulo) + "»" : "Publicación · " + post.cat} · ${U.hace(item.t)}</span></div></div>
        <span class="row" style="gap:6px">${alta ? `<span class="badge b-red">${I("siren")} Urgente</span>` : ""}<span class="badge b-yellow">${U.esc(item.mod.por)}</span></span>
      </div>
      ${tipo === "post" ? `<h3>${U.esc(item.titulo)}</h3>` : ""}
      <p class="mod-texto">${U.esc(tipo === "post" ? item.texto : item.txt)}</p>
      <ul class="mod-motivos">${item.mod.motivos.map(m => `<li>${I("triangle-alert")} ${U.esc(m)}</li>`).join("")}</ul>
      ${(item.reportes || []).length ? `<p class="small muted">${I("flag")} ${item.reportes.length} reporte(s): ${U.esc([...new Set(item.reportes.map(r => r.motivo))].join(", "))}</p>` : ""}
      <div class="row mod-acciones">
        <button class="btn btn-teal" data-a="aprobar" ${ids}>${I("circle-check")} Aprobar</button>
        <button class="btn btn-outline danger" data-a="rechazar" ${ids}>${I("shield-x")} Rechazar</button>
      </div>
    </article>`;
  }

  function tarjetaReportada(p) {
    const motivos = {};
    p.reportes.forEach(r => motivos[r.motivo] = (motivos[r.motivo] || 0) + 1);
    return `<article class="card mod-item">
      <div class="row-between" style="flex-wrap:wrap;gap:8px">
        <div class="row"><span class="avatar">${U.iniciales(p.autor)}</span><div><b style="display:block;font-size:14px">${U.esc(p.autor)}</b>
          <span class="mono small muted">Publicación · ${p.cat} · ${U.hace(p.t)}</span></div></div>
        <span class="badge b-red">${I("flag")} ${p.reportes.length} de ${MOD.REPORTES_PARA_OCULTAR} reportes</span>
      </div>
      <h3>${U.esc(p.titulo)}</h3>
      <p class="mod-texto">${U.esc(p.texto)}</p>
      <ul class="mod-motivos">${Object.entries(motivos).map(([m, n]) => `<li>${I("flag")} ${U.esc(m)}${n > 1 ? " ×" + n : ""}</li>`).join("")}</ul>
      <div class="row mod-acciones">
        <button class="btn btn-outline" data-a="descartar" data-post="${p.id}">${I("check")} Está bien, descartar reportes</button>
        <button class="btn btn-outline danger" data-a="rechazar" data-post="${p.id}">${I("eye-off")} Ocultar publicación</button>
      </div>
    </article>`;
  }

  function vacio(icono, titulo, texto) {
    return `<div class="card empty"><div class="big">${I(icono)}</div><b>${titulo}</b><span>${texto}</span></div>`;
  }

  function decidir(postId, comId, aprobar, motivo, nota) {
    const { post, item } = buscarItem(postId, comId);
    if (!item) return;
    const esComentario = !!comId, estabaVisible = MOD.estado(item) === "aprobado";
    item.mod = Object.assign({}, item.mod || { motivos: [] }, {
      estado: aprobar ? "aprobado" : "rechazado", t: Date.now(), por: U.nombreCompleto(), nota: aprobar ? "" : (motivo + (nota ? ": " + nota : "")) });
    if (!esComentario) item.reportesRevisados = true;
    C.registrar(aprobar ? "Aprobó" : "Rechazó", esComentario ? { txt: item.txt, autor: item.autor } : item, aprobar ? "" : item.mod.nota);
    const a = esComentario ? "o" : "a";   // "aprobado" (comentario) / "aprobada" (publicación)
    const que = esComentario ? "Tu comentario en «" + post.titulo + "»" : "Tu publicación «" + post.titulo + "»";
    C.avisar(item.correo, "Moderación", aprobar ? que + " fue aprobad" + a + " y ya es visible para todos."
      : que + (estabaVisible ? " fue retirad" + a + " del blog" : " no se publicó") + ". Motivo: " + item.mod.nota + ".", "blog");
    C.guardar();
    App.render();
    App.toast(aprobar ? "Aprobado. Se le avisó a " + item.autor.split(" ")[0] : "Rechazado. Se le avisó a " + item.autor.split(" ")[0]);
  }

  App.views.moderacion = {
    titulo: "Moderación", migas: "Panel de moderación", nav: "blog",
    render() {
      if (!MOD.esModerador()) return `<div class="wrap page">${vacio("lock", "Esta sección es solo para moderadores.", "Si necesitas reportar algo, usa el botón «Reportar» en la publicación.")}</div>`;
      const revision = C.enRevision(), reportadas = C.reportadas(), bit = C.bitacora;
      const hoy = bit.filter(b => Date.now() - b.t < 86400000).length;
      let cuerpo;
      if (local.tab === "revision") cuerpo = revision.length ? revision.map(tarjetaRevision).join("") : vacio("shield-check", "No hay nada en revisión.", "Todo lo nuevo pasó el filtro automático.");
      else if (local.tab === "reportadas") cuerpo = reportadas.length ? reportadas.map(tarjetaReportada).join("") : vacio("flag", "No hay publicaciones reportadas.", "Cuando alguien reporte algo aparecerá aquí.");
      else cuerpo = bit.length ? `<div class="card card-pad">${bit.map(b => `<div class="mod-hist ${b.accion === "Aprobó" ? "ok" : "no"}">${b.accion === "Aprobó" ? I("circle-check") : I("shield-x")}<p class="grow"><b>${U.esc(b.por)}</b> ${b.accion.toLowerCase()} «${U.esc((b.titulo || "").slice(0, 60))}» de ${U.esc(b.autor)}${b.motivo ? ` <span class="muted">· ${U.esc(b.motivo)}</span>` : ""}</p><span class="small mono muted">${U.hace(b.t)}</span></div>`).join("")}</div>`
        : vacio("history", "Aún no hay decisiones.", "Aquí quedará registrado quién aprobó o rechazó cada cosa.");
      return `<div class="wrap page"><div class="page-narrow stack" style="gap:22px">
        <div class="mod-encabezado card-dark card-pad">
          <div><h1 style="font-size:clamp(22px,3vw,28px)">${I("shield-check")} Panel de moderación</h1>
            <p style="color:#c3c7d6">El filtro automático manda aquí lo dudoso. Tú decides si se publica.</p></div>
          <div class="stats"><div class="stat"><b class="c-orange">${revision.length}</b><small>En revisión</small></div>
            <div class="stat"><b class="c-orange">${reportadas.length}</b><small>Reportadas</small></div>
            <div class="stat"><b class="c-orange">${hoy}</b><small>Decisiones hoy</small></div></div>
        </div>
        <div class="tabs">
          <button class="tab ${local.tab === "revision" ? "active" : ""}" data-a="tab" data-t="revision">${I("shield-alert")} En revisión ${revision.length ? `<span class="count">${revision.length}</span>` : ""}</button>
          <button class="tab ${local.tab === "reportadas" ? "active" : ""}" data-a="tab" data-t="reportadas">${I("flag")} Reportadas ${reportadas.length ? `<span class="count">${reportadas.length}</span>` : ""}</button>
          <button class="tab ${local.tab === "historial" ? "active" : ""}" data-a="tab" data-t="historial">${I("history")} Historial</button>
        </div>
        <div class="stack" style="gap:16px">${cuerpo}</div>
      </div></div>`;
    },
    acciones: {
      tab(el) { local.tab = el.dataset.t; App.render(); },
      aprobar(el) { decidir(el.dataset.post, el.dataset.com, true); },
      descartar(el) {
        const p = C.buscar(el.dataset.post);
        p.reportesRevisados = true;
        C.registrar("Aprobó", p, "Reportes descartados");
        C.guardar(); App.render(); App.toast("Reportes descartados. La publicación sigue visible.");
      },
      rechazar(el) {
        const { postId, comId } = { postId: el.dataset.post, comId: el.dataset.com };
        App.modal(`<div class="modal-head"><h2>Rechazar ${comId ? "comentario" : "publicación"}</h2><p class="small muted">Se ocultará para todos y se le explicará el motivo a quien la escribió.</p></div>
          <form data-m="ok" novalidate><div class="modal-body">
            <div class="field"><span class="label">Motivo</span><div class="radio-list">${MOD.MOTIVOS_RECHAZO.map((m, i) => `<label><input type="radio" name="motivo" value="${m}" ${i ? "" : "checked"}><span>${m}</span></label>`).join("")}</div></div>
            <div class="field"><label for="mr-n">Mensaje para el alumno <span class="muted" style="font-weight:400">(opcional)</span></label><textarea class="textarea" id="mr-n" name="nota" maxlength="200" style="min-height:70px" placeholder="Ej. Puedes volver a publicarlo sin el enlace."></textarea></div>
          </div><div class="modal-foot"><button type="button" class="btn btn-outline" data-m="cerrar">Cancelar</button><button class="btn btn-danger">Rechazar</button></div></form>`,
          { acciones: { ok: f => { App.cerrarModal(); decidir(postId, comId, false, f.motivo.value, f.nota.value.trim()); } } });
      }
    }
  };
})();
