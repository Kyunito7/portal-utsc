/* Directorio: alumnos, docentes y departamentos con búsqueda. */
(function () {
  const U = App.util;
  const local = { tab: "alumnos", carrera: "Todas", q: "" };
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  function vacio() { return `<div class="card empty" style="grid-column:1/-1"><div class="big">${I("search")}</div><b>Sin resultados para «${U.esc(local.q)}».</b><span>Revisa la ortografía o busca por otro dato.</span></div>`; }

  App.views.directorio = {
    titulo: "Directorio",
    parciales: {
      lista() {
        const cat = App.CATALOGO, q = norm(local.q);
        if (local.tab === "alumnos") {
          const u = App.state.usuario, yo = [U.nombreCompleto(), u.matricula, u.grupo, u.carrera, u.semestre];
          const l = [yo, ...cat.alumnos.filter(x => x[1] !== u.matricula)].filter(a => local.carrera === "Todas" || a[3] === local.carrera).filter(a => !q || norm(a.join(" ")).includes(q));
          return l.length ? l.map(([n, m, g, c, s]) => `<div class="card person"><span class="avatar avatar-lg" style="width:48px;height:48px;font-size:15px">${U.iniciales(n)}</span>
            <div class="grow"><b>${U.esc(n)}</b><span class="mono small muted">${m} · ${g}</span><div class="small" style="color:var(--teal);font-weight:600">${c} · ${s}° cuatri</div></div></div>`).join("") : vacio();
        }
        if (local.tab === "docentes") {
          const l = cat.docentes.filter(d => !q || norm(Object.values(d).join(" ")).includes(q));
          return l.length ? l.map(d => `<div class="card person" style="align-items:flex-start"><span class="teacher-ico" aria-hidden="true">${I("graduation-cap")}</span>
            <div class="grow stack" style="gap:4px"><b style="font-family:var(--f-display);font-size:17px">${U.esc(d.nombre)}</b>
            <span class="small" style="color:var(--teal);font-weight:600">${d.materia}</span><span class="small muted">${d.area}</span>
            <div class="meta-line"><span>${I("map-pin")} ${d.cubiculo}</span><span>${I("clock")} Asesoría ${d.asesoria}</span></div></div></div>`).join("") : vacio();
        }
        const l = cat.departamentos.filter(d => !q || norm(Object.values(d).join(" ")).includes(q));
        return l.length ? l.map(d => `<div class="card dept"><h3>${I(d.ico)} ${U.esc(d.nombre)}</h3>
          <div class="info"><span>${I("user-round")} ${d.resp}</span><span>${I("map-pin")} ${d.lugar}</span><span>${I("phone")} <span class="mono copyable" data-a="copiar" data-v="${d.tel}" title="Copiar">${d.tel}</span></span>
          <span>${I("mail")} <span class="mono copyable" data-a="copiar" data-v="${d.correo}" title="Copiar">${d.correo}</span></span><span>${I("clock")} ${d.horario}</span></div>
          <button class="btn btn-outline btn-block" data-a="mensaje" data-id="${d.id}">Enviar mensaje</button></div>`).join("") : vacio();
      }
    },
    render() {
      const tabs = [["alumnos", I("users-round") + " Alumnos"], ["docentes", I("graduation-cap") + " Docentes"], ["departamentos", I("building-2") + " Departamentos"]];
      return `<div class="wrap page stack" style="gap:20px">
        <div class="row-between">
          <div class="tabs">${tabs.map(([id, t]) => `<button class="tab ${local.tab === id ? "active" : ""}" data-a="tab" data-tab="${id}">${t}</button>`).join("")}</div>
          <label class="grow" style="max-width:260px;min-width:200px"><span hidden>Buscar en el directorio</span><input class="input search-input" style="max-width:none" type="search" placeholder="Buscar..." value="${U.esc(local.q)}" data-c="buscar"></label>
        </div>
        ${local.tab === "alumnos" ? `<div class="chips">${["Todas", ...App.CATALOGO.carreras.map(c => c.clave)].map(c => `<button class="chip ${local.carrera === c ? "active" : ""}" data-a="carrera" data-c2="${c}">${c}</button>`).join("")}</div>` : ""}
        <div class="dir-grid ${local.tab === "docentes" ? "two" : ""}" data-p="lista">${this.parciales.lista()}</div>
        ${local.tab === "alumnos" ? `<div class="card card-pad"><h2 style="font-size:19px;margin-bottom:12px">Carreras disponibles</h2>
          <div class="carreras">${App.CATALOGO.carreras.map(c => `<div><b>${c.clave}</b>${c.nombre}</div>`).join("")}</div></div>` : ""}
      </div>`;
    },
    acciones: {
      tab(el) { local.tab = el.dataset.tab; local.q = ""; App.render(); },
      carrera(el) { local.carrera = el.dataset.c2; App.render(); },
      copiar(el) { U.copiar(el.dataset.v); },
      mensaje(el) { App.ir("contacto", { depto: el.dataset.id }); }
    },
    cambios: { buscar(el) { local.q = el.value; App.refrescar("lista"); } }
  };
})();
