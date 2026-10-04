/* Menú del usuario: avisos, perfil, configuración, privacidad y cuentas. */
(function () {
  const U = App.util;
  const M = App.menu = {};

  M.avisos = function () {
    const lista = App.state.notificaciones;
    const pintar = () => `<div class="modal-head row-between"><h2>Avisos y notificaciones</h2>
        ${lista.some(n => !n.leida) ? `<button class="link" data-m="todas">Marcar todo como leído</button>` : ""}</div>
      <div>${lista.length ? lista.map(n => `<button class="notif ${n.leida ? "" : "unread"}" style="width:100%;text-align:left;border-right:0;border-top:0" data-m="abrir" data-id="${n.id}">
          <span>${U.esc(n.txt)}</span><small><b>${n.mod}</b>${U.hace(n.t)}</small></button>`).join("")
        : `<div class="empty"><div class="big">${I("bell-off")}</div>No tienes avisos.</div>`}</div>
      <div class="modal-body"><button class="btn btn-dark btn-block" data-m="cerrar">Cerrar</button></div>`;
    const acciones = {
      todas: (el, e, modal) => { lista.forEach(n => n.leida = true); App.guardar(); modal.innerHTML = pintar(); App.render(); },
      abrir: el => {
        const n = lista.find(x => x.id === el.dataset.id);
        n.leida = true; App.guardar(); App.cerrarModal();
        if (n.ir) App.ir(n.ir); else App.render();
      }
    };
    App.modal(pintar(), { acciones });
  };

  M.moderacion = function () { App.ir("moderacion"); };

  M.perfil = function () {
    const u = App.state.usuario, ac = App.academico();
    App.modal(`<div class="profile-head"><span class="avatar avatar-lg">${U.iniciales(U.nombreCompleto())}</span>
        <h2>${U.esc(U.nombreCompleto())}</h2><small>${u.matricula} · ${u.grupo}</small><small>${u.correo}</small></div>
      <div class="modal-body">
        <div class="mini-stats"><div><b>${ac.promedio.toFixed(1)}</b><small>Promedio</small></div><div><b>${ac.creditos}/${ac.total}</b><small>Créditos</small></div><div><b>${ac.semestre}°</b><small>Cuatrimestre</small></div></div>
        <div>
          <div class="kv"><span>Carrera</span><b>${U.carrera(u.carrera)}</b></div>
          <div class="kv"><span>Correo</span><b class="mono">${u.correo}</b></div>
          <div class="kv"><span>Teléfono</span><b class="mono">${U.esc(u.telefono || "Sin registrar")}</b></div>
          <div class="kv"><span>Sobre mí</span><b>${U.esc(u.bio || "Sin descripción")}</b></div>
          <div class="kv"><span>Rol</span><b>${u.rol}</b></div>
        </div>
        <button class="btn btn-outline btn-block" data-m="editar">${I("pencil")} Editar perfil</button>
        <button class="btn btn-dark btn-block" data-m="cerrar">Cerrar</button>
      </div>`, { acciones: { editar: () => M.editarPerfil() } });
  };

  M.editarPerfil = function () {
    const u = App.state.usuario;
    App.modal(`<div class="modal-head"><h2>Editar perfil</h2><p class="small muted">Tu correo y tu matrícula no se pueden cambiar.</p></div>
      <form data-m="guardar" novalidate>
        <div class="modal-body">
          <div class="form-row">
            <div class="field"><label for="ep-n">Nombre(s)</label><input class="input" id="ep-n" name="nombre" maxlength="40" value="${U.esc(u.nombre)}" autocomplete="given-name"></div>
            <div class="field"><label for="ep-a">Apellidos</label><input class="input" id="ep-a" name="apellidos" maxlength="60" value="${U.esc(u.apellidos)}" autocomplete="family-name"></div>
          </div>
          <div class="field"><label for="ep-tel">Teléfono</label><input class="input" id="ep-tel" name="tel" inputmode="tel" value="${U.esc(u.telefono)}" placeholder="81-1234-5678"></div>
          <div class="field"><label for="ep-bio">Sobre mí</label><textarea class="textarea" id="ep-bio" name="bio" maxlength="160">${U.esc(u.bio)}</textarea><small class="muted">Máximo 160 caracteres.</small></div>
        </div>
        <div class="modal-foot"><button type="button" class="btn btn-outline" data-m="volver">Cancelar</button><button class="btn btn-primary" type="submit">Guardar cambios</button></div>
      </form>`, { acciones: {
        volver: () => M.perfil(),
        guardar: f => {
          if (!App.validar(f, {
            nombre: v => v.length < 2 ? "Escribe tu nombre." : "",
            apellidos: v => v.length < 2 ? "Escribe tus apellidos." : "",
            tel: v => v && !/^[\d\s-]{10,14}$/.test(v) ? "Escribe un teléfono de 10 dígitos, por ejemplo 81-1234-5678." : ""
          })) return;
          const cambios = { nombre: f.nombre.value.trim(), apellidos: f.apellidos.value.trim(), telefono: f.tel.value.trim(), bio: f.bio.value.trim() };
          Object.assign(u, cambios);
          App.cuentas.actualizar(u.correo, cambios);
          App.registrar("Actualizaste tu perfil"); App.guardar(); App.render();
          App.toast("Perfil actualizado"); M.perfil();
        } } });
  };

  function sw(id, nombre, txt, valor) {
    return `<div class="setting"><label for="${id}">${txt}</label><span class="switch"><input type="checkbox" id="${id}" name="${nombre}" ${valor ? "checked" : ""}><span></span></span></div>`;
  }

  M.config = function () {
    const a = App.state.ajustes, u = App.state.usuario;
    App.modal(`<div class="modal-head"><h2>Configuración</h2></div>
      <form data-m="guardar"><div class="modal-body">
        <div class="section-label">Notificaciones</div>
        ${sw("cf-1", "notifBlog", "Nuevas publicaciones en el blog", a.notifBlog)}
        ${sw("cf-2", "notifComentarios", "Comentarios en mis publicaciones", a.notifComentarios)}
        ${sw("cf-3", "notifModeracion", "Reportes de moderación", a.notifModeracion)}
        ${sw("cf-4", "notifInstitucional", "Comunicados institucionales", a.notifInstitucional)}
        <div class="section-label">Cuenta</div>
        <button type="button" class="action-row" data-m="pass">${I("key-round")} Cambiar contraseña</button>
        <div class="action-row" style="color:var(--teal);font-weight:600">${I("mail")} ${u.correo} ✓ verificado</div>
        <div class="section-label">Uso sin conexión</div>
        <div class="action-row" id="pwa-estado" style="cursor:default">${I("wifi")} Revisando…</div>
        <div class="action-row" id="datos-estado" style="cursor:default">${I("database")} Revisando datos guardados…</div>
        <button type="button" class="action-row" data-m="pendientes">${I("cloud-upload")} Pendientes de enviar <b class="mono" id="cfg-cola" style="margin-left:auto">${App.cola.cuantos}</b></button>
        <button type="button" class="action-row" data-m="reset">${I("rotate-ccw")} Restablecer datos de ejemplo</button>
        <button class="btn btn-dark btn-block" type="submit">Guardar y cerrar</button>
      </div></form>`, { acciones: {
        pass: () => M.cambiarPassword(),
        pendientes: () => { App.cerrarModal(true); App.cola.mostrar(); },
        reset: () => App.confirmar("Restablecer datos", "Se borrarán tus publicaciones, pagos, trámites y viajes de prueba y se cargarán los datos de ejemplo originales.", "Restablecer", () => {
          App.restablecer(); App.render(); App.toast("Datos de ejemplo restablecidos");
        }, true),
        guardar: f => {
          ["notifBlog", "notifComentarios", "notifModeracion", "notifInstitucional"].forEach(k => a[k] = f.elements[k].checked);
          App.guardar(); App.cerrarModal(); App.toast("Configuración guardada");
        } } });
    // Estado del service worker y del caché (semana 3)
    const caja = document.getElementById("pwa-estado");
    if (App.pwa && App.pwa.resumen && "caches" in window) {
      App.pwa.resumen().then(r => {
        if (!caja.isConnected) return;
        caja.innerHTML = r.activo
          ? `${I("circle-check")} <span>Disponible sin internet · versión <b class="mono">${r.version || "—"}</b> · ${r.archivos} archivos guardados (${App.pwa.mb(r.usado)})</span>`
          : `${I("wifi-off")} <span>Aún no está listo para usarse sin internet. Recarga la página una vez con conexión.</span>`;
      }).catch(() => { caja.textContent = "No se pudo revisar el caché."; });
    } else if (caja) caja.textContent = "Tu navegador no permite usar el portal sin conexión.";

    // Datos guardados en IndexedDB y almacenamiento persistente (semana 4)
    const datos = document.getElementById("datos-estado");
    (async () => {
      const bd = await App.bd.disponible();
      const persistente = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
      if (!datos.isConnected) return;
      datos.innerHTML = bd
        ? `${I("database")} <span>Tus datos están en IndexedDB${persistente ? " con <b>almacenamiento persistente</b> (el navegador no los borrará)" : " · el navegador podría borrarlos si se queda sin espacio"}</span>`
        : `${I("triangle-alert")} <span>Este navegador no permite IndexedDB (¿modo incógnito?). Tus datos se guardan de forma temporal.</span>`;
    })();
  };

  M.cambiarPassword = function () {
    const u = App.state.usuario;
    App.modal(`<div class="modal-head"><h2>Cambiar contraseña</h2></div>
      <form data-m="guardar" novalidate><div class="modal-body">
        <div class="field"><label for="cp-a">Contraseña actual</label><input class="input" id="cp-a" name="actual" type="password" autocomplete="current-password"></div>
        <div class="field"><label for="cp-n">Nueva contraseña</label><input class="input" id="cp-n" name="nueva" type="password" autocomplete="new-password"><small class="muted">Mínimo 8 caracteres, con al menos un número.</small></div>
        <div class="field"><label for="cp-c">Confirmar nueva contraseña</label><input class="input" id="cp-c" name="conf" type="password" autocomplete="new-password"></div>
      </div><div class="modal-foot"><button type="button" class="btn btn-outline" data-m="volver">Cancelar</button><button class="btn btn-primary">Cambiar contraseña</button></div></form>`,
      { acciones: {
        volver: () => M.config(),
        guardar: async f => {
          const ok = App.validar(f, {
            actual: v => !v ? "Escribe tu contraseña actual." : "",
            nueva: v => v.length < 8 || !/\d/.test(v) ? "Usa al menos 8 caracteres y un número." : v === f.actual.value.trim() ? "La nueva contraseña debe ser distinta a la actual." : "",
            conf: v => v !== f.nueva.value.trim() ? "Las contraseñas no coinciden." : ""
          });
          if (!ok) return;
          const boton = f.querySelector("button.btn-primary"); boton.disabled = true;
          const cambiada = await App.cuentas.cambiarPassword(u.correo, f.actual.value.trim(), f.nueva.value.trim());
          boton.disabled = false;
          if (!cambiada) { App.validar(f, { actual: () => "La contraseña actual no es correcta." }); return; }
          App.registrar("Cambiaste tu contraseña"); App.guardar();
          App.cerrarModal(); App.toast("Contraseña actualizada");
        } } });
  };

  M.privacidad = function () {
    const a = App.state.ajustes;
    const ops = ["Toda la comunidad", "Solo mi carrera", "Solo mi grupo"];
    App.modal(`<div class="modal-head"><h2>Privacidad</h2></div>
      <form data-m="guardar"><div class="modal-body">
        <div class="section-label">Visibilidad</div>
        <div class="field"><label for="pv-vis">Quién puede ver mis publicaciones</label>
          <select class="select" id="pv-vis" name="vis">${ops.map(o => `<option ${o === a.visibilidad ? "selected" : ""}>${o}</option>`).join("")}</select></div>
        ${sw("pv-1", "carrera", "Mostrar mi carrera en el perfil", a.mostrarCarrera)}
        ${sw("pv-2", "matricula", "Mostrar mi matrícula en publicaciones", a.mostrarMatricula)}
        <div class="section-label">Datos personales</div>
        <button type="button" class="action-row" data-m="hist">${I("clipboard-list")} Ver historial de actividad</button>
        <button type="button" class="action-row" data-m="desc">${I("download")} Descargar mis datos</button>
        <button type="button" class="action-row danger" data-m="borrar">${I("trash-2")} Eliminar cuenta</button>
        <button class="btn btn-dark btn-block" type="submit">Guardar y cerrar</button>
      </div></form>`, { acciones: {
        hist: () => M.historial(),
        desc: () => M.descargarDatos(),
        borrar: () => App.confirmar("Eliminar mi cuenta",
          "Se borrará tu cuenta del portal y todos tus datos (publicaciones, viajes, préstamos de prueba). Esta acción no se puede deshacer.",
          "Eliminar cuenta", async () => {
            const correo = App.state.usuario.correo;
            await App.cuentas.eliminar(correo); await App.borrarDatos(correo); await App.comunidad.borrarDe(correo);
            App.cerrarSesion(); location.hash = ""; App.render(true); App.toast("Tu cuenta se eliminó");
          }, true),
        guardar: f => {
          a.visibilidad = f.vis.value; a.mostrarCarrera = f.carrera.checked; a.mostrarMatricula = f.matricula.checked;
          App.guardar(); App.cerrarModal(); App.render(); App.toast("Preferencias de privacidad guardadas");
        } } });
  };

  M.historial = function () {
    const lista = App.state.actividad;
    App.modal(`<div class="modal-head"><h2>Historial de actividad</h2></div>
      <div class="modal-body">${lista.length ? lista.map(x => `<div class="kv"><b style="text-align:left">${U.esc(x.txt)}</b><span class="small">${U.hace(x.t)}</span></div>`).join("") : `<p class="muted">Sin actividad registrada.</p>`}</div>
      <div class="modal-foot"><button class="btn btn-outline" data-m="volver">Volver</button></div>`, { acciones: { volver: () => M.privacidad() } });
  };

  M.descargarDatos = function () {
    const s = App.state;
    const datos = { usuario: s.usuario, ajustes: s.ajustes, publicaciones: App.comunidad.posts.filter(p => p.correo === s.usuario.correo).map(p => ({ titulo: p.titulo, texto: p.texto, categoria: p.cat, moderacion: App.moderacion.estado(p) })),
      pagos: s.historialPagos, solicitudes: s.solicitudes, prestamos: s.prestamos, viajes: s.reservasViaje, actividad: s.actividad };
    const txt = JSON.stringify(datos, null, 2);
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" }));
      a.download = "mis-datos-utsc-" + s.usuario.matricula + ".json";
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { /* algunos visores bloquean descargas; abajo se muestra el contenido */ }
    App.modal(`<div class="modal-head"><h2>Tus datos</h2><p class="small muted">Se descargó el archivo <span class="mono">mis-datos-utsc-${s.usuario.matricula}.json</span>. Si tu navegador lo bloqueó, puedes copiar el contenido.</p></div>
      <div class="modal-body"><textarea class="textarea mono" style="min-height:240px;font-size:12px" readonly id="datos-json">${U.esc(txt)}</textarea></div>
      <div class="modal-foot"><button class="btn btn-outline" data-m="volver">Volver</button><button class="btn btn-primary" data-m="copiar">Copiar</button></div>`,
      { ancho: true, acciones: { volver: () => M.privacidad(), copiar: () => { const t = document.getElementById("datos-json"); t.select(); U.copiar("datos del portal"); try { navigator.clipboard.writeText(t.value); } catch (e) { } } } });
  };

  // Cierra la sesión actual y regresa al inicio de sesión para entrar con otra cuenta.
  M.cambiarCuenta = function () {
    App.registrar("Cerraste sesión"); App.guardar();
    App.cerrarSesion(); location.hash = ""; App.render(true);
    App.toast("Inicia sesión con otra cuenta");
  };

  M.salir = function () {
    App.registrar("Cerraste sesión"); App.guardar();
    App.cerrarSesion(); location.hash = ""; App.render(true);
  };
})();
