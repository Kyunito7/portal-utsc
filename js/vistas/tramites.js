/* Trámites: catálogo, solicitud (sin duplicados), seguimiento y descarga. */
(function () {
  const U = App.util;
  const local = { tab: "catalogo" };
  const ESTADOS = [["Pendiente", "b-yellow"], ["En proceso", "b-blue"], ["Completado", "b-green"]];

  function nuevoFolio() {
    const nums = App.state.solicitudes.map(s => Number(s.folio.split("-")[2]) || 0);
    return "TRM-" + new Date().getFullYear() + "-" + String(Math.max(2000, ...nums) + 1);
  }
  function activa(id) { return App.state.solicitudes.find(s => s.tramite === id && s.estado < 2); }

  function solicitar(t) {
    const previa = activa(t.id);
    if (previa) {
      App.modal(`<div class="modal-head"><h2>Ya tienes esta solicitud en curso</h2></div>
        <div class="modal-body"><p class="muted">Tu ${t.nombre.toLowerCase()} con folio <b class="mono">${previa.folio}</b> está en estado <b>${ESTADOS[previa.estado][0]}</b>. Espera a que se complete antes de pedir otra.</p></div>
        <div class="modal-foot"><button class="btn btn-outline" data-m="cerrar">Cerrar</button><button class="btn btn-primary" data-m="ver">Ver mis solicitudes</button></div>`,
        { acciones: { ver: () => { App.cerrarModal(); local.tab = "mis"; App.render(true); } } });
      return;
    }
    App.modal(`<div class="modal-head row"><span style="font-size:28px" aria-hidden="true">${I(t.ico)}</span><div><h2>${t.nombre}</h2><span class="mono small muted">Tiempo estimado: ${t.tiempo} · ${t.costo ? U.dinero(t.costo) : "Gratuito"}</span></div></div>
      <form data-m="enviar" novalidate><div class="modal-body">
        ${t.pideDestino ? `<div class="field"><label for="tr-d">Destino (empresa o institución)</label><input class="input" id="tr-d" name="destino" maxlength="80" placeholder="Ej. IMSS, Grupo Industrial Monterrey"></div>` : ""}
        ${t.id === "baja" ? `<div class="field"><label for="tr-m">Motivo</label><select class="select" id="tr-m" name="motivo"><option value="">Selecciona un motivo</option><option>Motivos económicos</option><option>Motivos de salud</option><option>Motivos laborales</option><option>Otro</option></select></div>` : ""}
        <div class="field"><label for="tr-o">Observaciones adicionales <span class="muted" style="font-weight:400">(opcional)</span></label><textarea class="textarea" id="tr-o" name="obs" maxlength="300" style="min-height:80px" placeholder="Algo que Servicios Escolares deba saber"></textarea></div>
        ${t.costo ? `<p class="small" style="background:var(--orange-soft);color:var(--orange-dark);padding:10px 12px;border-radius:8px">Este trámite cuesta ${U.dinero(t.costo)}. Se agregará a tus cargos en Pagos y empezará a procesarse cuando lo pagues.</p>` : ""}
      </div><div class="modal-foot"><button type="button" class="btn btn-outline" data-m="cerrar">Cancelar</button><button class="btn btn-primary">Enviar solicitud</button></div></form>`,
      { acciones: { enviar: f => {
        const reglas = {};
        if (t.pideDestino) reglas.destino = v => v.length < 3 ? "Escribe a quién va dirigido el documento." : "";
        if (t.id === "baja") reglas.motivo = v => !v ? "Elige el motivo de la baja." : "";
        if (!App.validar(f, reglas)) return;
        const folio = nuevoFolio();
        App.state.solicitudes.unshift({ folio, tramite: t.id, fecha: U.hoyISO(), estado: 0,
          nota: t.costo ? "Pendiente de pago en el módulo de Pagos." : "Tu solicitud fue recibida y está en cola de procesamiento.",
          destino: f.destino ? f.destino.value.trim() : "", obs: f.obs.value.trim() });
        if (t.costo) {
          const v = new Date(); v.setDate(v.getDate() + 7);
          App.state.cargos.push({ id: "c" + Date.now(), concepto: t.nombre + " (" + folio + ")", monto: t.costo, vence: v.toISOString().slice(0, 10) });
        }
        App.registrar("Solicitaste " + t.nombre + " (" + folio + ")");
        App.guardar();
        App.exito(I("circle-check"), "Solicitud enviada", `Tu solicitud de <b>${t.nombre}</b> fue recibida con folio <span class="mono">${folio}</span>. Te avisaremos cuando esté lista.`, "Ver mis solicitudes", () => { local.tab = "mis"; App.render(true); });
      } } });
  }

  function documento(s) {
    const t = U.tramite(s.tramite), u = App.state.usuario;
    App.modal(`<div class="modal-head row"><img src="img/logo-utsc.png" alt="" style="width:44px"><div><h2>${t.nombre}</h2><span class="mono small muted">Folio ${s.folio}</span></div></div>
      <div class="modal-body"><p>A quien corresponda${s.destino ? " (" + U.esc(s.destino) + ")" : ""}:</p>
        <p>La ${App.CATALOGO.universidad.nombre} hace constar que <b>${U.esc(U.nombreCompleto())}</b>, con matrícula <span class="mono">${u.matricula}</span>, es alumno inscrito en el ${u.semestre}° semestre de ${U.carrera(u.carrera)}, grupo ${u.grupo}, en el periodo ${App.CATALOGO.universidad.periodo}.</p>
        <p class="small muted">Documento emitido el ${U.fecha(s.fecha)} por Servicios Escolares. Vista previa de prueba, sin validez oficial.</p></div>
      <div class="modal-foot"><button class="btn btn-dark" data-m="cerrar">Cerrar</button></div>`, { ancho: true });
  }

  App.views.tramites = {
    titulo: "Trámites", migas: "Trámites",
    render() {
      const s = App.state, cat = App.CATALOGO.tramites;
      const activas = s.solicitudes.filter(x => x.estado < 2).length;
      return `<div class="wrap page"><div class="page-narrow stack" style="gap:24px">
        <div class="tabs"><button class="tab ${local.tab === "catalogo" ? "active" : ""}" data-a="tab" data-t="catalogo">${I("clipboard-list")} Catálogo de trámites</button>
          <button class="tab ${local.tab === "mis" ? "active" : ""}" data-a="tab" data-t="mis">${I("folder-open")} Mis solicitudes ${activas ? `<span class="count">${activas}</span>` : ""}</button></div>
        ${local.tab === "catalogo" ? `<div class="proc-grid">${cat.map(t => `<div class="card proc"><span class="ico" aria-hidden="true">${I(t.ico)}</span><h3>${t.nombre}</h3><p>${t.desc}</p>
            <div class="meta-line"><span>${I("timer")} ${t.tiempo}</span><span>${I("coins")} ${t.costo ? U.dinero(t.costo) : "Gratuito"}</span></div>
            <button class="btn btn-primary btn-block" data-a="solicitar" data-id="${t.id}">${activa(t.id) ? "En curso · ver estado" : "Solicitar"}</button></div>`).join("")}</div>`
        : s.solicitudes.length ? s.solicitudes.map(x => {
            const t = U.tramite(x.tramite), [txt, cls] = ESTADOS[x.estado];
            return `<div class="card req">
              <div class="row-between"><div><h3 style="font-size:18px">${t.nombre}</h3><span class="mono small muted">Folio: ${x.folio} · ${U.fecha(x.fecha)}${x.destino ? " · " + U.esc(x.destino) : ""}</span></div><span class="badge ${cls}">${txt}</span></div>
              <div class="steps">${ESTADOS.map(([n], i) => `${i ? `<span class="step-line ${x.estado >= i ? "done" : ""}"></span>` : ""}<span class="step ${x.estado > i || x.estado === 2 ? "done" : x.estado === i ? "current" : ""}"><i>${x.estado > i || x.estado === 2 ? "✓" : i + 1}</i><span>${n}</span></span>`).join("")}</div>
              <p class="small muted">${U.esc(x.nota)}</p>
              <div class="row">${x.estado === 2 ? `<button class="link" data-a="descargar" data-folio="${x.folio}">${I("download")} Ver documento</button>` : ""}
                ${x.estado === 0 ? `<button class="link" style="color:var(--red)" data-a="cancelar" data-folio="${x.folio}">Cancelar solicitud</button>` : ""}</div>
            </div>`; }).join("")
          : `<div class="card empty"><div class="big">${I("inbox")}</div><b>Aún no tienes solicitudes.</b></div>`}
      </div></div>`;
    },
    acciones: {
      tab(el) { local.tab = el.dataset.t; App.render(); },
      solicitar(el) { solicitar(U.tramite(el.dataset.id)); },
      descargar(el) { documento(App.state.solicitudes.find(s => s.folio === el.dataset.folio)); },
      cancelar(el) {
        const folio = el.dataset.folio;
        App.confirmar("Cancelar solicitud", `La solicitud <span class="mono">${folio}</span> se eliminará. Si tenía costo, también se quita el cargo pendiente.`, "Cancelar solicitud", () => {
          const s = App.state;
          s.solicitudes = s.solicitudes.filter(x => x.folio !== folio);
          s.cargos = s.cargos.filter(c => !c.concepto.includes(folio));
          App.registrar("Cancelaste la solicitud " + folio); App.guardar(); App.render(); App.toast("Solicitud cancelada");
        }, true);
      }
    }
  };
})();
