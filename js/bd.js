/* Base de datos local del portal (IndexedDB) — semana 4: datos offline.
   Una sola base "utsc-portal" con tres tablas (object stores):
   - cuentas : perfiles de usuario y hash de contraseña (llave: correo)
   - estado  : datos de cada alumno: publicaciones, pagos, trámites, viajes… (llave: correo)
   - cola    : acciones hechas sin conexión que faltan por enviar (llave: id)
   - comunidad : blog compartido, avisos entre usuarios y bitácora de moderación (llave: id)
   IndexedDB guarda mucho más que localStorage, acepta imágenes y no bloquea la página. */
window.App = window.App || {};

(function () {
  const NOMBRE = "utsc-portal", VERSION = 3;
  let conexion = null, abriendo = null;

  App.bd = {
    abrir() {
      if (conexion) return Promise.resolve(conexion);
      if (abriendo) return abriendo;
      abriendo = new Promise(resolve => {
        let req;
        try { req = indexedDB.open(NOMBRE, VERSION); } catch (e) { return resolve(null); }
        // Se ejecuta la primera vez y cada vez que sube VERSION: crea las tablas que falten.
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("cuentas")) {
            db.createObjectStore("cuentas", { keyPath: "correo" }).createIndex("matricula", "matricula", { unique: true });
          }
          if (!db.objectStoreNames.contains("estado")) db.createObjectStore("estado", { keyPath: "correo" });
          if (!db.objectStoreNames.contains("cola")) db.createObjectStore("cola", { keyPath: "id" }).createIndex("correo", "correo");
          // v3: blog compartido entre cuentas, avisos entre usuarios y bitácora de moderación.
          if (!db.objectStoreNames.contains("comunidad")) db.createObjectStore("comunidad", { keyPath: "id" });
        };
        req.onsuccess = () => {
          conexion = req.result;
          conexion.onversionchange = () => { conexion.close(); conexion = null; }; // otra pestaña actualizó la base
          resolve(conexion);
        };
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      });
      return abriendo;
    },

    // Corre fn(tabla) dentro de una transacción y devuelve el resultado de la petición.
    async operar(tabla, modo, fn) {
      const db = await this.abrir();
      if (!db) return null;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(tabla, modo);
        const req = fn(tx.objectStore(tabla));
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    },
    leer(tabla, llave) { return this.operar(tabla, "readonly", t => t.get(llave)); },
    guardar(tabla, valor) { return this.operar(tabla, "readwrite", t => t.put(valor)); },
    borrar(tabla, llave) { return this.operar(tabla, "readwrite", t => t.delete(llave)); },
    todos(tabla, indice, valor) {
      return this.operar(tabla, "readonly", t => indice ? t.index(indice).getAll(valor) : t.getAll());
    },
    disponible() { return this.abrir().then(db => !!db); }
  };
})();
