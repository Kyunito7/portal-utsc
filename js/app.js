/* Aplicación: inicio de sesión, encabezado, menús, navegación entre secciones. */
(function () {
  const U = App.util;
  const RUTAS = ["inicio", "blog", "noticias", "directorio", "contacto", "kardex", "horarios", "pagos", "tramites", "biblioteca", "driver"];
  App.params = {};

  App.ruta = function () {
    const r = (location.hash || "").replace("#", "");
    return RUTAS.includes(r) ? r : "inicio";
  };
  App.ir = function (ruta, params) {
    App.params = params || {};
    if (App.ruta() === ruta && location.hash) { App.render(true); return; }
    location.hash = ruta;
  };

  // ---------- Inicio de sesión ----------
  function pantallaLogin() {
    const u = App.CATALOGO.universidad;
    return `<div class="login">
      <div class="login-inner">
        <div class="login-logo"><img src="img/logo-utsc.png" alt="Logotipo UTSC"></div>
        <div><h1>Portal Universitario</h1><p class="sub">${u.nombre}</p><p class="sub2">${u.ciudad}</p></div>
        <div class="login-card">
          <header><h2>Iniciar sesión</h2><p>Acceso exclusivo para la comunidad universitaria UTSC</p></header>
          <form id="form-login" novalidate>
            <div class="login-alert" id="login-alert" hidden></div>
            <div class="field"><label for="l-correo">Correo institucional</label>
              <input class="input" id="l-correo" name="correo" type="email" autocomplete="username" placeholder="matricula@utsc.edu.mx" value="27254@utsc.edu.mx"></div>
            <div class="field"><label for="l-pass">Contraseña</label>
              <div class="pass-wrap"><input class="input" id="l-pass" name="pass" type="password" autocomplete="current-password" placeholder="Tu contraseña">
              <button type="button" class="pass-toggle" data-ver="l-pass" aria-label="Mostrar contraseña">${I("eye")}</button></div></div>
            <button class="btn btn-primary btn-lg btn-block" type="submit">Entrar al portal</button>
            <div class="login-hint">Cuenta de prueba: <b class="mono">27254@utsc.edu.mx</b> con la contraseña <b class="mono">utsc2026</b> (todo en minúsculas).
              <button type="button" class="btn btn-outline btn-block" id="demo" style="margin-top:10px">Entrar con la cuenta de prueba</button></div>
            <button type="button" class="link" id="olvide" style="justify-self:center;color:var(--muted);font-weight:500">¿Olvidaste tu contraseña? Contacta a Servicios Escolares</button>
          </form>
        </div>
      </div>
    </div>`;
  }
  function enlazarLogin(root) {
    const form = root.querySelector("#form-login");
    form.addEventListener("submit", e => {
      e.preventDefault();
      const alerta = root.querySelector("#login-alert");
      alerta.hidden = true;
      const ok = App.validar(form, {
        correo: v => !v ? "Escribe tu correo institucional." : !/^[a-z0-9]+([._-][a-z0-9]+)*@utsc\.edu\.mx$/i.test(v) ? "Usa tu correo que termina en @utsc.edu.mx (sin espacios ni puntos extra)." : "",
        pass: v => !v ? "Escribe tu contraseña." : ""
      });
      if (!ok) return;
      const correo = form.correo.value.trim().toLowerCase();
      const cuenta = [App.state.usuario, ...App.state.cuentasExtra].find(c => c.correo === correo);
      if (!cuenta || cuenta.password !== form.pass.value.trim()) {
        alerta.textContent = "El correo o la contraseña no coinciden. Revisa mayúsculas y espacios, o usa el botón «Entrar con la cuenta de prueba».";
        alerta.hidden = false;
        return;
      }
      App.iniciarSesion();
      App.registrar("Iniciaste sesión");
      App.guardar();
      location.hash = "inicio";
      App.render(true);
    });
    root.querySelector("#demo").addEventListener("click", () => {
      form.correo.value = App.state.usuario.correo;
      form.pass.value = App.state.usuario.password;
      form.requestSubmit();
    });
    root.querySelector("#olvide").addEventListener("click", () => {
      const d = U.depto("escolares");
      App.modal(`<div class="modal-head"><h2>Recuperar contraseña</h2></div>
        <div class="modal-body"><p class="muted">Servicios Escolares restablece las contraseñas institucionales. Acude con tu credencial o comunícate:</p>
        <div class="stack small"><div>${I("map-pin")} ${d.lugar}</div><div>${I("phone")} <span class="mono">${d.tel}</span></div><div>${I("mail")} <span class="mono">${d.correo}</span></div><div>${I("clock")} ${d.horario}</div></div></div>
        <div class="modal-foot"><button class="btn btn-dark" data-m="cerrar">Entendido</button></div>`);
    });
  }

  // ---------- App shell ----------
  // El encabezado, la barra de módulos y el pie ya vienen escritos en index.html (el "shell").
  // Aquí solo se actualizan los datos que cambian: usuario, avisos sin leer y la sección activa.
  const $ = sel => document.querySelector(sel);

  function actualizarShell(ruta, vista) {
    const u = App.state.usuario;
    const sinLeer = App.state.notificaciones.filter(n => !n.leida).length;
    const navActiva = vista.nav || ruta, modActivo = vista.mod || ruta;

    document.querySelectorAll("#mainnav a").forEach(a => a.classList.toggle("active", a.dataset.ruta === navActiva));
    document.querySelectorAll("#modbar a").forEach(a => a.classList.toggle("active", a.dataset.ruta === modActivo));
    $("#mainnav").classList.remove("open");

    const notif = $("#btn-notif");
    notif.setAttribute("aria-label", "Avisos" + (sinLeer ? ", " + sinLeer + " sin leer" : ""));
    $("#notif-dot").hidden = !sinLeer;
    $("#notif-dot").textContent = sinLeer;

    document.querySelectorAll("[data-shell=iniciales]").forEach(el => el.textContent = U.iniciales(U.nombreCompleto()));
    $("[data-shell=nombre-corto]").textContent = u.nombre.split(" ")[0];
    $("[data-shell=matricula]").textContent = u.matricula;
    $("[data-shell=nombre]").textContent = U.nombreCompleto();
    $("[data-shell=correo]").textContent = u.correo;
    $("[data-shell=promedio]").textContent = "Promedio: " + App.academico().promedio.toFixed(1);
    $("[data-shell=grupo]").textContent = u.grupo;
    $("#dd-cuentas").innerHTML = App.state.cuentasExtra.map((c, i) => `<button data-a="cambiarCuenta" data-i="${i}">${I("repeat")} Cambiar a ${U.esc(c.correo)}</button>`).join("");
    $("#dropdown").hidden = true;

    const migas = $("#migas");
    migas.hidden = !vista.migas;
    if (vista.migas) $("#migas-actual").textContent = vista.migas;
  }

  // ---------- Render ----------
  let rutaAnterior = null;
  App.render = function (subir) {
    const login = $("#login"), shell = $("#shell");
    document.documentElement.classList.toggle("sin-sesion", !App.sesion);
    if (!App.sesion) {
      document.title = "Portal UTSC";
      shell.hidden = true;
      login.hidden = false;
      login.innerHTML = pantallaLogin();
      enlazarLogin(login);
      return;
    }
    login.hidden = true;
    login.innerHTML = "";
    shell.hidden = false;
    const ruta = App.ruta();
    const vista = App.views[ruta];
    const scroll = window.scrollY;
    actualizarShell(ruta, vista);
    const main = $("#vista");
    main.innerHTML = vista.render();   // solo cambia el contenido; el shell se queda igual
    main.setAttribute("aria-busy", "false");
    document.title = (vista.titulo ? vista.titulo + " · " : "") + "Portal UTSC";
    if (vista.alMostrar) vista.alMostrar(main);
    if (subir || ruta !== rutaAnterior) window.scrollTo(0, 0); else window.scrollTo(0, scroll);
    rutaAnterior = ruta;
  };
  // Vuelve a pintar solo una parte (para buscadores, sin perder el foco del campo).
  App.refrescar = function (nombre) {
    const vista = App.views[App.ruta()];
    const el = document.querySelector(`[data-p="${nombre}"]`);
    if (el && vista.parciales && vista.parciales[nombre]) el.innerHTML = vista.parciales[nombre]();
  };

  // Delegación de eventos: data-a (clic), data-c (cambio/escritura), formularios con data-f.
  function vistaActual() { return App.views[App.ruta()]; }
  document.addEventListener("click", e => {
    if (!App.sesion || e.target.closest(".overlay")) return;
    const ver = e.target.closest("[data-ver]");
    if (ver) { const inp = document.getElementById(ver.dataset.ver); inp.type = inp.type === "password" ? "text" : "password"; return; }
    const dd = document.getElementById("dropdown");
    if (e.target.closest("#btn-user")) { const abierto = dd.hidden; dd.hidden = !abierto; e.target.closest("#btn-user").setAttribute("aria-expanded", String(abierto)); return; }
    if (dd && !dd.hidden && !e.target.closest("#dropdown")) dd.hidden = true;
    if (e.target.closest("#menu-toggle")) { const n = document.getElementById("mainnav"); n.classList.toggle("open"); e.target.closest("#menu-toggle").setAttribute("aria-expanded", String(n.classList.contains("open"))); return; }
    if (e.target.closest("#btn-notif")) { App.menu.avisos(); return; }
    const el = e.target.closest("[data-a]");
    if (!el) return;
    const nombre = el.dataset.a;
    const v = vistaActual();
    if (v && v.acciones && v.acciones[nombre]) { e.preventDefault(); v.acciones[nombre](el, e); }
    else if (App.menu[nombre]) { e.preventDefault(); if (dd) dd.hidden = true; App.menu[nombre](el, e); }
  });
  ["input", "change"].forEach(tipo => document.addEventListener(tipo, e => {
    if (!App.sesion || e.target.closest(".overlay")) return;
    const el = e.target.closest("[data-c]");
    if (!el) return;
    const v = vistaActual();
    if (v.cambios && v.cambios[el.dataset.c]) v.cambios[el.dataset.c](el, e, tipo);
  }));
  document.addEventListener("submit", e => {
    if (!App.sesion || e.target.closest(".overlay")) return;
    const f = e.target.closest("[data-f]");
    if (!f) return;
    e.preventDefault();
    const v = vistaActual();
    if (v.formularios && v.formularios[f.dataset.f]) v.formularios[f.dataset.f](f, e);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { App.cerrarModal(); const dd = document.getElementById("dropdown"); if (dd) dd.hidden = true; } });
  window.addEventListener("hashchange", () => App.render());

  App.arrancar = function () {
    App.cargar();
    App.render(true);
  };
})();

App.arrancar();
