/* Kárdex: avance curricular y materias por semestre. */
(function () {
  const U = App.util;
  const local = { sem: null };

  function estado(cal) {
    if (cal == null) return `<span class="badge b-blue">En curso</span>`;
    if (cal >= 7) return `<span class="badge b-green">Aprobada</span>`;
    return `<span class="badge b-red">Reprobada</span>`;
  }

  App.views.kardex = {
    titulo: "Kárdex", migas: "Kárdex",
    render() {
      const u = App.state.usuario, ac = App.academico(), sems = App.CATALOGO.kardex;
      const actual = sems.find(s => s.actual) || sems[sems.length - 1];
      const sel = sems.find(s => s.num === local.sem) || actual;
      const credSem = sel.materias.reduce((a, m) => a + m[1], 0);
      const conCal = sel.materias.filter(m => m[2] != null);
      const promSem = conCal.length ? conCal.reduce((a, m) => a + m[2] * m[1], 0) / conCal.reduce((a, m) => a + m[1], 0) : null;
      return `<div class="wrap page"><div class="page-narrow stack" style="gap:24px">
        <section class="card-dark k-head">
          <div class="grow"><span class="eyebrow">Alumno</span><b>${U.esc(U.nombreCompleto())}</b><small>${u.matricula} · ${u.grupo} · ${U.carrera(u.carrera)}</small></div>
          <div class="stats">
            <div class="stat"><b class="c-orange">${ac.promedio.toFixed(1)}</b><small>Promedio</small></div>
            <div class="stat"><b class="c-teal">${ac.creditos}/${ac.total}</b><small>Créditos</small></div>
            <div class="stat"><b>${ac.avance}%</b><small>Avance</small></div>
          </div>
        </section>
        <section class="card card-pad stack" style="gap:10px">
          <div class="row-between"><b>Avance curricular</b><b class="c-orange">${ac.avance}%</b></div>
          <div class="progress" role="progressbar" aria-valuenow="${ac.avance}" aria-valuemin="0" aria-valuemax="100"><div style="width:${ac.avance}%"></div></div>
          <div class="row-between small muted"><span>0 créditos</span><span>${ac.creditos} aprobados</span><span>${ac.total} créditos</span></div>
        </section>
        <div class="tabs">${sems.map(s => `<button class="tab sem-tab ${s === sel ? "active" : ""}" data-a="sem" data-n="${s.num}">${s.num}° Sem <small>· ${s.periodo.split(" ")[0]}</small></button>`).join("")}</div>
        <section class="card" style="overflow:hidden">
          <div class="card-pad row-between" style="padding-bottom:16px"><div><h2 style="font-size:20px">${sel.num}° Semestre</h2><span class="mono small muted">${sel.periodo}${sel.actual ? " (actual)" : ""}</span></div>
            ${promSem != null ? `<span class="badge b-teal">Promedio del semestre: ${promSem.toFixed(1)}</span>` : ""}</div>
          <div class="table-wrap"><table>
            <thead><tr><th>Materia</th><th class="t-center">Créditos</th><th class="t-center">Calificación</th><th class="t-center">Estado</th></tr></thead>
            <tbody>${sel.materias.map(([m, c, cal]) => `<tr><td><b style="font-weight:600">${m}</b></td><td class="t-center mono">${c}</td><td class="t-center mono">${cal == null ? "—" : cal.toFixed(1)}</td><td class="t-center">${estado(cal)}</td></tr>`).join("")}</tbody>
            <tfoot><tr><td>TOTAL</td><td class="t-center mono c-orange">${credSem} cr</td><td class="t-center mono">${promSem != null ? promSem.toFixed(1) : "—"}</td><td></td></tr></tfoot>
          </table></div>
        </section>
        <p class="small muted">¿Necesitas el kárdex con sello oficial? Solicítalo en <a href="#tramites" class="link">Trámites</a>.</p>
      </div></div>`;
    },
    acciones: { sem(el) { local.sem = Number(el.dataset.n); App.render(); } }
  };
})();
