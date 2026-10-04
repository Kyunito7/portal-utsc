/* Cuentas de usuario guardadas en el navegador (IndexedDB, tabla "cuentas" de js/bd.js).
   - Cada cuenta se guarda con su correo como llave.
   - La contraseña NUNCA se guarda: se guarda un hash PBKDF2 con una "sal" aleatoria.
   - Más adelante esto se puede cambiar por Supabase sin tocar las pantallas:
     solo hay que reescribir las funciones de App.cuentas con la misma forma. */
window.App = window.App || {};

(function () {
  const TABLA = "cuentas";
  let bd = null;
  const memoria = new Map(); // respaldo si el navegador no permite IndexedDB (modo incógnito estricto)

  // La base se abre en js/bd.js (ahí se crean todas las tablas).
  async function operar(modo, fn) {
    bd = await App.bd.abrir();
    if (!bd) return fn(null);
    return App.bd.operar(TABLA, modo, fn);
  }

  // ---------- Contraseñas ----------
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  async function hashear(password, salHex) {
    if (!window.crypto || !crypto.subtle) throw new Error("Abre el portal desde http://localhost o https para poder crear cuentas.");
    const sal = salHex ? Uint8Array.from(salHex.match(/../g).map(h => parseInt(h, 16))) : crypto.getRandomValues(new Uint8Array(16));
    const llave = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: sal, iterations: 120000, hash: "SHA-256" }, llave, 256);
    return { sal: hex(sal), hash: hex(bits) };
  }

  const sinSecretos = c => { if (!c) return null; const { hash, sal, ...perfil } = c; return perfil; };

  async function obtenerCompleta(correo) {
    correo = correo.trim().toLowerCase();
    return (await operar("readonly", t => t ? t.get(correo) : null)) || memoria.get(correo) || null;
  }

  App.cuentas = {
    async obtener(correo) { return sinSecretos(await obtenerCompleta(correo)); },

    async existeMatricula(matricula) {
      const r = await operar("readonly", t => t ? t.index("matricula").get(matricula) : null);
      return !!r || [...memoria.values()].some(c => c.matricula === matricula);
    },

    async crear(perfil, password) {
      const correo = perfil.correo.trim().toLowerCase();
      if (await obtenerCompleta(correo)) throw new Error("Ya existe una cuenta con ese correo. Inicia sesión.");
      if (await this.existeMatricula(perfil.matricula)) throw new Error("Esa matrícula ya tiene una cuenta registrada.");
      const { sal, hash } = await hashear(password);
      const cuenta = Object.assign({}, perfil, { correo, sal, hash, creada: Date.now() });
      const ok = await operar("readwrite", t => t ? t.add(cuenta) : null);
      if (ok === null && !bd) memoria.set(correo, cuenta);
      return sinSecretos(cuenta);
    },

    // Devuelve el perfil si el correo y la contraseña coinciden; si no, null.
    async verificar(correo, password) {
      const c = await obtenerCompleta(correo);
      if (!c) return null;
      const { hash } = await hashear(password, c.sal);
      return hash === c.hash ? sinSecretos(c) : null;
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
    }
  };
})();
