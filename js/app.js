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

  // ---------- Inicio de sesión y registro ----------
  const CORREO_OK = /^[a-z0-9]+([._-][a-z0-9]+)*@utsc\.edu\.mx$/i;
  const DEMO = { nombre: "Alumno", apellidos: "de Prueba", matricula: "00000", carrera: "DSM", semestre: 4, grupo: "DSM04AV", correo: "demo@utsc.edu.mx" };
  const DEMO_PASS = "demo2026";
  let modoLogin = "entrar";

  function campoPass(id, nombre, auto, placeholder) {
    return `<div class="pass-wrap"><input class="input" id="${id}" name="${nombre}" type="password" autocomplete="${auto}" placeholder="${placeholder}">
      <button type="button" class="pass-toggle" data-ver="${id}" aria-label="Mostrar contraseña">${I("eye")}</button></div>`;
  }

  function formEntrar() {
    return `<form id="form-login" class="login-form" novalidate>
      <div class="login-alert" id="login-alert" hidden></div>
      <div class="field"><label for="l-correo">Correo institucional</label>
        <input class="input" id="l-correo" name="correo" type="email" autocomplete="username" placeholder="matricula@utsc.edu.mx"></div>
      <div class="field"><label for="l-pass">Contraseña</label>${campoPass("l-pass", "pass", "current-password", "Tu contraseña")}</div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Entrar al portal</button>
      <p class="login-switch">¿Aún no tienes cuenta? <button type="button" class="link" data-modo="crear">Crear cuenta</button></p>
      <div class="login-hint">¿Solo quieres conocer el portal? Entra con la cuenta de prueba: <b class="mono">demo@utsc.edu.mx</b> / <b class="mono">demo2026</b>.
        <button type="button" class="btn btn-outline btn-block" id="demo" style="margin-top:10px">Entrar con la cuenta de prueba</button></div>
    </form>`;
  }

  function formCrear() {
    const carreras = App.CATALOGO.carreras;
    return `<form id="form-crear" class="login-form" novalidate>
      <div class="login-alert" id="login-alert" hidden></div>
      <div class="form-row">
        <div class="field"><label for="r-nombre">Nombre(s)</label><input class="input" id="r-nombre" name="nombre" maxlength="40" autocomplete="given-name" placeholder="Ana Sofía"></div>
        <div class="field"><label for="r-apellidos">Apellidos</label><input class="input" id="r-apellidos" name="apellidos" maxlength="60" autocomplete="family-name" placeholder="López Hernández"></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="r-mat">Matrícula</label><input class="input mono" id="r-mat" name="matricula" inputmode="numeric" maxlength="8" placeholder="27102"></div>
        <div class="field"><label for="r-cuatri">Cuatrimestre</label><select class="select" id="r-cuatri" name="semestre">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option value="${n}" ${n === 1 ? "selected" : ""}>${n}°</option>`).join("")}</select></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="r-carrera">Carrera</label><select class="select" id="r-carrera" name="carrera">${carreras.map(c => `<option value="${c.clave}">${c.clave} · ${c.nombre.replace("Ing. ", "")}</option>`).join("")}</select></div>
        <div class="field"><label for="r-grupo">Grupo</label><input class="input mono" id="r-grupo" name="grupo" maxlength="10" placeholder="DSM01AV" style="text-transform:uppercase"></div>
      </div>
      <div class="field"><label for="r-correo">Correo institucional</label><input class="input" id="r-correo" name="correo" type="email" autocomplete="email" placeholder="matricula@utsc.edu.mx"></div>
      <div class="form-row">
        <div class="field"><label for="r-pass">Contraseña</label>${campoPass("r-pass", "pass", "new-password", "Mínimo 8, con un número")}</div>
        <div class="field"><label for="r-pass2">Confirmar</label>${campoPass("r-pass2", "pass2", "new-password", "Repítela")}</div>
      </div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Crear mi cuenta</button>
      <p class="login-switch">¿Ya tienes cuenta? <button type="button" class="link" data-modo="entrar">Inicia sesión</button></p>
      <p class="login-nota">Tu cuenta se guarda solo en este navegador. Tu contraseña se guarda cifrada.</p>
    </form>`;
  }

  function pantallaLogin() {
    const u = App.CATALOGO.universidad, crear = modoLogin === "crear";
    return `<div class="login">
      <div class="login-inner ${crear ? "ancho" : ""}">
        <div class="login-logo"><img src="img/logo-utsc.png" alt="Logotipo UTSC" width="80" height="62"></div>
        <div><h1>Portal Universitario</h1><p class="sub">${u.nombre}</p><p class="sub2">${u.ciudad}</p></div>
        <div class="login-card">
          <header><h2>${crear ? "Crear cuenta" : "Iniciar sesión"}</h2><p>${crear ? "Regístrate con tu correo institucional UTSC" : "Acceso exclusivo para la comunidad universitaria UTSC"}</p></header>
          <div class="login-panel">${crear ? formCrear() : formEntrar()}</div>
        </div>
      </div>
    </div>`;
  }

  function alerta(root, txt) {
    const a = root.querySelector("#login-alert");
    a.textContent = txt; a.hidden = !txt;
  }
  async function entrar(perfil, accion) {
    App.iniciarSesion(perfil);
    App.registrar(accion);
    App.guardar();
    location.hash = "inicio";
    App.render(true);
  }
  function ocupado(form, si) {
    const b = form.querySelector("button[type=submit]");
    b.disabled = si; b.classList.toggle("cargando", si);
  }

  function enlazarLogin(root) {
    root.querySelectorAll("[data-modo]").forEach(b => b.addEventListener("click", () => {
      if (modoLogin === b.dataset.modo) return;
      modoLogin = b.dataset.modo;
      App.render();
      const p = root.querySelector(".login-panel"); p.classList.add("cambio");
      const primero = root.querySelector(".login-form input"); if (primero) primero.focus();
    }));

    const fLogin = root.querySelector("#form-login");
    if (fLogin) {
      fLogin.addEventListener("submit", async e => {
        e.preventDefault();
        alerta(root, "");
        const ok = App.validar(fLogin, {
          correo: v => !v ? "Escribe tu correo institucional." : !CORREO_OK.test(v) ? "Usa tu correo que termina en @utsc.edu.mx." : "",
          pass: v => !v ? "Escribe tu contraseña." : ""
        });
        if (!ok) return;
        ocupado(fLogin, true);
        try {
          const perfil = await App.cuentas.verificar(fLogin.correo.value, fLogin.pass.value);
          if (!perfil) {
            const existe = await App.cuentas.obtener(fLogin.correo.value);
            ocupado(fLogin, false);
            alerta(root, existe ? "La contraseña no es correcta." : "No hay una cuenta con ese correo en este navegador. Crea una con «Crear cuenta».");
            fLogin.classList.add("sacudir"); setTimeout(() => fLogin.classList.remove("sacudir"), 450);
            return;
          }
          entrar(perfil, "Iniciaste sesión");
        } catch (err) { ocupado(fLogin, false); alerta(root, err.message); }
      });
      root.querySelector("#demo").addEventListener("click", async () => {
        try {
          let perfil = await App.cuentas.verificar(DEMO.correo, DEMO_PASS);
          if (!perfil) perfil = await App.cuentas.crear(DEMO, DEMO_PASS);
          entrar(perfil, "Entraste con la cuenta de prueba");
        } catch (err) { alerta(root, err.message); }
      });
    }

    const fCrear = root.querySelector("#form-crear");
    if (fCrear) {
      // Sugerencias: correo a partir de la matrícula y grupo a partir de carrera + cuatrimestre.
      let correoEditado = false, grupoEditado = false;
      fCrear.correo.addEventListener("input", () => correoEditado = true);
      fCrear.grupo.addEventListener("input", () => grupoEditado = true);
      const sugerir = () => {
        const m = fCrear.matricula.value.trim();
        if (!correoEditado) fCrear.correo.value = m ? m + "@utsc.edu.mx" : "";
        if (!grupoEditado) fCrear.grupo.value = fCrear.carrera.value + String(fCrear.semestre.value).padStart(2, "0") + "AV";
      };
      fCrear.matricula.addEventListener("input", () => { fCrear.matricula.value = fCrear.matricula.value.replace(/\D/g, ""); sugerir(); });
      fCrear.carrera.addEventListener("change", sugerir);
      fCrear.semestre.addEventListener("change", sugerir);
      sugerir();

      fCrear.addEventListener("submit", async e => {
        e.preventDefault();
        alerta(root, "");
        const ok = App.validar(fCrear, {
          nombre: v => v.length < 2 ? "Escribe tu nombre." : "",
          apellidos: v => v.length < 2 ? "Escribe tus apellidos." : "",
          matricula: v => !/^\d{4,8}$/.test(v) ? "La matrícula son solo números (4 a 8 dígitos)." : "",
          grupo: v => !/^[A-Za-z]{2,4}\d{2}[A-Za-z]{1,3}$/.test(v) ? "Escribe tu grupo, por ejemplo DSM04AV." : "",
          correo: v => !CORREO_OK.test(v) ? "Usa tu correo que termina en @utsc.edu.mx." : "",
          pass: v => v.length < 8 || !/\d/.test(v) ? "Usa al menos 8 caracteres y un número." : "",
          pass2: v => v !== fCrear.pass.value.trim() ? "Las contraseñas no coinciden." : ""
        });
        if (!ok) return;
        ocupado(fCrear, true);
        try {
          const perfil = await App.cuentas.crear({
            nombre: fCrear.nombre.value.trim(), apellidos: fCrear.apellidos.value.trim(),
            matricula: fCrear.matricula.value.trim(), carrera: fCrear.carrera.value,
            semestre: Number(fCrear.semestre.value), grupo: fCrear.grupo.value.trim().toUpperCase(),
            correo: fCrear.correo.value.trim().toLowerCase()
          }, fCrear.pass.value.trim());
          modoLogin = "entrar";
          entrar(perfil, "Creaste tu cuenta");
          App.toast("¡Listo! Tu cuenta quedó creada");
        } catch (err) { ocupado(fCrear, false); alerta(root, err.message); }
      });
    }
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
    $("#dropdown").hidden = true;

    const migas = $("#migas");
    migas.hidden = !vista.migas;
    if (vista.migas) $("#migas-actual").textContent = vista.migas;
  }

  // ---------- Render ----------
  let rutaAnterior = null;
  const reducirMovimiento = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Numera las tarjetas de las listas para que aparezcan en cascada (ver .escalonado en app.css).
  function escalonar(main) {
    let i = 0;
    main.querySelectorAll(".quick-grid > *, .news-grid > *, .proc-grid > *, .dir-grid > *, .book-grid > *, .res-grid > *, [data-p=lista] > *, .home-grid > *, .side-stack > *, .stack > .card, .stack > section")
      .forEach(el => { if (i < 14) el.style.setProperty("--i", i++); });
    main.classList.add("escalonado");
    clearTimeout(escalonar.t);
    escalonar.t = setTimeout(() => main.classList.remove("escalonado"), 1100);
  }

  function pintarVista(ruta, vista, subir, cambioRuta) {
    const main = $("#vista");
    const scroll = window.scrollY;
    actualizarShell(ruta, vista);
    main.innerHTML = vista.render();   // solo cambia el contenido; el shell se queda igual
    main.setAttribute("aria-busy", "false");
    document.title = (vista.titulo ? vista.titulo + " · " : "") + "Portal UTSC";
    if (vista.alMostrar) vista.alMostrar(main);
    if (subir || cambioRuta) window.scrollTo({ top: 0, behavior: "instant" }); else window.scrollTo({ top: scroll, behavior: "instant" });
    if (cambioRuta && !reducirMovimiento()) escalonar(main);
  }

  App.render = function (subir) {
    const login = $("#login"), shell = $("#shell");
    document.documentElement.classList.toggle("sin-sesion", !App.sesion);
    if (!App.sesion) {
      document.title = "Portal UTSC";
      shell.hidden = true;
      login.hidden = false;
      login.innerHTML = pantallaLogin();
      enlazarLogin(login);
      rutaAnterior = null;
      return;
    }
    login.hidden = true;
    login.innerHTML = "";
    shell.hidden = false;
    const ruta = App.ruta();
    const vista = App.views[ruta];
    const cambioRuta = ruta !== rutaAnterior;
    rutaAnterior = ruta;

    // Al cambiar de sección, la vista nueva entra con una transición suave.
    if (cambioRuta && document.startViewTransition && !reducirMovimiento()) {
      document.startViewTransition(() => pintarVista(ruta, vista, subir, true));
    } else {
      pintarVista(ruta, vista, subir, cambioRuta);
      if (cambioRuta && !document.startViewTransition && !reducirMovimiento()) {
        const main = $("#vista");
        main.classList.remove("entrando"); void main.offsetWidth; main.classList.add("entrando");
      }
    }
  };

  // Sombra en el encabezado al bajar, y la barra de módulos se esconde al bajar y regresa al subir.
  let ultimoY = 0, pendiente = false;
  window.addEventListener("scroll", () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      const y = window.scrollY, raiz = document.documentElement;
      raiz.classList.toggle("con-scroll", y > 8);
      if (Math.abs(y - ultimoY) > 6) raiz.classList.toggle("ocultar-modbar", y > ultimoY && y > 160);
      ultimoY = y; pendiente = false;
    });
  }, { passive: true });

  // Vuelve a pintar solo una parte (para buscadores, sin perder el foco del campo).
  App.refrescar = function (nombre) {
    const vista = App.views[App.ruta()];
    const el = document.querySelector(`[data-p="${nombre}"]`);
    if (el && vista.parciales && vista.parciales[nombre]) el.innerHTML = vista.parciales[nombre]();
  };

  // Delegación de eventos: data-a (clic), data-c (cambio/escritura), formularios con data-f.
  function vistaActual() { return App.views[App.ruta()]; }
  document.addEventListener("click", e => {
    const ver = e.target.closest("[data-ver]");
    if (ver) {
      const inp = document.getElementById(ver.dataset.ver), mostrar = inp.type === "password";
      inp.type = mostrar ? "text" : "password";
      ver.innerHTML = I(mostrar ? "eye-off" : "eye");
      ver.setAttribute("aria-label", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");
      return;
    }
    if (!App.sesion || e.target.closest(".overlay")) return;
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
  // Los buscadores filtran cuando dejas de escribir (120 ms), no con cada tecla.
  let esperaBusqueda = null;
  ["input", "change"].forEach(tipo => document.addEventListener(tipo, e => {
    if (!App.sesion || e.target.closest(".overlay")) return;
    const el = e.target.closest("[data-c]");
    if (!el) return;
    const v = vistaActual();
    if (!v.cambios || !v.cambios[el.dataset.c]) return;
    if (el.type === "search" && tipo === "input") {
      clearTimeout(esperaBusqueda);
      esperaBusqueda = setTimeout(() => v.cambios[el.dataset.c](el, e, tipo), 120);
    } else v.cambios[el.dataset.c](el, e, tipo);
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

  App.arrancar = async function () {
    await App.cargar();
    App.render(true);
  };
})();

App.arrancar();
