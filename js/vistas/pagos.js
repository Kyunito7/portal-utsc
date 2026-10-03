/* Pagos: adeudo, cargos pendientes, pago simulado e historial con comprobantes. */
(function () {
  const U = App.util;

  function totales() {
    const s = App.state;
    return {
      adeudo: s.cargos.reduce((a, c) => a + c.monto, 0),
      pagado: s.historialPagos.reduce((a, p) => a + p.monto, 0),
      hechos: s.historialPagos.length,
      total: s.historialPagos.length + s.cargos.length
    };
  }
  function nuevaRef() {
    const n = App.state.historialPagos.length + 1;
    return "REF-" + new Date().getFullYear() + "-" + String(Date.now()).slice(-4) + String(n).padStart(2, "0");
  }

  function pagar(cargo) {
    App.modal(`<div class="modal-head"><h2>Pagar ${U.esc(cargo.concepto)}</h2><p class="small muted">Total a pagar: <b class="c-orange">${U.dinero(cargo.monto)} MXN</b></p></div>
      <form data-m="pagar" novalidate><div class="modal-body">
        <div class="field"><span class="label">Método de pago</span>
          <div class="day-pick" role="radiogroup">
            ${[["tarjeta", I("credit-card") + " Tarjeta"], ["spei", I("landmark") + " Transferencia SPEI"], ["oxxo", I("store") + " Efectivo en OXXO"]].map(([v, t], i) => `<label><input type="radio" name="metodo" value="${v}" ${i ? "" : "checked"} data-mc="metodo"><span>${t}</span></label>`).join("")}
          </div></div>
        <div id="pago-tarjeta" class="form-grid">
          <div class="field"><label for="pg-n">Número de tarjeta</label><input class="input mono" id="pg-n" name="num" inputmode="numeric" autocomplete="cc-number" placeholder="4152 3135 0000 0000" maxlength="19"></div>
          <div class="form-row">
            <div class="field"><label for="pg-v">Vencimiento</label><input class="input mono" id="pg-v" name="venc" placeholder="MM/AA" maxlength="5" autocomplete="cc-exp"></div>
            <div class="field"><label for="pg-c">CVV</label><input class="input mono" id="pg-c" name="cvv" inputmode="numeric" placeholder="123" maxlength="4" autocomplete="cc-csc"></div>
          </div>
        </div>
        <div id="pago-ref" class="card card-pad" hidden style="background:var(--sand)">
          <p class="small muted">Se generará una referencia para pagar en el banco u OXXO. El cargo se marca como pagado cuando Caja confirme el depósito.</p></div>
        <p class="small muted">${I("lock")} Pago de prueba: no se realiza ningún cobro real.</p>
      </div>
      <div class="modal-foot"><button type="button" class="btn btn-outline" data-m="cerrar">Cancelar</button><button class="btn btn-primary">Pagar ${U.dinero(cargo.monto)}</button></div></form>`,
      { acciones: {
        metodo: (el, e, modal) => {
          const t = el.value === "tarjeta";
          modal.querySelector("#pago-tarjeta").hidden = !t;
          modal.querySelector("#pago-ref").hidden = t;
        },
        pagar: f => {
          const metodo = f.metodo.value;
          if (metodo === "tarjeta") {
            const ok = App.validar(f, {
              num: v => v.replace(/\s/g, "").length < 15 || /\D/.test(v.replace(/\s/g, "")) ? "Escribe los 15 o 16 dígitos de la tarjeta." : "",
              venc: v => {
                const m = v.match(/^(\d{2})\/(\d{2})$/);
                if (!m || +m[1] < 1 || +m[1] > 12) return "Usa el formato MM/AA.";
                const exp = new Date(2000 + +m[2], +m[1], 1);
                return exp <= new Date() ? "La tarjeta está vencida." : "";
              },
              cvv: v => !/^\d{3,4}$/.test(v) ? "El CVV son 3 o 4 dígitos." : ""
            });
            if (!ok) return;
          }
          const s = App.state, ref = nuevaRef();
          if (metodo === "tarjeta") {
            s.cargos = s.cargos.filter(c => c.id !== cargo.id);
            s.historialPagos.unshift({ concepto: cargo.concepto, fecha: U.hoyISO(), monto: cargo.monto, ref, metodo: "Tarjeta terminación " + f.num.value.replace(/\s/g, "").slice(-4) });
            App.registrar("Pagaste " + cargo.concepto + " (" + U.dinero(cargo.monto) + ")");
            App.notificar("Pagos", "Pago recibido: " + cargo.concepto + " por " + U.dinero(cargo.monto) + ". Referencia " + ref + ".", "pagos");
            App.guardar();
            App.exito(I("circle-check"), "Pago realizado", `Se pagó <b>${U.esc(cargo.concepto)}</b> por ${U.dinero(cargo.monto)}.<br>Referencia <span class="mono">${ref}</span>.`, "Ver historial", () => App.render());
          } else {
            cargo.referencia = ref; cargo.metodo = metodo === "spei" ? "Transferencia SPEI" : "Efectivo en OXXO";
            App.registrar("Generaste la referencia " + ref + " para " + cargo.concepto);
            App.guardar();
            App.exito(I("receipt"), "Referencia generada", `Paga <b>${U.dinero(cargo.monto)}</b> con la referencia <span class="mono">${ref}</span> por ${cargo.metodo} antes del ${U.fecha(cargo.vence)}.`, "Entendido", () => App.render());
          }
        } } });
    const num = document.getElementById("pg-n");
    num.addEventListener("input", () => { num.value = num.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 "); });
    const venc = document.getElementById("pg-v");
    venc.addEventListener("input", () => { const d = venc.value.replace(/\D/g, "").slice(0, 4); venc.value = d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d; });
  }

  function comprobante(p) {
    const u = App.state.usuario;
    App.modal(`<div class="modal-head row"><img src="img/logo-utsc.png" alt="" style="width:44px"><div><h2>Comprobante de pago</h2><p class="small muted">${App.CATALOGO.universidad.nombre}</p></div></div>
      <div class="modal-body">
        <div class="kv"><span>Alumno</span><b>${U.esc(U.nombreCompleto())}</b></div>
        <div class="kv"><span>Matrícula</span><b class="mono">${u.matricula}</b></div>
        <div class="kv"><span>Concepto</span><b>${U.esc(p.concepto)}</b></div>
        <div class="kv"><span>Fecha</span><b class="mono">${U.fecha(p.fecha)}</b></div>
        <div class="kv"><span>Monto</span><b class="amount-ok">${U.dinero(p.monto)} MXN</b></div>
        <div class="kv"><span>Referencia</span><b class="mono">${p.ref}</b></div>
        ${p.metodo ? `<div class="kv"><span>Método</span><b>${p.metodo}</b></div>` : ""}
        <p class="small muted">Este comprobante es válido para trámites internos. Para factura, escribe a caja@utsc.edu.mx con tu referencia.</p>
      </div><div class="modal-foot"><button class="btn btn-dark" data-m="cerrar">Cerrar</button></div>`);
  }

  App.views.pagos = {
    titulo: "Pagos", migas: "Pagos",
    render() {
      const s = App.state, t = totales();
      const cargos = s.cargos.slice().sort((a, b) => a.vence.localeCompare(b.vence));
      const hoy = U.hoyISO();
      return `<div class="wrap page"><div class="page-mid stack" style="gap:28px">
        <section class="card-dark pay-head">
          <div class="row-between" style="align-items:flex-end">
            <div><span style="color:#a9aec2">Adeudo actual</span><div class="amt">${U.dinero(t.adeudo)}</div><span class="small" style="color:#a9aec2">${cargos.length ? cargos.length + (cargos.length === 1 ? " pago pendiente" : " pagos pendientes") : "Sin adeudos"}</span></div>
            <div style="text-align:right"><span class="small" style="color:#a9aec2">Total pagado</span><div class="paid">${U.dinero(t.pagado)}</div></div>
          </div>
          <div class="stack" style="gap:8px"><div class="row-between small" style="color:#a9aec2"><span>Pagos completados</span><span>${t.hechos} de ${t.total}</span></div>
            <div class="progress dark teal"><div style="width:${t.total ? t.hechos / t.total * 100 : 100}%"></div></div></div>
        </section>
        <section class="stack" style="gap:14px"><h2 class="section-title" style="margin:0">Cargos del semestre actual</h2>
          ${cargos.length ? cargos.map(c => `<div class="card charge"><span class="ico" aria-hidden="true">${I("credit-card")}</span>
            <div class="grow"><b style="display:block">${U.esc(c.concepto)}</b>
              <span class="mono small ${c.vence < hoy ? "" : "muted"}" style="${c.vence < hoy ? "color:var(--red)" : ""}">${c.vence < hoy ? "Venció" : "Vence"}: ${U.fecha(c.vence)}</span>
              ${c.referencia ? `<div class="small" style="color:var(--teal)">Referencia ${c.referencia} · ${c.metodo}</div>` : ""}</div>
            <span class="price">${U.dinero(c.monto)}</span><button class="btn btn-primary" data-a="pagar" data-id="${c.id}">${c.referencia ? "Pagar con tarjeta" : "Pagar"}</button></div>`).join("")
            : `<div class="card empty"><div class="big">${I("party-popper")}</div><b>Estás al corriente.</b><span>No tienes cargos pendientes este semestre.</span></div>`}
        </section>
        <section><h2 class="section-title">Historial completo de pagos</h2>
          <div class="card table-wrap"><table>
            <thead><tr><th>Concepto</th><th>Fecha</th><th class="t-right">Monto</th><th>Referencia</th><th class="t-center">Comprobante</th></tr></thead>
            <tbody>${s.historialPagos.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).map((p, i) => `<tr><td><span class="check">✓</span>${U.esc(p.concepto)}</td>
              <td class="mono muted" style="white-space:nowrap">${U.fecha(p.fecha)}</td><td class="t-right amount-ok">${U.dinero(p.monto)}</td>
              <td class="mono small muted">${p.ref}</td><td class="t-center"><button class="link" data-a="comprobante" data-ref="${p.ref}">${I("download")} Ver</button></td></tr>`).join("")}</tbody>
          </table></div></section>
      </div></div>`;
    },
    acciones: {
      pagar(el) { pagar(App.state.cargos.find(c => c.id === el.dataset.id)); },
      comprobante(el) { comprobante(App.state.historialPagos.find(p => p.ref === el.dataset.ref)); }
    }
  };
})();
