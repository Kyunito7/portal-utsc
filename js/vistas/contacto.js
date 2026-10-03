/* Contacto: formulario a departamentos y tarjetas de atención. */
(function () {
  const U = App.util;

  App.views.contacto = {
    titulo: "Contacto",
    render() {
      const u = App.state.usuario, deps = App.CATALOGO.departamentos;
      const elegido = App.params.depto || "";
      App.params = {};
      return `<div class="wrap page"><div class="contact-grid">
        <form class="card card-pad form-grid" data-f="enviar" novalidate style="padding:28px">
          <div><h1 style="font-size:clamp(24px,3vw,30px)">Contactar a la institución</h1><p class="muted">Completa el formulario y te responderemos en un plazo de 24 a 48 horas hábiles.</p></div>
          <div class="form-row">
            <div class="field"><label for="ct-n">Nombre completo</label><input class="input" id="ct-n" value="${U.esc(U.nombreCompleto())}" readonly></div>
            <div class="field"><label for="ct-m">Matrícula</label><input class="input" id="ct-m" value="${u.matricula}" readonly></div>
          </div>
          <div class="field"><label for="ct-e">Correo electrónico</label><input class="input" id="ct-e" value="${u.correo}" readonly></div>
          <div class="field"><label for="ct-d">Departamento</label><select class="select" id="ct-d" name="depto">
            <option value="">Selecciona un departamento</option>${deps.map(d => `<option value="${d.id}" ${d.id === elegido ? "selected" : ""}>${d.nombre}</option>`).join("")}</select></div>
          <div class="field"><label for="ct-a">Asunto</label><input class="input" id="ct-a" name="asunto" maxlength="100" placeholder="Ej. Solicitud de constancia de estudios"></div>
          <div class="field"><label for="ct-x">Mensaje</label><textarea class="textarea" id="ct-x" name="mensaje" maxlength="1500" placeholder="Describe con detalle tu solicitud o consulta..."></textarea></div>
          <button class="btn btn-primary btn-lg btn-block">Enviar mensaje</button>
        </form>
        <aside class="side-stack">${deps.filter(d => d.contacto).map(d => `<div class="card contact-card">
          <div class="head"><span class="ico" aria-hidden="true">${I(d.ico)}</span><h3>${d.nombre}</h3></div>
          <div class="info"><span>${I("map-pin")} ${d.lugar}</span><span>${I("phone")} <span class="mono copyable" data-a="copiar" data-v="${d.tel}" title="Copiar">${d.tel}</span></span>
          <span>${I("mail")} <span class="mono copyable" data-a="copiar" data-v="${d.correo}" title="Copiar">${d.correo}</span></span><span>${I("clock")} ${d.horario}</span></div></div>`).join("")}</aside>
      </div></div>`;
    },
    alMostrar(root) { const s = root.querySelector("#ct-d"); if (s && s.value) root.querySelector("#ct-a").focus(); },
    acciones: { copiar(el) { U.copiar(el.dataset.v); } },
    formularios: {
      enviar(f) {
        const ok = App.validar(f, {
          depto: v => !v ? "Elige el departamento al que va dirigido tu mensaje." : "",
          asunto: v => v.length < 4 ? "Escribe un asunto breve." : "",
          mensaje: v => v.length < 15 ? "Describe tu solicitud con al menos 15 caracteres." : ""
        });
        if (!ok) return;
        const d = U.depto(f.depto.value);
        const folio = "MSG-" + Date.now().toString().slice(-6);
        App.registrar("Enviaste un mensaje a " + d.nombre + ": «" + f.asunto.value.trim() + "»");
        App.notificar("Contacto", d.nombre + " recibió tu mensaje (" + folio + "). Te responderá a " + App.state.usuario.correo + ".", "contacto");
        App.guardar();
        App.exito(I("mail"), "Mensaje enviado", `<b>${d.nombre}</b> recibió tu mensaje con folio <span class="mono">${folio}</span>. La respuesta llegará a tu correo institucional en 24 a 48 horas hábiles.`, "Aceptar", () => App.render());
        f.reset();
      }
    }
  };
})();
