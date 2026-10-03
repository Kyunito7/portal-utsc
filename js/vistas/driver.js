/* DriverUTSC: buscar, reservar y cancelar viajes; publicar y eliminar rutas propias. */
(function () {
  const U = App.util;
  const local = { tab: "buscar", q: "", dia: -1, sentido: "todos" };
  const CAMPUS = "UTSC — Campus Santa Catarina";
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const origen = v => v.sentido === "ida" ? v.lugar : CAMPUS;
  const destino = v => v.sentido === "ida" ? CAMPUS : v.lugar;
  const libres = v => v.asientos - v.ocupados;
  const reservado = id => App.state.reservasViaje.includes(id);
  const estrellas = r => "★★★★★".slice(0, Math.round(r)) + "☆☆☆☆☆".slice(0, 5 - Math.round(r));

  function tarjeta(v) {
    const lleno = libres(v) <= 0;
    const btn = v.propio ? `<span class="badge b-teal">Tu ruta</span>`
      : reservado(v.id) ? `<button class="btn btn-outline" data-a="cancelarViaje" data-id="${v.id}">✓ Reservado · cancelar</button>`
      : lleno ? `<button class="btn btn-outline" disabled>Sin lugares</button>`
      : `<button class="btn btn-primary" data-a="solicitar" data-id="${v.id}">Solicitar lugar</button>`;
    return `<article class="card trip">
      <div class="row-between" style="align-items:flex-start"><div class="row"><span class="avatar avatar-lg" style="width:48px;height:48px;font-size:15px">${U.iniciales(v.conductor)}</span>
        <div><b style="display:block">${U.esc(v.conductor)}</b><span class="mono small muted">${v.matricula} · ${v.carrera}</span><div class="stars" aria-label="Calificación ${v.rating} de 5">${estrellas(v.rating)} <span class="mono muted">${v.rating ? v.rating.toFixed(1) : "Nuevo"}</span></div></div></div>
        <div><div class="price">${v.precio ? "$" + v.precio : "Gratis"}</div><span class="small muted">por asiento</span></div></div>
      <div class="od"><div><small>Origen</small><b style="font-weight:600">${U.esc(origen(v))}</b></div><div><small>Destino</small><b style="font-weight:600">${U.esc(destino(v))}</b></div></div>
      <div class="meta-line mono"><span>${I("clock")} ${U.hora12(v.hora)}</span><span>${I("armchair")} ${libres(v)}/${v.asientos} lugares libres</span><span>${I("car")} ${U.esc(v.vehiculo)}</span></div>
      <div class="day-chips">${v.dias.map(d => `<span>${U.DIAS[d]}</span>`).join("")}</div>
      ${v.notas ? `<p class="small muted">${U.esc(v.notas)}</p>` : ""}
      <div style="justify-self:end">${btn}</div></article>`;
  }

  function lista() {
    const q = norm(local.q);
    const l = App.state.viajes
      .filter(v => local.dia < 0 || v.dias.includes(local.dia))
      .filter(v => local.sentido === "todos" || v.sentido === local.sentido)
      .filter(v => !q || norm(v.lugar + " " + v.conductor).includes(q))
      .sort((a, b) => a.hora.localeCompare(b.hora));
    return l.length ? l.map(tarjeta).join("") : `<div class="card empty"><div class="big">${I("bus-front")}</div><b>No hay rutas con esos filtros.</b><span>Prueba otro día o publica tu propia ruta.</span><button class="btn btn-primary" data-a="tab" data-t="ofrecer">Ofrecer viaje</button></div>`;
  }

  function formulario() {
    return `<form class="card card-pad form-grid" data-f="publicar" novalidate style="padding:28px">
      <h2 style="font-size:22px">Publicar una ruta</h2>
      <div class="field"><span class="label">Sentido del viaje</span><div class="day-pick">
        <label><input type="radio" name="sentido" value="ida" checked data-c="sentido"><span>Hacia la UTSC</span></label>
        <label><input type="radio" name="sentido" value="regreso" data-c="sentido"><span>Desde la UTSC</span></label></div></div>
      <div class="field"><label for="dv-l" id="dv-l-txt">Punto de origen</label><input class="input" id="dv-l" name="lugar" maxlength="70" placeholder="Ej. García (Plaza Real)"></div>
      <div class="action-row" style="cursor:default" id="dv-fijo">${I("school")} Destino: <b>${CAMPUS}</b></div>
      <div class="field" id="dv-dias"><span class="label">Días de la semana</span><div class="day-pick">${U.DIAS.map((d, i) => `<label><input type="checkbox" name="dias" value="${i}"><span>${d}</span></label>`).join("")}</div></div>
      <div class="form-row">
        <div class="field"><label for="dv-h">Hora de salida</label><input class="input" id="dv-h" name="hora" type="time" value="06:45"></div>
        <div class="field"><label for="dv-a">Asientos disponibles</label><select class="select" id="dv-a" name="asientos">${[1, 2, 3, 4].map(n => `<option value="${n}" ${n === 3 ? "selected" : ""}>${n} ${n === 1 ? "asiento" : "asientos"}</option>`).join("")}</select></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="dv-p">Precio por asiento (MXN)</label><input class="input" id="dv-p" name="precio" type="number" min="0" max="100" step="5" value="20"></div>
        <div class="field"><label for="dv-v">Vehículo</label><input class="input" id="dv-v" name="vehiculo" maxlength="40" placeholder="Ej. Nissan Versa gris 2021"></div>
      </div>
      <div class="field"><label for="dv-n">Notas para los pasajeros <span class="muted" style="font-weight:400">(opcional)</span></label><textarea class="textarea" id="dv-n" name="notas" maxlength="200" placeholder="Punto de encuentro, paradas, reglas del auto..."></textarea></div>
      <button class="btn btn-primary btn-lg btn-block">Publicar ruta</button>
    </form>`;
  }

  App.views.driver = {
    titulo: "DriverUTSC", migas: "DriverUTSC", mod: "driver",
    parciales: { lista },
    render() {
      const s = App.state;
      const rutas = s.viajes.length, asientos = s.viajes.reduce((a, v) => a + Math.max(0, libres(v)), 0);
      const mios = s.reservasViaje.length + s.viajes.filter(v => v.propio).length;
      let cuerpo;
      if (local.tab === "buscar") {
        cuerpo = `<div class="filter-bar"><label class="grow" style="display:flex"><span hidden>Filtrar por lugar</span><input class="input" type="search" placeholder="Filtrar por colonia, municipio o conductor..." value="${U.esc(local.q)}" data-c="buscar"></label>
            <select class="select" style="width:auto;background:var(--white)" data-c="sentidoFiltro" aria-label="Sentido"><option value="todos">Ida y regreso</option><option value="ida" ${local.sentido === "ida" ? "selected" : ""}>Hacia la UTSC</option><option value="regreso" ${local.sentido === "regreso" ? "selected" : ""}>Desde la UTSC</option></select></div>
          <div class="chips">${[["Todos", -1], ...U.DIAS.map((d, i) => [d, i])].map(([t, i]) => `<button class="chip ${local.dia === i ? "active" : ""}" data-a="dia" data-d="${i}">${t}</button>`).join("")}</div>
          <div class="stack" data-p="lista">${lista()}</div>`;
      } else if (local.tab === "mis") {
        const res = s.viajes.filter(v => reservado(v.id)), propias = s.viajes.filter(v => v.propio);
        cuerpo = `<h2 style="font-size:19px">Viajes reservados (pasajero)</h2>
          ${res.length ? res.map(v => `<div class="card my-trip"><span class="avatar">${U.iniciales(v.conductor)}</span><div class="grow"><b>${U.esc(origen(v))} → ${U.esc(destino(v))}</b>
            <div class="small muted">Con ${U.esc(v.conductor.split(" ")[0])} · ${U.hora12(v.hora)} · ${v.dias.map(d => U.DIAS[d]).join(", ")} · ${v.precio ? "$" + v.precio : "Gratis"}</div></div>
            <span class="badge b-green">Confirmado</span><button class="btn btn-outline btn-sm" data-a="cancelarViaje" data-id="${v.id}">Cancelar</button></div>`).join("")
            : `<div class="card empty"><b>No has reservado viajes.</b><button class="btn btn-primary" data-a="tab" data-t="buscar">Buscar viaje</button></div>`}
          <h2 style="font-size:19px">Mis rutas publicadas (conductor)</h2>
          ${propias.length ? propias.map(v => `<div class="card my-trip"><span class="avatar">${I("car")}</span><div class="grow"><b>${U.esc(origen(v))} → ${U.esc(destino(v))}</b>
            <div class="mono small muted">${U.hora12(v.hora)} · ${v.dias.map(d => U.DIAS[d]).join(", ")} · ${v.precio ? "$" + v.precio + "/asiento" : "Gratis"}</div></div>
            <span class="badge b-orange">${libres(v)}/${v.asientos} libres</span><button class="btn btn-outline btn-sm" data-a="eliminarRuta" data-id="${v.id}">Eliminar</button></div>`).join("")
            : `<div class="card empty"><b>No has publicado rutas.</b><button class="btn btn-primary" data-a="tab" data-t="ofrecer">Ofrecer viaje</button></div>`}`;
      } else {
        cuerpo = `<div class="driver-layout">${formulario()}<aside class="card card-pad stack small muted"><b style="color:var(--ink);font-size:15px">Antes de publicar</b>
          <span>${I("circle-check")} Solo alumnos con correo @utsc.edu.mx pueden reservar.</span><span>${I("circle-check")} Cobra solo lo necesario para la gasolina (máximo $100).</span><span>${I("circle-check")} Si cancelas, avisa a tus pasajeros con tiempo.</span></aside></div>`;
      }
      return `<div class="wrap page"><div class="page-narrow stack" style="gap:20px">
        <section class="card-dark k-head"><span class="avatar avatar-lg" style="border-radius:14px" aria-hidden="true">${I("car")}</span>
          <div class="grow"><b>DriverUTSC</b><small style="font-family:var(--f-body)">Comparte el camino con tu universidad</small></div>
          <div class="stats"><div class="stat"><b class="c-orange">${rutas}</b><small>Rutas activas</small></div><div class="stat"><b class="c-orange">${asientos}</b><small>Asientos libres</small></div><div class="stat"><b class="c-orange">100%</b><small>Conductores verificados</small></div></div></section>
        <div class="tabs">
          <button class="tab ${local.tab === "buscar" ? "active" : ""}" data-a="tab" data-t="buscar">${I("search")} Buscar viaje</button>
          <button class="tab ${local.tab === "mis" ? "active" : ""}" data-a="tab" data-t="mis">${I("car")} Mis viajes ${mios ? `<span class="count">${mios}</span>` : ""}</button>
          <button class="tab ${local.tab === "ofrecer" ? "active" : ""}" data-a="tab" data-t="ofrecer">${I("plus")} Ofrecer viaje</button>
        </div>${cuerpo}</div></div>`;
    },
    acciones: {
      tab(el) { local.tab = el.dataset.t; App.render(); },
      dia(el) { local.dia = Number(el.dataset.d); App.render(); },
      solicitar(el) {
        const v = App.state.viajes.find(x => x.id === el.dataset.id);
        App.modal(`<div class="modal-head"><h2>Confirmar solicitud</h2></div>
          <div class="modal-body"><div class="row"><span class="avatar">${U.iniciales(v.conductor)}</span><div><b>${U.esc(v.conductor)}</b><div class="stars">${estrellas(v.rating)} <span class="mono muted">${v.rating.toFixed(1)}</span></div></div></div>
            <div style="background:var(--sand);border-radius:12px;padding:6px 16px">
              <div class="kv"><span>Origen</span><b>${U.esc(origen(v))}</b></div><div class="kv"><span>Destino</span><b>${U.esc(destino(v))}</b></div>
              <div class="kv"><span>Horario</span><b>${U.hora12(v.hora)}</b></div><div class="kv"><span>Días</span><b>${v.dias.map(d => U.DIAS[d]).join(", ")}</b></div>
              <div class="kv" style="border:0"><span>Costo</span><b class="c-orange" style="font-family:var(--f-display);font-weight:600">${v.precio ? "$" + v.precio + " MXN por viaje" : "Gratis"}</b></div></div></div>
          <div class="modal-foot"><button class="btn btn-outline" data-m="cerrar">Cancelar</button><button class="btn btn-primary" data-m="ok">Confirmar</button></div>`,
          { acciones: { ok: () => {
            if (libres(v) <= 0) { App.cerrarModal(); App.toast("Se acaban de ocupar los lugares de esta ruta.", "error"); App.render(); return; }
            v.ocupados += 1; App.state.reservasViaje.push(v.id);
            App.registrar("Reservaste un lugar con " + v.conductor + " (" + origen(v) + " → " + destino(v) + ")"); App.guardar();
            App.exito(I("car"), "Lugar reservado", `Tu lugar con <b>${U.esc(v.conductor.split(" ")[0])}</b> fue confirmado. Llega puntual al punto de encuentro: ${U.esc(origen(v))}, ${U.hora12(v.hora)}.`, "Ver mis viajes", () => { local.tab = "mis"; App.render(true); });
          } } });
      },
      cancelarViaje(el) {
        const v = App.state.viajes.find(x => x.id === el.dataset.id);
        App.confirmar("Cancelar viaje", `Se liberará tu lugar con ${U.esc(v.conductor.split(" ")[0])} y le avisaremos.`, "Cancelar viaje", () => {
          v.ocupados = Math.max(0, v.ocupados - 1); App.state.reservasViaje = App.state.reservasViaje.filter(id => id !== v.id);
          App.registrar("Cancelaste tu viaje con " + v.conductor); App.guardar(); App.render(); App.toast("Viaje cancelado");
        }, true);
      },
      eliminarRuta(el) {
        const v = App.state.viajes.find(x => x.id === el.dataset.id);
        App.confirmar("Eliminar ruta", v.ocupados ? `Tienes ${v.ocupados} pasajero(s) en esta ruta. Les avisaremos que la cancelaste.` : "La ruta dejará de aparecer en las búsquedas.", "Eliminar ruta", () => {
          App.state.viajes = App.state.viajes.filter(x => x.id !== v.id); App.guardar(); App.render(); App.toast("Ruta eliminada");
        }, true);
      }
    },
    cambios: {
      buscar(el) { local.q = el.value; App.refrescar("lista"); },
      sentidoFiltro(el, e, tipo) { if (tipo === "change") { local.sentido = el.value; App.refrescar("lista"); } },
      sentido(el, e, tipo) {
        if (tipo !== "change") return;
        const ida = el.value === "ida";
        document.getElementById("dv-l-txt").textContent = ida ? "Punto de origen" : "Destino";
        document.getElementById("dv-fijo").innerHTML = (ida ? I("school") + " Destino: " : I("school") + " Salida: ") + "<b>" + CAMPUS + "</b>";
        document.getElementById("dv-h").value = ida ? "06:45" : "14:15";
      }
    },
    formularios: {
      publicar(f) {
        const ida = f.sentido.value === "ida";
        const dias = [...f.querySelectorAll('input[name="dias"]:checked')].map(i => Number(i.value));
        const ok = App.validar(f, {
          lugar: v => v.length < 4 ? (ida ? "Escribe de dónde sales (colonia o punto de referencia)." : "Escribe a dónde llevas a tus pasajeros.") : "",
          hora: v => {
            if (!v) return "Elige la hora de salida.";
            const [h] = v.split(":").map(Number);
            if (ida && (h < 5 || h > 13)) return "Para llegar a clases, la salida hacia la UTSC debe ser entre 5:00 y 13:59.";
            if (!ida && (h < 12 || h > 21)) return "La salida desde la UTSC debe ser entre 12:00 y 21:59.";
            return "";
          },
          precio: v => v === "" || Number(v) < 0 || Number(v) > 100 ? "El precio debe estar entre $0 y $100." : "",
          vehiculo: v => v.length < 4 ? "Escribe marca, modelo y color del auto." : ""
        });
        if (!dias.length) {
          ok && App.toast("Elige al menos un día de la semana.", "error");
          const campo = f.querySelector("#dv-dias"); if (!campo.querySelector(".field-error")) { const e = document.createElement("div"); e.className = "field-error"; e.textContent = "Elige al menos un día."; campo.appendChild(e); }
          return;
        }
        if (!ok) return;
        const u = App.state.usuario;
        const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
        App.state.viajes.push({ id: "v" + Date.now(), propio: true, conductor: U.nombreCompleto(), matricula: u.matricula, carrera: u.carrera, rating: 0,
          sentido: ida ? "ida" : "regreso", lugar: cap(f.lugar.value.trim()), hora: f.hora.value, dias, asientos: Number(f.asientos.value), ocupados: 0,
          precio: Number(f.precio.value), vehiculo: cap(f.vehiculo.value.trim()), notas: f.notas.value.trim() });
        App.registrar("Publicaste una ruta en DriverUTSC"); App.guardar();
        App.exito(I("car"), "Ruta publicada", "Tu ruta ya es visible para la comunidad UTSC. Los compañeros pueden solicitar un lugar.", "Ver mis rutas", () => { local.tab = "mis"; App.render(true); });
      }
    }
  };
})();
