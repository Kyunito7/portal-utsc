/* Aplicación: inicio de sesión, encabezado, menús, navegación entre secciones. */
(function () {
  const U = App.util;
  const RUTAS = ["inicio", "blog", "noticias", "directorio", "contacto", "kardex", "horarios", "pagos", "tramites", "biblioteca", "driver", "moderacion"];
  App.params = {};

  // La dirección puede traer datos extra: #blog?p=p12 abre esa publicación (para compartir enlaces).
  App.ruta = function () {
    const r = (location.hash || "").replace("#", "").split("?")[0];
    return RUTAS.includes(r) ? r : "inicio";
  };
  App.consulta = () => new URLSearchParams((location.hash.split("?")[1]) || "");
  App.ir = function (ruta, params) {
    App.params = params || {};
    if (App.ruta() === ruta && location.hash) { App.render(true); return; }
    location.hash = ruta;
  };

  // ---------- Inicio de sesión y registro ----------
  // Modos de la pantalla: entrar · crear · recuperar (olvidé mi contraseña) ·
  // revisa (te mandamos un correo) · nueva (escribe tu contraseña nueva, al abrir el enlace del correo).
  const CFG = App.config || {};
  const S = App.seguridad;
  const NUBE = () => App.cuentas.modo === "nube";
  const INSTITUCIONAL = /^[a-z0-9]+([._-][a-z0-9]+)*@utsc\.edu\.mx$/i;
  const CUALQUIERA = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;
  const correoValido = v => CFG.soloCorreoInstitucional ? INSTITUCIONAL.test(v) : CUALQUIERA.test(v);
  const errorCorreo = v => !v ? "Escribe tu correo." : !correoValido(v)
    ? (CFG.soloCorreoInstitucional ? "Usa tu correo que termina en @utsc.edu.mx." : "Escribe un correo válido, por ejemplo nombre@gmail.com.") : "";
  const ETIQUETA_CORREO = CFG.soloCorreoInstitucional ? "Correo institucional" : "Correo electrónico";
  const EJEMPLO_CORREO = CFG.soloCorreoInstitucional ? "matricula@utsc.edu.mx" : "tucorreo@ejemplo.com";

  // Cuentas de prueba: solo existen en el modo demostración (sin Supabase).
  const DEMO = { nombre: "Alumno", apellidos: "de Prueba", matricula: "00000", carrera: "DSM", semestre: 4, grupo: "DSM04AV", correo: "demo@utsc.edu.mx" };
  const DEMO_PASS = "demo2026";
  const DEMO_MOD = { nombre: "Laura", apellidos: "Moderadora de Prueba", matricula: "90001", carrera: "DSM", semestre: 10, grupo: "MODERACION", correo: "moderador@utsc.edu.mx", rol: "Moderador" };
  const DEMO_MOD_PASS = "modera2026";
  let modoLogin = "entrar";
  let correoEnviado = { tipo: "", correo: "" };   // para la pantalla "revisa tu correo"
  let avisoPendiente = "";                        // aviso que se muestra al pintar el formulario

  function campoPass(id, nombre, auto, placeholder) {
    return `<div class="pass-wrap"><input class="input" id="${id}" name="${nombre}" type="password" autocomplete="${auto}" placeholder="${placeholder}" maxlength="${S.MAX}">
      <button type="button" class="pass-toggle" data-ver="${id}" aria-label="Mostrar contraseña">${I("eye")}</button></div>`;
  }

  // Medidor de seguridad de la contraseña con la lista de reglas (se usa también en Cambiar contraseña).
  App.medidorPassword = function (id) {
    return `<div class="medidor" data-medidor="${id}" data-nivel="0" aria-live="polite">
      <div class="medidor-barra"><span></span><span></span><span></span><span></span></div>
      <ul class="medidor-reglas">${S.revisar("").reglas.map(r => `<li>${U.esc(r.txt)}</li>`).join("")}</ul></div>`;
  };
  App.enlazarMedidor = function (root, id, datos) {
    const inp = root.querySelector("#" + id), med = root.querySelector(`[data-medidor="${id}"]`);
    if (!inp || !med) return;
    const pintar = () => {
      const r = S.revisar(inp.value.trim(), datos ? datos() : null);
      med.dataset.nivel = inp.value ? Math.max(1, r.nivel) : 0;
      med.querySelectorAll("li").forEach((li, i) => li.classList.toggle("ok", r.reglas[i].ok));
    };
    inp.addEventListener("input", pintar);
    pintar();
  };

  function formEntrar() {
    return `<form id="form-login" class="login-form" novalidate>
      <div class="login-alert" id="login-alert" hidden></div>
      <div class="field"><label for="l-correo">${ETIQUETA_CORREO}</label>
        <input class="input" id="l-correo" name="correo" type="email" autocomplete="username" placeholder="${EJEMPLO_CORREO}" maxlength="120"></div>
      <div class="field"><label for="l-pass">Contraseña</label>${campoPass("l-pass", "pass", "current-password", "Tu contraseña")}</div>
      ${NUBE() ? `<button type="button" class="link login-olvide" data-modo="recuperar">¿Olvidaste tu contraseña?</button>` : ""}
      <button class="btn btn-primary btn-lg btn-block" type="submit">Entrar al portal</button>
      <p class="login-switch">¿Aún no tienes cuenta? <button type="button" class="link" data-modo="crear">Crear cuenta</button></p>
      ${NUBE() ? `<p class="login-nota">${I("lock")} Conexión cifrada. Tu contraseña la protege Supabase; el portal nunca la guarda.</p>`
        : `<div class="login-hint">¿Solo quieres conocer el portal? Entra con la cuenta de prueba: <b class="mono">demo@utsc.edu.mx</b> / <b class="mono">demo2026</b>.
        <button type="button" class="btn btn-outline btn-block" id="demo" style="margin-top:10px">Entrar con la cuenta de prueba</button>
        <button type="button" class="link" id="demo-mod" style="margin-top:8px">${I("shield-check")} Entrar como moderador de prueba</button></div>`}
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
      <div class="field"><label for="r-correo">${ETIQUETA_CORREO}</label><input class="input" id="r-correo" name="correo" type="email" autocomplete="email" placeholder="${EJEMPLO_CORREO}" maxlength="120">
        ${NUBE() ? `<small class="muted">Te mandaremos un enlace para confirmar que el correo es tuyo.</small>` : ""}</div>
      <div class="form-row">
        <div class="field"><label for="r-pass">Contraseña</label>${campoPass("r-pass", "pass", "new-password", `Mínimo ${S.MIN} caracteres`)}</div>
        <div class="field"><label for="r-pass2">Confirmar</label>${campoPass("r-pass2", "pass2", "new-password", "Repítela")}</div>
      </div>
      ${App.medidorPassword("r-pass")}
      <button class="btn btn-primary btn-lg btn-block" type="submit">Crear mi cuenta</button>
      <p class="login-switch">¿Ya tienes cuenta? <button type="button" class="link" data-modo="entrar">Inicia sesión</button></p>
      <p class="login-nota">${NUBE() ? `${I("lock")} Tu contraseña se envía cifrada y nunca se guarda en este navegador.` : "Modo demostración: tu cuenta se guarda solo en este navegador y la contraseña se guarda cifrada."}</p>
    </form>`;
  }

  function formRecuperar() {
    return `<form id="form-recuperar" class="login-form" novalidate>
      <div class="login-alert" id="login-alert" hidden></div>
      <p class="login-texto">Escribe el correo de tu cuenta y te mandaremos un enlace para crear una contraseña nueva.</p>
      <div class="field"><label for="rc-correo">${ETIQUETA_CORREO}</label>
        <input class="input" id="rc-correo" name="correo" type="email" autocomplete="username" placeholder="${EJEMPLO_CORREO}" maxlength="120"></div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Enviar enlace</button>
      <p class="login-switch"><button type="button" class="link" data-modo="entrar">Volver a iniciar sesión</button></p>
    </form>`;
  }

  function panelRevisa() {
    const conf = correoEnviado.tipo === "confirmar";
    return `<div class="login-form login-revisa">
      <div class="login-alert" id="login-alert" hidden></div>
      <div class="login-icono">${I("mail")}</div>
      <p class="login-texto">${conf
        ? `Te enviamos un enlace a <b>${U.esc(correoEnviado.correo)}</b>. Ábrelo para confirmar tu cuenta y después inicia sesión.`
        : `Si hay una cuenta con <b>${U.esc(correoEnviado.correo)}</b>, te enviamos un enlace para crear una contraseña nueva.`}</p>
      <p class="login-nota">Ábrelo en este mismo navegador. Si no lo ves en unos minutos, revisa la carpeta de spam o correo no deseado.</p>
      ${conf ? `<button type="button" class="btn btn-outline btn-block" id="reenviar">Reenviar correo</button>` : ""}
      <p class="login-switch"><button type="button" class="link" data-modo="entrar">Volver a iniciar sesión</button></p>
    </div>`;
  }

  function formNueva() {
    return `<form id="form-nueva" class="login-form" novalidate>
      <div class="login-alert" id="login-alert" hidden></div>
      <p class="login-texto">Escribe tu contraseña nueva para <b>${U.esc((App.perfilRecuperar || {}).correo || "")}</b>.</p>
      <div class="field"><label for="n-pass">Contraseña nueva</label>${campoPass("n-pass", "pass", "new-password", `Mínimo ${S.MIN} caracteres`)}</div>
      ${App.medidorPassword("n-pass")}
      <div class="field"><label for="n-pass2">Confirmar</label>${campoPass("n-pass2", "pass2", "new-password", "Repítela")}</div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Guardar y entrar</button>
    </form>`;
  }

  const TITULOS = {
    entrar: ["Iniciar sesión", "Acceso exclusivo para la comunidad universitaria UTSC"],
    crear: ["Crear cuenta", "Regístrate con tu correo y una contraseña segura"],
    recuperar: ["Recuperar contraseña", "Te ayudamos a entrar de nuevo"],
    revisa: ["Revisa tu correo", "Ya casi terminas"],
    nueva: ["Contraseña nueva", "Elige una contraseña que no uses en otros sitios"]
  };
  const FORMULARIOS = { entrar: formEntrar, crear: formCrear, recuperar: formRecuperar, revisa: panelRevisa, nueva: formNueva };

  function pantallaLogin() {
    const u = App.CATALOGO.universidad, crear = modoLogin === "crear";
    const [titulo, sub] = TITULOS[modoLogin];
    return `<div class="login">
      <div class="login-inner ${crear ? "ancho" : ""}">
        <div class="login-logo"><img src="img/logo-utsc-completo.png" alt="Logotipo UTSC, Universidad Tecnológica Santa Catarina" width="128" height="152"></div>
        <div><h1>Portal Universitario</h1><p class="sub">${u.nombre}</p><p class="sub2">${u.ciudad}</p></div>
        <div class="login-card">
          <header><h2>${titulo}</h2><p>${sub}</p></header>
          <div class="login-panel">${FORMULARIOS[modoLogin]()}</div>
        </div>
      </div>
    </div>`;
  }

  function alerta(root, txt, tipo) {
    const a = root.querySelector("#login-alert");
    if (!a) return;
    a.textContent = txt; a.hidden = !txt;
    a.classList.toggle("ok", tipo === "ok");
  }
  function sacudir(form) { form.classList.add("sacudir"); setTimeout(() => form.classList.remove("sacudir"), 450); }
  function cambiarModo(modo) {
    modoLogin = modo;
    App.render();
    const root = $("#login");
    const p = root.querySelector(".login-panel"); if (p) p.classList.add("cambio");
    const primero = root.querySelector(".login-form input"); if (primero) primero.focus();
  }
  async function entrar(perfil, accion) {
    await App.iniciarSesion(perfil);
    App.registrar(accion);
    App.guardar();
    location.hash = "inicio";
    App.render(true);
    await App.cola.contar();
    App.cola.procesar();
  }
  function ocupado(form, si) {
    const b = form.querySelector("button[type=submit]");
    b.disabled = si; b.classList.toggle("cargando", si);
  }

  function enlazarLogin(root) {
    root.querySelectorAll("[data-modo]").forEach(b => b.addEventListener("click", () => {
      if (modoLogin !== b.dataset.modo) cambiarModo(b.dataset.modo);
    }));
    if (avisoPendiente) { alerta(root, avisoPendiente.txt || avisoPendiente, avisoPendiente.tipo); avisoPendiente = ""; }

    const fLogin = root.querySelector("#form-login");
    if (fLogin) {
      fLogin.addEventListener("submit", async e => {
        e.preventDefault();
        alerta(root, "");
        const ok = App.validar(fLogin, {
          correo: errorCorreo,
          pass: v => !v ? "Escribe tu contraseña." : ""
        });
        if (!ok) return;
        const espera = S.esperaRestante();
        if (espera) { alerta(root, `Hubo demasiados intentos fallidos. Por seguridad, espera ${espera} segundos.`); sacudir(fLogin); return; }
        ocupado(fLogin, true);
        const correo = fLogin.correo.value.trim().toLowerCase();
        try {
          const perfil = await App.cuentas.verificar(correo, fLogin.pass.value.trim());
          if (!perfil) {
            S.fallo();
            ocupado(fLogin, false);
            // El mismo aviso si el correo no existe o si la contraseña está mal: así nadie puede
            // averiguar qué correos tienen cuenta.
            alerta(root, "Correo o contraseña incorrectos.");
            fLogin.pass.value = ""; fLogin.pass.focus();
            sacudir(fLogin);
            return;
          }
          S.exito();
          entrar(perfil, "Iniciaste sesión");
        } catch (err) {
          ocupado(fLogin, false);
          if (err.message === "CONFIRMAR") {
            correoEnviado = { tipo: "confirmar", correo };
            avisoPendiente = { txt: "Primero confirma tu correo con el enlace que te enviamos.", tipo: "" };
            cambiarModo("revisa");
            return;
          }
          alerta(root, err.message);
        }
      });
      const demo = (datos, pass, accion) => async () => {
        try {
          let perfil = await App.cuentas.verificar(datos.correo, pass);
          if (!perfil) perfil = await App.cuentas.crear(datos, pass);
          entrar(perfil, accion);
        } catch (err) { alerta(root, err.message); }
      };
      const bDemo = root.querySelector("#demo"), bMod = root.querySelector("#demo-mod");
      if (bDemo) bDemo.addEventListener("click", demo(DEMO, DEMO_PASS, "Entraste con la cuenta de prueba"));
      if (bMod) bMod.addEventListener("click", demo(DEMO_MOD, DEMO_MOD_PASS, "Entraste como moderador"));
    }

    const fCrear = root.querySelector("#form-crear");
    if (fCrear) {
      // Sugerencias: grupo a partir de carrera + cuatrimestre (y el correo, si solo se aceptan institucionales).
      let correoEditado = false, grupoEditado = false;
      fCrear.correo.addEventListener("input", () => correoEditado = true);
      fCrear.grupo.addEventListener("input", () => grupoEditado = true);
      const sugerir = () => {
        const m = fCrear.matricula.value.trim();
        if (CFG.soloCorreoInstitucional && !correoEditado) fCrear.correo.value = m ? m + "@utsc.edu.mx" : "";
        if (!grupoEditado) fCrear.grupo.value = fCrear.carrera.value + String(fCrear.semestre.value).padStart(2, "0") + "AV";
      };
      fCrear.matricula.addEventListener("input", () => { fCrear.matricula.value = fCrear.matricula.value.replace(/\D/g, ""); sugerir(); });
      fCrear.carrera.addEventListener("change", sugerir);
      fCrear.semestre.addEventListener("change", sugerir);
      sugerir();
      const datos = () => ({ nombre: fCrear.nombre.value, apellidos: fCrear.apellidos.value, matricula: fCrear.matricula.value, correo: fCrear.correo.value });
      App.enlazarMedidor(root, "r-pass", datos);

      fCrear.addEventListener("submit", async e => {
        e.preventDefault();
        alerta(root, "");
        const ok = App.validar(fCrear, {
          nombre: v => v.length < 2 ? "Escribe tu nombre." : "",
          apellidos: v => v.length < 2 ? "Escribe tus apellidos." : "",
          matricula: v => !/^\d{4,8}$/.test(v) ? "La matrícula son solo números (4 a 8 dígitos)." : "",
          grupo: v => !/^[A-Za-z]{2,4}\d{2}[A-Za-z]{1,3}$/.test(v) ? "Escribe tu grupo, por ejemplo DSM04AV." : "",
          correo: errorCorreo,
          pass: v => S.revisar(v, datos()).error,
          pass2: v => v !== fCrear.pass.value.trim() ? "Las contraseñas no coinciden." : ""
        });
        if (!ok) return;
        ocupado(fCrear, true);
        const pass = fCrear.pass.value.trim();
        try {
          if (NUBE() && await S.filtrada(pass)) {
            ocupado(fCrear, false);
            App.validar(fCrear, { pass: () => "Esta contraseña apareció en filtraciones de datos de otros sitios. Elige otra." });
            return;
          }
          const correo = fCrear.correo.value.trim().toLowerCase();
          const perfil = await App.cuentas.crear({
            nombre: fCrear.nombre.value.trim(), apellidos: fCrear.apellidos.value.trim(),
            matricula: fCrear.matricula.value.trim(), carrera: fCrear.carrera.value,
            semestre: Number(fCrear.semestre.value), grupo: fCrear.grupo.value.trim().toUpperCase(),
            correo
          }, pass);
          if (!perfil) {   // modo nube: falta confirmar el correo
            correoEnviado = { tipo: "confirmar", correo };
            cambiarModo("revisa");
            return;
          }
          modoLogin = "entrar";
          entrar(perfil, "Creaste tu cuenta");
          App.toast("¡Listo! Tu cuenta quedó creada");
        } catch (err) { ocupado(fCrear, false); alerta(root, err.message); }
      });
    }

    const fRec = root.querySelector("#form-recuperar");
    if (fRec) {
      fRec.addEventListener("submit", async e => {
        e.preventDefault();
        alerta(root, "");
        if (!App.validar(fRec, { correo: errorCorreo })) return;
        ocupado(fRec, true);
        const correo = fRec.correo.value.trim().toLowerCase();
        try {
          await App.cuentas.recuperar(correo);
          correoEnviado = { tipo: "recuperar", correo };
          cambiarModo("revisa");
        } catch (err) { ocupado(fRec, false); alerta(root, err.message); }
      });
    }

    const bReenviar = root.querySelector("#reenviar");
    if (bReenviar) {
      bReenviar.addEventListener("click", async () => {
        bReenviar.disabled = true;
        try {
          await App.cuentas.reenviarConfirmacion(correoEnviado.correo);
          alerta(root, "Listo, te enviamos otro enlace.", "ok");
        } catch (err) { alerta(root, err.message); }
        // Espera 60 segundos antes de dejar reenviar otra vez.
        let s = 60;
        const t = setInterval(() => {
          bReenviar.textContent = `Reenviar correo (${--s} s)`;
          if (s <= 0) { clearInterval(t); bReenviar.disabled = false; bReenviar.textContent = "Reenviar correo"; }
        }, 1000);
      });
    }

    const fNueva = root.querySelector("#form-nueva");
    if (fNueva) {
      const perfil = App.perfilRecuperar || {};
      App.enlazarMedidor(root, "n-pass", () => perfil);
      fNueva.addEventListener("submit", async e => {
        e.preventDefault();
        alerta(root, "");
        if (!App.validar(fNueva, {
          pass: v => S.revisar(v, perfil).error,
          pass2: v => v !== fNueva.pass.value.trim() ? "Las contraseñas no coinciden." : ""
        })) return;
        ocupado(fNueva, true);
        const pass = fNueva.pass.value.trim();
        try {
          if (await S.filtrada(pass)) {
            ocupado(fNueva, false);
            App.validar(fNueva, { pass: () => "Esta contraseña apareció en filtraciones de datos de otros sitios. Elige otra." });
            return;
          }
          await App.cuentas.nuevaPassword(pass);
          App.perfilRecuperar = null;
          modoLogin = "entrar";
          S.exito();
          await entrar(perfil, "Cambiaste tu contraseña");
          App.toast("Contraseña actualizada");
        } catch (err) { ocupado(fNueva, false); alerta(root, err.message); }
      });
    }
  }

  // Lo que pasó al abrir el portal desde un enlace del correo (lo deja App.cargar en nucleo.js).
  App.avisosDeInicio = function () {
    const a = App.avisoInicio;
    App.avisoInicio = null;
    if (App.perfilRecuperar) modoLogin = "nueva";
    if (!a) return;
    if (a.error) { modoLogin = App.perfilRecuperar ? "nueva" : "entrar"; avisoPendiente = a.error; }
    if (a.accion === "confirmado" && App.sesion) setTimeout(() => App.toast("¡Correo confirmado! Bienvenido al portal"), 300);
  };

  // Si la sesión se cierra en otra pestaña, o Supabase la invalida, se regresa al login.
  if (App.cuentas.alCambiar) {
    App.cuentas.alCambiar(evento => {
      if (evento === "SIGNED_OUT" && App.sesion) {
        App.sesion = false;
        try { localStorage.removeItem(App.cuentas.CLAVE_SESION); } catch (e) { }
        modoLogin = "entrar";
        avisoPendiente = "Tu sesión terminó. Vuelve a iniciar sesión.";
        location.hash = ""; App.render(true);
      }
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
    App.capacidades.insignia(sinLeer);
    App.capacidades.pintarBotones();
    App.cola.pintarChip();

    document.querySelectorAll("[data-shell=iniciales]").forEach(el => el.textContent = U.iniciales(U.nombreCompleto()));
    $("[data-shell=nombre-corto]").textContent = u.nombre.split(" ")[0];
    $("[data-shell=matricula]").textContent = u.matricula;
    $("[data-shell=nombre]").textContent = U.nombreCompleto();
    $("[data-shell=correo]").textContent = u.correo;
    $("[data-shell=promedio]").textContent = "Promedio: " + App.academico().promedio.toFixed(1);
    $("[data-shell=grupo]").textContent = u.grupo;
    // Opciones solo para moderadores
    const esMod = App.moderacion.esModerador(), porRevisar = esMod ? App.comunidad.cuantosPendientes() : 0;
    document.querySelectorAll("[data-solo-mod]").forEach(el => el.hidden = !esMod);
    const cMod = $("#dd-mod-count"); if (cMod) { cMod.textContent = porRevisar; cMod.hidden = !porRevisar; }
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
      if (login.hasAttribute("data-pre")) { login.removeAttribute("data-pre"); login.firstElementChild.classList.add("ya"); }
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
    if (e.target.closest("#chip-cola")) { App.cola.mostrar(); return; }
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
    // Las noticias (data/noticias.json) se piden al mismo tiempo, pero la pantalla
    // no las espera: se pinta en cuanto se sabe si hay sesión (semana 5: rendimiento).
    const noticias = App.contenido.cargar();
    await App.cargar();
    App.avisosDeInicio();
    if (App.capacidades.recibido) location.hash = "blog";   // llegó algo compartido desde otra app
    const necesita = () => App.sesion && ["inicio", "noticias"].includes(App.ruta());
    const esperada = necesita();
    if (esperada) await noticias;
    App.render(true);
    if (!esperada) noticias.then(() => { if (necesita()) App.render(); });
    if (App.sesion) { await App.cola.contar(); App.cola.procesar(); }
  };
})();

App.arrancar();
