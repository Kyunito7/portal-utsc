/* Horarios: calendario semanal de clases con navegación por semana. */
(function () {
  const U = App.util;
  const local = { offset: 0 };
  const HORAS = [7, 8, 9, 10, 11, 12, 13, 14];

  function lunes(offset) {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const dia = (d.getDay() + 6) % 7; // 0 = lunes
    d.setDate(d.getDate() - dia + offset * 7);
    return d;
  }

  App.views.horarios = {
    titulo: "Horarios", migas: "Horarios",
    render() {
      const cat = App.CATALOGO, u = App.state.usuario;
      const ini = lunes(local.offset), fin = new Date(ini); fin.setDate(ini.getDate() + 4);
      const inicioP = U.aFecha(cat.universidad.inicioPeriodo), finP = U.aFecha(cat.universidad.finPeriodo);
      const enPeriodo = fin >= inicioP && ini <= finP;
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const idxHoy = local.offset === 0 ? (hoy.getDay() + 6) % 7 : -1;
      const materias = [...new Map(cat.horario.map(c => [c.materia, c])).values()];
      const fechasDia = [0, 1, 2, 3, 4].map(i => { const d = new Date(ini); d.setDate(ini.getDate() + i); return d; });

      let celdas = "";
      HORAS.forEach(h => {
        celdas += `<div class="hour">${String(h).padStart(2, "0")}:00</div>`;
        for (let d = 0; d < 5; d++) {
          const c = enPeriodo && cat.horario.find(x => x.dia === d && x.inicio === h);
          celdas += `<div class="slot ${d === idxHoy ? "today" : ""}">${c ? `<button class="cls" style="background:${c.color};bottom:calc(-${(c.dur - 1) * 57}px + 6px);border:0;text-align:left" data-a="clase" data-d="${d}" data-h="${h}">
            <b>${c.materia}</b><small>${c.aula}</small></button>` : ""}</div>`;
        }
      });
      return `<div class="wrap page"><div class="stack" style="gap:20px;max-width:1088px;margin-inline:auto">
        <div class="row-between">
          <div><h1 style="font-size:clamp(24px,3vw,30px)">Horario de clases</h1>
            <span class="mono small muted">${U.fechaCorta(ini)} — ${U.fecha(fin)} · ${u.semestre}° Cuatrimestre ${u.grupo}</span></div>
          <div class="row"><button class="btn btn-outline" data-a="semana" data-d="-1" aria-label="Semana anterior">←</button>
            <button class="btn btn-outline" data-a="hoy">Hoy</button><button class="btn btn-outline" data-a="semana" data-d="1" aria-label="Semana siguiente">→</button></div>
        </div>
        <div class="legend">${materias.map(m => `<span><i style="background:${m.color}"></i>${m.materia}</span>`).join("")}</div>
        ${enPeriodo ? "" : `<div class="card card-pad muted">${I("calendar")} Esta semana está fuera del periodo ${cat.universidad.periodo} (${U.fecha(inicioP)} al ${U.fecha(finP)}), así que no hay clases.</div>`}
        <div class="sched-wrap"><div class="sched">
          <div class="h">Hora</div>${U.DIAS_LARGO.slice(0, 5).map((d, i) => `<div class="h ${i === idxHoy ? "today" : ""}">${d} <span class="mono" style="font-weight:400">${fechasDia[i].getDate()}</span></div>`).join("")}
          ${celdas}
        </div></div>
        <p class="small muted">Toca una clase para ver el docente y el aula. En celular, desliza la tabla hacia los lados.</p>
      </div></div>`;
    },
    acciones: {
      semana(el) { local.offset += Number(el.dataset.d); App.render(); },
      hoy() { local.offset = 0; App.render(); },
      clase(el) {
        const c = App.CATALOGO.horario.find(x => x.dia === Number(el.dataset.d) && x.inicio === Number(el.dataset.h));
        App.modal(`<div class="modal-head"><span class="badge" style="background:${c.color};color:#fff">${U.DIAS_LARGO[c.dia]}</span><h2 style="margin-top:8px">${c.materia}</h2></div>
          <div class="modal-body"><div class="kv"><span>Horario</span><b class="mono">${c.inicio}:00 a ${c.inicio + c.dur}:00</b></div>
          <div class="kv"><span>Aula</span><b>${c.aula}</b></div><div class="kv"><span>Docente</span><b>${c.docente}</b></div></div>
          <div class="modal-foot"><button class="btn btn-dark" data-m="cerrar">Cerrar</button></div>`);
      }
    }
  };
})();
