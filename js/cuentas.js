/* Cuentas de usuario. Hay dos formas de funcionar (se elige en js/config.js):

   1. MODO NUBE (Supabase Auth) — cuando config.js tiene supabaseUrl y supabaseKey.
      - Te registras con un correo real y Supabase te manda un enlace para confirmarlo.
      - La contraseña viaja cifrada (HTTPS) y Supabase la guarda con bcrypt en su servidor.
        El navegador nunca la guarda; solo guarda una "sesión" (token) que caduca sola.
      - Sirve para recuperar la contraseña por correo y cerrar sesión en todos lados.

   2. MODO DEMOSTRACIÓN (local) — cuando config.js está vacío.
      - Las cuentas se guardan solo en este navegador (IndexedDB, tabla "cuentas" de js/bd.js).
      - La contraseña tampoco se guarda: se guarda un hash PBKDF2 con una "sal" aleatoria.

   Las pantallas (js/app.js y js/menu-usuario.js) usan App.cuentas igual en los dos modos.
   Las reglas de contraseña segura y el límite de intentos están en App.seguridad (abajo). */
window.App = window.App || {};

(function () {
  const CFG = App.config || {};
  const NUBE = !!(CFG.supabaseUrl && CFG.supabaseKey);
  const CLAVE_SESION = "utsc-portal-sesion";   // solo el correo, para saber si mostrar el login sin parpadeo

  const guardarLocal = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { } };
  const leerLocal = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");

  // =====================================================================
  // Seguridad: contraseña robusta, filtraciones conocidas y límite de intentos
  // =====================================================================
  const COMUNES = ["password", "contrasena", "contraseña", "qwerty", "asdfgh", "zxcvbn", "123456", "654321", "111111",
    "abc123", "admin", "welcome", "bienvenido", "iloveyou", "teamo", "tequiero", "futbol", "america", "tigres", "rayados",
    "monterrey", "mexico", "utsc", "santacatarina", "universidad", "alumno", "estudiante", "portal", "secreto", "clave"];
  const SECUENCIAS = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

  App.seguridad = {
    MIN: 10,
    MAX: 72,   // límite de bcrypt (Supabase): más de 72 caracteres se ignoran

    // Revisa una contraseña y regresa { ok, error, nivel (0 a 4), reglas: [{ok, txt}] }.
    // "datos" sirve para que la contraseña no contenga tu nombre, matrícula o correo.
    revisar(pass, datos) {
      pass = pass || "";
      const bajo = pass.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const personales = [];
      if (datos) {
        if (datos.matricula) personales.push(String(datos.matricula));
        if (datos.correo) personales.push(String(datos.correo).split("@")[0]);
        [datos.nombre, datos.apellidos].forEach(n => String(n || "").split(/\s+/).forEach(p => personales.push(p)));
      }
      const tienePersonal = personales.map(p => p.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""))
        .some(p => p.length >= 4 && bajo.includes(p));
      const tieneComun = COMUNES.some(c => bajo.includes(c));
      const tieneSecuencia = /(.)\1\1\1/.test(bajo) || SECUENCIAS.some(s => { for (let i = 0; i + 4 <= s.length; i++) if (bajo.includes(s.slice(i, i + 4))) return true; return false; });
      const reglas = [
        { ok: pass.length >= this.MIN, txt: `Al menos ${this.MIN} caracteres` },
        { ok: /[a-zñ]/i.test(pass) && /\d/.test(pass), txt: "Letras y números" },
        { ok: /[a-zñ]/.test(pass) && /[A-ZÑ]/.test(pass) || /[^A-Za-z0-9ñÑ]/.test(pass), txt: "Una mayúscula o un símbolo" },
        { ok: !tieneComun && !tieneSecuencia && !tienePersonal && pass.length > 0, txt: "Sin palabras comunes, secuencias ni tus datos" }
      ];
      let error = "";
      if (!pass) error = "Escribe una contraseña.";
      else if (pass.length > this.MAX) error = `Usa máximo ${this.MAX} caracteres.`;
      else if (!reglas[0].ok) error = `Usa al menos ${this.MIN} caracteres.`;
      else if (!reglas[1].ok) error = "Combina letras y números.";
      else if (!reglas[2].ok) error = "Agrega una mayúscula o un símbolo (por ejemplo ! # $ %).";
      else if (tienePersonal) error = "No uses tu nombre, matrícula o correo en la contraseña.";
      else if (tieneComun) error = "Tiene una palabra muy común (como «password» o «utsc»). Elige otra.";
      else if (tieneSecuencia) error = "Evita secuencias o repeticiones como «1234», «abcd» o «aaaa».";
      let nivel = reglas.filter(r => r.ok).length;
      if (nivel === 4 && pass.length >= 14) nivel = 4; else if (nivel === 4) nivel = 3;
      if (error) nivel = Math.min(nivel, 2);
      return { ok: !error, error, nivel, reglas };
    },

    // ¿Esta contraseña apareció en filtraciones de otros sitios? (Have I Been Pwned)
    // Solo se envían los primeros 5 caracteres del hash SHA-1, nunca la contraseña
    // (técnica "k-anonimato"). Si no hay internet o tarda, no bloquea el registro.
    async filtrada(pass) {
      try {
        const sha = hex(await crypto.subtle.digest("SHA-1", new TextEncoder().encode(pass))).toUpperCase();
        const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 4000);
        const r = await fetch("https://api.pwnedpasswords.com/range/" + sha.slice(0, 5), { headers: { "Add-Padding": "true" }, signal: ctrl.signal, credentials: "omit", referrerPolicy: "no-referrer" });
        clearTimeout(t);
        if (!r.ok) return false;
        const resto = sha.slice(5);
        return (await r.text()).split("\n").some(l => { const [suf, n] = l.trim().split(":"); return suf === resto && Number(n) > 0; });
      } catch (e) { return false; }
    },

    // Límite de intentos: después de 5 fallos seguidos hay que esperar (30 s, luego 1 min, 2 min… hasta 15 min).
    // Es una ayuda en pantalla; la protección real contra ataques la hace Supabase en su servidor.
    CLAVE: "utsc-intentos",
    _leer() { try { return JSON.parse(leerLocal(this.CLAVE)) || { n: 0, hasta: 0 }; } catch (e) { return { n: 0, hasta: 0 }; } },
    esperaRestante() { return Math.max(0, Math.ceil((this._leer().hasta - Date.now()) / 1000)); },
    fallo() {
      const s = this._leer(); s.n++;
      if (s.n >= 5) s.hasta = Date.now() + Math.min(15 * 60, 30 * 2 ** (s.n - 5)) * 1000;
      guardarLocal(this.CLAVE, JSON.stringify(s));
    },
    exito() { guardarLocal(this.CLAVE, null); }
  };

  // =====================================================================
  // MODO DEMOSTRACIÓN: cuentas en IndexedDB de este navegador
  // =====================================================================
  const local = (function () {
    const TABLA = "cuentas";
    let bd = null;
    const memoria = new Map(); // respaldo si el navegador no permite IndexedDB (modo incógnito estricto)

    async function operar(modo, fn) {
      bd = await App.bd.abrir();
      if (!bd) return fn(null);
      return App.bd.operar(TABLA, modo, fn);
    }
    async function hashear(password, salHex) {
      if (!window.crypto || !crypto.subtle) throw new Error("Abre el portal desde http://localhost o https para poder crear cuentas.");
      const sal = salHex ? Uint8Array.from(salHex.match(/../g).map(h => parseInt(h, 16))) : crypto.getRandomValues(new Uint8Array(16));
      const llave = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
      const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: sal, iterations: 310000, hash: "SHA-256" }, llave, 256);
      return { sal: hex(sal), hash: hex(bits), iter: 310000 };
    }
    // Las cuentas creadas antes usaban 120 000 vueltas; se respetan y se actualizan al entrar.
    async function hashDe(password, c) {
      const iter = c.iter || 120000;
      const sal = Uint8Array.from(c.sal.match(/../g).map(h => parseInt(h, 16)));
      const llave = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
      return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: sal, iterations: iter, hash: "SHA-256" }, llave, 256));
    }
    // Compara sin salirse antes (así no se puede adivinar por cuánto tarda).
    const iguales = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
    const sinSecretos = c => { if (!c) return null; const { hash, sal, iter, ...perfil } = c; return perfil; };

    async function obtenerCompleta(correo) {
      correo = correo.trim().toLowerCase();
      return (await operar("readonly", t => t ? t.get(correo) : null)) || memoria.get(correo) || null;
    }

    return {
      modo: "local",
      async sesion() {
        const correo = leerLocal(CLAVE_SESION);
        return { perfil: correo ? await this.obtener(correo) : null, accion: null, error: null };
      },
      async obtener(correo) { return sinSecretos(await obtenerCompleta(correo)); },

      async existeMatricula(matricula) {
        const r = await operar("readonly", t => t ? t.index("matricula").get(matricula) : null);
        return !!r || [...memoria.values()].some(c => c.matricula === matricula);
      },

      async crear(perfil, password) {
        const correo = perfil.correo.trim().toLowerCase();
        if (await obtenerCompleta(correo)) throw new Error("Ya existe una cuenta con ese correo. Inicia sesión.");
        if (await this.existeMatricula(perfil.matricula)) throw new Error("Esa matrícula ya tiene una cuenta registrada.");
        const cuenta = Object.assign({}, perfil, { correo, creada: Date.now() }, await hashear(password));
        const ok = await operar("readwrite", t => t ? t.add(cuenta) : null);
        if (ok === null && !bd) memoria.set(correo, cuenta);
        return sinSecretos(cuenta);
      },

      // Devuelve el perfil si el correo y la contraseña coinciden; si no, null.
      async verificar(correo, password) {
        const c = await obtenerCompleta(correo);
        if (!c) { await hashear(password); return null; }   // misma espera aunque no exista la cuenta
        if (!iguales(await hashDe(password, c), c.hash)) return null;
        if ((c.iter || 120000) < 310000) await this.actualizar(c.correo, await hashear(password));
        return sinSecretos(c);
      },

      async actualizar(correo, cambios) {
        const c = await obtenerCompleta(correo);
        if (!c) return;
        const nueva = Object.assign(c, cambios);
        if (bd) await operar("readwrite", t => t.put(nueva)); else memoria.set(c.correo, nueva);
      },

      async cambiarPassword(correo, actual, nueva) {
        if (!(await this.verificar(correo, actual))) return false;
        await this.actualizar(correo, await hashear(nueva));
        return true;
      },

      async eliminar(correo) {
        correo = correo.trim().toLowerCase();
        if (bd) await operar("readwrite", t => t.delete(correo));
        memoria.delete(correo);
      },

      async salir() { }
    };
  })();

  // =====================================================================
  // MODO NUBE: Supabase Auth
  // =====================================================================
  const nube = (function () {
    let cliente = null, listo = null;
    const oyentes = [];
    // A dónde regresa el usuario al abrir el enlace del correo (la misma página, sin #ruta).
    const regreso = accion => location.origin + location.pathname + "?accion=" + accion;

    function cargarLibreria() {
      if (window.supabase) return Promise.resolve();
      return new Promise((ok, mal) => {
        const s = document.createElement("script");
        s.src = "js/vendor/supabase.js";
        s.onload = ok; s.onerror = () => mal(new Error("No se pudo cargar el inicio de sesión. Revisa tu conexión."));
        document.head.appendChild(s);
      });
    }

    function iniciar() {
      if (listo) return listo;
      listo = (async () => {
        await cargarLibreria();
        cliente = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
          auth: {
            flowType: "pkce",          // el enlace del correo solo sirve en el navegador donde se pidió
            persistSession: true,
            autoRefreshToken: true,    // la sesión dura poco y se renueva sola mientras usas el portal
            detectSessionInUrl: true,
            storageKey: "utsc-portal-auth"
          }
        });
        cliente.auth.onAuthStateChange((evento, sesion) => oyentes.forEach(fn => { try { fn(evento, sesion); } catch (e) { console.warn(e); } }));
        return cliente;
      })();
      return listo;
    }

    // Convierte el usuario de Supabase al perfil que usa el portal.
    // El ROL sale de app_metadata, que solo se puede cambiar desde el panel de Supabase
    // (user_metadata lo puede editar el propio usuario, por eso ahí nunca se lee el rol).
    function perfilDe(user) {
      if (!user) return null;
      const m = Object.assign({}, user.user_metadata || {});
      delete m.rol; delete m.email_verified; delete m.sub; delete m.email; delete m.phone_verified;
      return Object.assign({ nombre: "", apellidos: "", matricula: "", carrera: "DSM", semestre: 1, grupo: "" }, m,
        { correo: (user.email || "").toLowerCase(), rol: (user.app_metadata && user.app_metadata.rol) || "Alumno", id: user.id });
    }

    // Mensajes claros y que no revelan si un correo está registrado o no.
    function traducir(error) {
      const msg = String((error && error.message) || error || "");
      const cod = (error && error.code) || "";
      if (/fetch|network|Failed to/i.test(msg)) return "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.";
      if (cod === "email_not_confirmed" || /not confirmed/i.test(msg)) return "CONFIRMAR";
      if (cod === "over_email_send_rate_limit" || /rate limit|too many|security purposes/i.test(msg)) return "Hiciste demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
      if (cod === "weak_password" || /weak|pwned|leaked/i.test(msg)) return "Esa contraseña no es segura o apareció en filtraciones. Elige otra.";
      if (cod === "same_password") return "La nueva contraseña debe ser distinta a la actual.";
      if (cod === "reauthentication_needed" || /reauthenticat/i.test(msg)) return "Por seguridad, cierra sesión y vuelve a entrar antes de cambiar tu contraseña.";
      if (/Database error saving new user/i.test(msg)) return "No se pudo crear la cuenta. Revisa tus datos: esa matrícula podría estar ya registrada.";
      if (/expired|otp_expired|email link|invalid.*(token|code|flow)|code verifier/i.test(msg)) return "El enlace ya caducó o se abrió en otro navegador. Pide uno nuevo.";
      if (/invalid.*email|email.*invalid/i.test(msg)) return "Ese correo no es válido.";
      return "No se pudo completar. Inténtalo de nuevo en un momento.";
    }
    const falla = error => { const e = new Error(traducir(error)); e.original = error; return e; };

    return {
      modo: "nube",
      alCambiar(fn) { oyentes.push(fn); },

      // Al abrir el portal: procesa el enlace del correo (si vienes de uno) y regresa la sesión guardada.
      // Regresa { perfil, accion, error }: accion = "confirmado" | "recuperar" | null.
      async sesion() {
        const q = new URLSearchParams(location.search);
        const h = new URLSearchParams(location.hash.replace(/^#/, ""));
        const accion = q.get("accion");
        const errorUrl = q.get("error_description") || h.get("error_description");
        await iniciar();
        const { data, error } = await cliente.auth.getSession();
        // Limpia la dirección para que el código del enlace no quede en el historial.
        if (accion || q.has("code") || errorUrl) history.replaceState(null, "", location.pathname + (h.has("error_description") ? "" : location.hash));
        const perfil = data && data.session ? perfilDe(data.session.user) : null;
        let aviso = null;
        if (errorUrl) aviso = traducir({ message: errorUrl });
        else if (accion && !perfil) aviso = "El enlace ya caducó o se abrió en otro navegador. Si ya confirmaste tu correo, inicia sesión; si no, pide otro enlace.";
        else if (error && q.has("code")) aviso = traducir(error);
        return { perfil, accion: perfil ? accion : null, error: aviso };
      },

      async verificar(correo, password) {
        await iniciar();
        const { data, error } = await cliente.auth.signInWithPassword({ email: correo.trim().toLowerCase(), password });
        if (error) {
          if (error.code === "invalid_credentials" || /invalid login/i.test(error.message)) return null;
          throw falla(error);
        }
        return perfilDe(data.user);
      },

      // Regresa el perfil si ya quedó la sesión abierta, o null si falta confirmar el correo.
      async crear(perfil, password) {
        await iniciar();
        const { rol, correo, ...datos } = perfil;
        const { data, error } = await cliente.auth.signUp({
          email: correo.trim().toLowerCase(), password,
          options: { data: datos, emailRedirectTo: regreso("confirmado") }
        });
        if (error) throw falla(error);
        return data.session ? perfilDe(data.user) : null;
      },

      async reenviarConfirmacion(correo) {
        await iniciar();
        const { error } = await cliente.auth.resend({ type: "signup", email: correo.trim().toLowerCase(), options: { emailRedirectTo: regreso("confirmado") } });
        if (error) throw falla(error);
      },

      // Siempre "funciona" aunque el correo no exista, para no revelar quién tiene cuenta.
      async recuperar(correo) {
        await iniciar();
        const { error } = await cliente.auth.resetPasswordForEmail(correo.trim().toLowerCase(), { redirectTo: regreso("recuperar") });
        if (error && /rate limit|security purposes/i.test(error.message)) throw falla(error);
      },

      async nuevaPassword(password) {
        await iniciar();
        const { error } = await cliente.auth.updateUser({ password });
        if (error) throw falla(error);
      },

      async obtener() {
        await iniciar();
        const { data } = await cliente.auth.getSession();
        return data && data.session ? perfilDe(data.session.user) : null;
      },

      async actualizar(correo, cambios) {
        await iniciar();
        const { rol, correo: c, id, ...datos } = cambios;
        const { error } = await cliente.auth.updateUser({ data: datos });
        if (error) console.warn("No se pudo guardar el perfil en Supabase:", error.message);
      },

      // Confirma la contraseña actual volviendo a entrar, y luego la cambia.
      async cambiarPassword(correo, actual, nueva) {
        const ok = await this.verificar(correo, actual);
        if (!ok) return false;
        await this.nuevaPassword(nueva);
        // Cierra la sesión en los demás dispositivos (por si alguien más la tenía abierta).
        try { await cliente.auth.signOut({ scope: "others" }); } catch (e) { }
        return true;
      },

      // Borra la cuenta en Supabase con la función segura eliminar_mi_cuenta (ver supabase/autenticacion.sql).
      async eliminar() {
        await iniciar();
        const r = await cliente.rpc("eliminar_mi_cuenta");
        if (r.error) throw falla(r.error);
        await this.salir();
      },

      async salir(todos) {
        await iniciar();
        let error = null;
        try { ({ error } = await cliente.auth.signOut({ scope: todos ? "global" : "local" })); } catch (e) { error = e; }
        // Sin internet: igual se borra la sesión guardada en este navegador.
        if (error) guardarLocal("utsc-portal-auth", null);
      }
    };
  })();

  App.cuentas = NUBE ? nube : local;
  App.cuentas.CLAVE_SESION = CLAVE_SESION;
})();
