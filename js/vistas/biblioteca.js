/* Biblioteca: catálogo con reserva, recursos digitales y préstamos con renovación. */
(function () {
  const U = App.util;
  const local = { tab: "catalogo", cat: "Todas", q: "" };
  const MAX_PRESTAMOS = 3;
  const DIAS_PRESTAMO = 15;
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  function color(b) { return App.CATALOGO.coloresLibro[b.cat] || "#1b1f2e"; }
  function delUsuario(id) { return App.state.prestamos.find(p => p.libro === id); }
  function diasPara(iso) { const h = new Date(); h.setHours(0, 0, 0, 0); return Math.round((U.aFecha(iso) - h) / 86400000); }

  function lista() {
    const q = norm(local.q);
    const l = App.state.libros.filter(b => local.cat === "Todas" || b.cat === local.cat).filter(b => !q || norm(b.titulo + " " + b.autor + " " + b.isbn).includes(q));
    if (!l.length) return `<div class="card empty" style="grid-column:1/-1"><div class="big">${I("library")}</div><b>No encontramos libros con «${U.esc(local.q)}».</b><span>Busca por título, autor o ISBN.</span></div>`;
    return l.map(b => {
      const mio = delUsuario(b.id);
      const btn = mio ? `<button class="btn btn-outline btn-block" data-a="tab" data-t="prestamos">${mio.tipo === "reserva" ? "Reservado por ti" : "En tu préstamo"}</button>`
        : b.disp ? `<button class="btn btn-primary btn-block" data-a="reservar" data-id="${b.id}">Reservar</button>`
        : `<button class="btn btn-outline btn-block" data-a="avisar" data-id="${b.id}">${b.avisar ? "✓ Te avisaremos" : "Avisarme cuando haya"}</button>`;
      return `<div class="card book"><div class="book-cover" style="background:${color(b)}"><span class="badge">${b.cat}</span><div><b>${U.esc(b.titulo)}</b><small>${b.ed}</small></div></div>
        <div class="book-body"><h3>${U.esc(b.titulo)}</h3><span class="small muted">${U.esc(b.autor)}</span>
          <span class="avail ${b.disp ? "" : "none"}">${b.disp ? b.disp + "/" + b.total + " disponibles" : "Sin ejemplares disponibles"}</span>${btn}</div></div>`;
    }).join("");
  }

  function reservar(b) {
    if (App.state.prestamos.length >= MAX_PRESTAMOS) {
      App.toast("Ya tienes " + MAX_PRESTAMOS + " libros entre préstamos y reservas. Devuelve uno para reservar otro.", "error"); return;
    }
    App.modal(`<div class="book-cover" style="background:${color(b)};height:120px;margin:22px 22px 0;border-radius:12px"><b style="font-size:20px">${U.esc(b.titulo)}</b></div>
      <div class="modal-body"><div><h2 style="font-size:19px">${U.esc(b.titulo)}</h2><span class="muted">${U.esc(b.autor)}</span></div>
        <div class="mono small" style="background:var(--sand);border-radius:12px;padding:14px;line-height:1.8;color:var(--muted)">ISBN: ${b.isbn}<br>Edición: ${b.ed}<br>Disponibles: ${b.disp}/${b.total}<br>Periodo de préstamo: ${DIAS_PRESTAMO} días</div></div>
      <div class="modal-foot"><button class="btn btn-outline" data-m="cerrar">Cancelar</button><button class="btn btn-primary" data-m="ok">Reservar</button></div>`,
      { acciones: { ok: () => {
        b.disp -= 1;
        const v = new Date(); v.setHours(0, 0, 0, 0); v.setDate(v.getDate() + 1);
        App.state.prestamos.push({ libro: b.id, tipo: "reserva", vence: v.toISOString(), renovado: false });
        App.registrar("Reservaste el libro «" + b.titulo + "»"); App.guardar();
        App.exito(I("circle-check"), "Reserva confirmada", `<b>${U.esc(b.titulo)}</b> está apartado para ti. Recógelo en la Biblioteca (Edificio D) antes del ${U.fecha(v)}.`, "Ver mis préstamos", () => { local.tab = "prestamos"; App.render(true); });
      } } });
  }

  App.views.biblioteca = {
    titulo: "Biblioteca", migas: "Biblioteca",
    parciales: { lista },
    render() {
      const cat = App.CATALOGO, s = App.state;
      const n = s.prestamos.length;
      let cuerpo = "";
      if (local.tab === "catalogo") {
        cuerpo = `<label><span hidden>Buscar libros</span><input class="input" style="background:var(--white)" type="search" placeholder="Buscar por título, autor o ISBN..." value="${U.esc(local.q)}" data-c="buscar"></label>
          <div class="chips">${["Todas", ...cat.categoriasLibro].map(c => `<button class="chip ${local.cat === c ? "active" : ""}" data-a="cat" data-cat="${c}">${c}</button>`).join("")}</div>
          <div class="book-grid" data-p="lista">${lista()}</div>`;
      } else if (local.tab === "recursos") {
        cuerpo = `<p class="muted">Accede a bases de datos y plataformas digitales con tu correo institucional UTSC.</p>
          <div class="res-grid">${cat.recursos.map(r => `<a class="card res" href="${r.url}" target="_blank" rel="noopener"><span class="ico" aria-hidden="true">${I(r.ico)}</span>
            <div><h3>${r.nombre}</h3><p class="small muted">${r.desc}</p><span class="link small">Acceder →</span></div></a>`).join("")}</div>`;
      } else {
        cuerpo = n ? s.prestamos.map(p => {
          const b = U.libro(p.libro), d = diasPara(p.vence);
          const estado = p.tipo === "reserva" ? `<span class="due" style="color:var(--teal)">Reservado · recoger antes del ${U.fecha(p.vence)}</span>`
            : d < 0 ? `<span class="due" style="color:var(--red)">Vencido hace ${-d} ${-d === 1 ? "día" : "días"} · devuélvelo para evitar multa</span>`
            : `<span class="due">Devolver antes del ${U.fecha(p.vence)}${d <= 2 ? " (" + (d === 0 ? "hoy" : d === 1 ? "mañana" : "en 2 días") + ")" : ""}</span>`;
          const accion = p.tipo === "reserva" ? `<button class="btn btn-outline btn-sm" data-a="cancelarReserva" data-id="${b.id}">Cancelar reserva</button>`
            : d < 0 ? `<span class="badge b-red">Vencido</span>`
            : p.renovado ? `<span class="small muted">Ya renovado</span>` : `<button class="link" data-a="renovar" data-id="${b.id}">Renovar ${DIAS_PRESTAMO} días</button>`;
          return `<div class="card loan"><span class="loan-cover" style="background:${color(b)}" aria-hidden="true">${I("book")}</span>
            <div class="grow"><h3 style="font-size:17px">${U.esc(b.titulo)}</h3><span class="small muted">${U.esc(b.autor)}</span><div>${estado}</div></div>${accion}</div>`;
        }).join("") + `<p class="small muted">Puedes tener hasta ${MAX_PRESTAMOS} libros a la vez. Cada préstamo se renueva una sola vez.</p>`
          : `<div class="card empty"><div class="big">${I("book-open")}</div><b>No tienes préstamos activos.</b><button class="btn btn-primary" data-a="tab" data-t="catalogo">Explorar catálogo</button></div>`;
      }
      return `<div class="wrap page"><div class="stack" style="gap:20px;max-width:1088px;margin-inline:auto">
        <div class="tabs">
          <button class="tab ${local.tab === "catalogo" ? "active" : ""}" data-a="tab" data-t="catalogo">${I("library")} Catálogo</button>
          <button class="tab ${local.tab === "recursos" ? "active" : ""}" data-a="tab" data-t="recursos">${I("laptop")} Recursos digitales</button>
          <button class="tab ${local.tab === "prestamos" ? "active" : ""}" data-a="tab" data-t="prestamos">${I("book-open")} Mis préstamos ${n ? `<span class="count">${n}</span>` : ""}</button>
        </div>${cuerpo}</div></div>`;
    },
    acciones: {
      tab(el) { local.tab = el.dataset.t; App.render(); },
      cat(el) { local.cat = el.dataset.cat; App.render(); },
      reservar(el) { reservar(U.libro(el.dataset.id)); },
      avisar(el) { const b = U.libro(el.dataset.id); b.avisar = !b.avisar; App.guardar(); App.refrescar("lista"); if (b.avisar) App.toast("Te avisaremos cuando «" + b.titulo + "» esté disponible."); },
      renovar(el) {
        const p = delUsuario(el.dataset.id), v = U.aFecha(p.vence);
        v.setDate(v.getDate() + DIAS_PRESTAMO); p.vence = v.toISOString(); p.renovado = true;
        App.registrar("Renovaste «" + U.libro(p.libro).titulo + "»"); App.guardar(); App.render(); App.toast("Préstamo renovado hasta el " + U.fecha(v));
      },
      cancelarReserva(el) {
        const b = U.libro(el.dataset.id);
        App.confirmar("Cancelar reserva", `El ejemplar de <b>${U.esc(b.titulo)}</b> quedará disponible para otros alumnos.`, "Cancelar reserva", () => {
          App.state.prestamos = App.state.prestamos.filter(p => p.libro !== b.id); b.disp += 1;
          App.guardar(); App.render(); App.toast("Reserva cancelada");
        }, true);
      }
    },
    cambios: { buscar(el) { local.q = el.value; App.refrescar("lista"); } }
  };
})();
