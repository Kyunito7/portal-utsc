/* Inicio: bienvenida, resumen académico, accesos rápidos, publicaciones, avisos y eventos. */
(function () {
  const U = App.util;

  App.views.inicio = {
    titulo: "Inicio",
    render() {
      const s = App.state, u = s.usuario, ac = App.academico(), cat = App.CATALOGO;
      const posts = App.comunidad.visibles().filter(p => App.moderacion.estado(p) === "aprobado").slice(0, 3);
      const hoy = U.hoyISO();
      const eventos = cat.eventos.filter(e => e.fecha >= hoy).slice(0, 3);
      const listo = s.solicitudes.find(x => x.estado === 2);
      const pendiente = s.cargos.slice().sort((a, b) => a.vence.localeCompare(b.vence))[0];
      const avisos = [
        { tipo: "Académico", txt: "Entrega de proyecto de Redes Neuronales: 16 de octubre." },
        { tipo: "Institucional", txt: "La caja estará cerrada el 20 de octubre por inventario." }
      ];
      if (listo) avisos.push({ tipo: "Trámites", txt: `Tu ${U.tramite(listo.tramite).nombre.toLowerCase()} (${listo.folio}) está lista para descarga.`, ir: "tramites" });
      if (pendiente) avisos.push({ tipo: "Pagos", txt: `${pendiente.concepto}: ${U.dinero(pendiente.monto)}, vence el ${U.fecha(pendiente.vence)}.`, ir: "pagos" });

      return `<section class="hero"><div class="wrap">
          <span class="pill-live">Portal activo · ${cat.universidad.periodo}</span>
          <h1>Bienvenido,<span>${U.esc(u.nombre)}</span></h1>
          <p>Tu espacio institucional de la ${cat.universidad.nombre}.</p>
          <div class="row"><a class="btn btn-primary btn-lg" href="#blog">${I("pencil")} Publicar en el blog</a><a class="btn btn-glass btn-lg" href="#noticias">${I("newspaper")} Ver noticias</a></div>
        </div></section>
        <div class="wrap page stack" style="gap:32px">
          ${s.ajustes.ocultarInstalar || App.capacidades.instalada() ? "" : `<section class="card instalar-app" data-solo-instalable ${App.capacidades.puedeInstalar() ? "" : "hidden"}>
            <span class="ico" aria-hidden="true">${I("smartphone")}</span>
            <div class="grow"><b>Instala el Portal UTSC</b><span class="small muted">Ábrelo como app desde tu pantalla de inicio, más rápido y sin conexión.</span></div>
            <div class="row"><button class="btn btn-ghost btn-sm" data-a="ocultarInstalar">Ahora no</button><button class="btn btn-primary btn-sm" data-a="instalar">${I("download")} Instalar</button></div>
          </section>`}
          <section class="card-dark student-card">
            <span class="avatar avatar-lg">${U.iniciales(U.nombreCompleto())}</span>
            <div class="grow"><span class="small" style="color:#a9aec2">Bienvenido de vuelta,</span><b>${U.esc(u.nombre)}</b><small>${u.matricula} · ${u.grupo} · ${U.carrera(u.carrera)}</small></div>
            <div class="stats">
              <div class="stat"><b class="c-orange">${ac.promedio.toFixed(1)}</b><small>Promedio</small></div>
              <div class="stat"><b class="c-teal">${ac.creditos}</b><small>Créditos</small></div>
              <div class="stat"><b>${ac.semestre}°</b><small>Cuatrimestre</small></div>
            </div>
          </section>
          <section><h2 class="section-title">Acceso rápido</h2>
            <div class="quick-grid">${cat.modulos.map(m => `<a class="quick" href="#${m.id}"><span class="ico" aria-hidden="true">${I(m.ico)}</span><b>${m.nombre}</b><small>${m.desc}</small></a>`).join("")}</div>
          </section>
          <section class="campus">
            <img src="img/campus-aereo.webp" alt="Vista aérea del campus de la UTSC" loading="lazy" decoding="async" width="1704" height="632">
            <div class="content"><span class="pill-live" style="justify-self:start">Nuestro campus</span>
              <h2>${cat.universidad.nombre}</h2>
              <p>${cat.universidad.direccion}. Al pie de la Sierra Madre, en ${cat.universidad.ciudad}.</p></div>
          </section>
          <div class="home-grid">
            <section class="card card-pad">
              <div class="row-between" style="margin-bottom:6px"><h2 style="font-size:20px">Últimas publicaciones</h2><a class="link" href="#blog">Ver todo</a></div>
              ${posts.map(p => `<a class="list-item" href="#blog"><span class="avatar">${U.iniciales(p.autor)}</span>
                <div class="grow"><b>${U.esc(p.titulo)}</b><span class="small muted">${U.esc(p.autor.split(" ")[0])} · <span class="mono">${U.hace(p.t)}</span></span> <span class="badge ${U.claseCategoria(p.cat)}">${p.cat}</span></div></a>`).join("")}
              <a class="btn btn-outline btn-block" style="margin-top:8px" href="#blog">${I("pencil")} Publicar en el blog</a>
            </section>
            <div class="side-stack">
              <section class="card card-pad stack"><h2 style="font-size:20px">Avisos importantes</h2>
                ${avisos.map(a => `<div class="aviso"><small>${a.tipo}</small><span>${a.ir ? `<a href="#${a.ir}" style="text-decoration:none">${U.esc(a.txt)}</a>` : U.esc(a.txt)}</span></div>`).join("")}
              </section>
              <section class="card card-pad stack"><div class="row-between"><h2 style="font-size:20px">Próximos eventos</h2><a class="link small" href="#noticias">Ver más</a></div>
                ${eventos.length ? eventos.map(e => { const d = U.aFecha(e.fecha); return `<div class="event"><div class="event-date"><b>${d.getDate()}</b>${U.MESES[d.getMonth()]}</div>
                  <div><b style="display:block">${U.esc(e.titulo)}</b><span class="small muted">${e.lugar}</span></div></div>`; }).join("")
                  : `<p class="muted small">No hay eventos próximos por ahora.</p>`}
              </section>
            </div>
          </div>
        </div>`;
    },
    acciones: {
      instalar() { App.capacidades.instalar(); },
      ocultarInstalar(el) { App.state.ajustes.ocultarInstalar = true; App.guardar(); el.closest(".instalar-app").remove(); }
    }
  };
})();
