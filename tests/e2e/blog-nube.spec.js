// Blog compartido en modo real (Supabase) con un Supabase de mentira en memoria:
// dos personas en navegadores distintos (alumna y moderadora) ven el mismo blog.
// La seguridad de la base (RLS) se prueba aparte con PostgreSQL: supabase/pruebas/.
const { test, expect } = require("@playwright/test");

test.use({ serviceWorkers: "block" });   // así page.route ve todas las peticiones

const URL_SB = "https://prueba.supabase.co";
const PASS = "Nopal-Verde-82";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const USUARIOS = {
  "ana@gmail.com": { id: "11111111-1111-4111-8111-111111111111", rol: null,
    meta: { nombre: "Ana Sofía", apellidos: "López Hernández", matricula: "27102", carrera: "DSM", semestre: 4, grupo: "DSM04AV" } },
  "laura@gmail.com": { id: "99999999-9999-4999-8999-999999999999", rol: "Moderador",
    meta: { nombre: "Laura", apellidos: "Garza Ruiz", matricula: "90001", carrera: "DSM", semestre: 10, grupo: "DSM10AV" } }
};
function usuario(correo) {
  const u = USUARIOS[correo];
  return { id: u.id, aud: "authenticated", role: "authenticated", email: correo, email_confirmed_at: new Date().toISOString(),
    user_metadata: u.meta, app_metadata: Object.assign({ provider: "email" }, u.rol ? { rol: u.rol } : {}), created_at: new Date().toISOString() };
}
function sesion(user) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return { access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, exp, email: user.email, role: "authenticated", app_metadata: user.app_metadata })}.firma`,
    token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "r-" + user.id, user };
}

// ---------- Base de datos falsa (imita PostgREST y, en lo básico, las reglas RLS de supabase/blog.sql) ----------
function crearBase() {
  const t = { blog_publicaciones: [], blog_comentarios: [], blog_reacciones: [], blog_reportes: [], blog_avisos: [], blog_bitacora: [] };
  const DUENO = { blog_publicaciones: "autor_id", blog_comentarios: "autor_id", blog_reacciones: "usuario_id", blog_reportes: "usuario_id", blog_avisos: "de_id", blog_bitacora: "moderador_id" };
  const LLAVES = { blog_reacciones: ["publicacion_id", "usuario_id"], blog_reportes: ["publicacion_id", "usuario_id"] };
  const puedeVer = (tabla, fila, u) => {
    const mod = u.rol === "Moderador";
    if (tabla === "blog_publicaciones" || tabla === "blog_comentarios") return fila.mod_estado === "aprobado" || fila.autor_id === u.id || mod;
    if (tabla === "blog_reportes") return fila.usuario_id === u.id || mod;
    if (tabla === "blog_avisos") return fila.para === u.id || (fila.para === "rol:Moderador" && mod);
    if (tabla === "blog_bitacora") return mod;
    return true;
  };
  const filtros = url => [...url.searchParams].filter(([k]) => !["select", "order", "limit", "on_conflict", "columns"].includes(k))
    .map(([k, v]) => { const [op, ...resto] = v.split("."); return [k, op, resto.join(".")]; });
  const cumple = (fila, fs) => fs.every(([k, op, v]) => op === "eq" ? String(fila[k]) === v : op === "gte" ? fila[k] >= v : true);
  return {
    t,
    manejar(metodo, url, cuerpo, u) {
      const tabla = url.pathname.split("/").pop(), fs = filtros(url);
      if (!t[tabla]) return { status: 404, body: {} };
      if (metodo === "GET") {
        let filas = t[tabla].filter(f => puedeVer(tabla, f, u) && cumple(f, fs));
        const orden = url.searchParams.get("order");
        if (orden) { const [c, dir] = orden.split("."); filas = filas.slice().sort((a, b) => (a[c] < b[c] ? -1 : 1) * (dir === "desc" ? -1 : 1)); }
        return { status: 200, body: filas.slice(0, Number(url.searchParams.get("limit")) || undefined) };
      }
      if (metodo === "POST") {
        for (const fila of [].concat(cuerpo)) {
          const nueva = Object.assign({ creado: new Date().toISOString(), mod_estado: "aprobado", mod_motivos: [], reportes_revisados: false }, fila);
          nueva[DUENO[tabla]] = nueva[DUENO[tabla]] || u.id;
          if (nueva[DUENO[tabla]] !== u.id) return { status: 403, body: { code: "42501", message: "new row violates row-level security policy" } };
          const llave = LLAVES[tabla] || ["id"];
          if (t[tabla].some(f => llave.every(k => f[k] === nueva[k]))) continue;   // on conflict do nothing
          t[tabla].push(nueva);
          if (tabla === "blog_reportes") {
            const p = t.blog_publicaciones.find(x => x.id === nueva.publicacion_id);
            const n = t.blog_reportes.filter(x => x.publicacion_id === nueva.publicacion_id).length;
            if (p && n >= 3 && p.mod_estado === "aprobado") Object.assign(p, { mod_estado: "revision", mod_motivos: ["Recibió " + n + " reportes"] });
          }
        }
        return { status: 201, body: null };
      }
      if (metodo === "PATCH") {
        if (u.rol !== "Moderador") return { status: 204, body: null };   // RLS: 0 filas
        t[tabla].filter(f => cumple(f, fs)).forEach(f => Object.assign(f, cuerpo));
        return { status: 204, body: null };
      }
      if (metodo === "DELETE") {
        const borrar = t[tabla].filter(f => cumple(f, fs) && (f[DUENO[tabla]] === u.id || u.rol === "Moderador"));
        t[tabla] = t[tabla].filter(f => !borrar.includes(f));
        if (tabla === "blog_publicaciones") for (const h of ["blog_comentarios", "blog_reacciones", "blog_reportes"])
          t[h] = t[h].filter(f => !borrar.some(p => p.id === f.publicacion_id));
        return { status: 204, body: null };
      }
      return { status: 405, body: {} };
    }
  };
}

async function prepararNube(page, base, { ia = null } = {}) {
  await page.route("**/js/config.js", r => r.fulfill({ contentType: "application/javascript",
    body: `window.App = window.App || {}; App.config = { supabaseUrl: "${URL_SB}", supabaseKey: "sb_publishable_prueba", soloCorreoInstitucional: false, moderacionIA: ${!!ia} };` }));
  await page.route(URL_SB + "/**", async r => {
    const req = r.request(), url = new URL(req.url());
    const json = (status, body) => r.fulfill({ status, contentType: "application/json", body: body === null ? "" : JSON.stringify(body) });
    if (url.pathname === "/auth/v1/token") {
      const c = req.postDataJSON() || {};
      if (url.searchParams.get("grant_type") === "password")
        return USUARIOS[c.email] && c.password === PASS ? json(200, sesion(usuario(c.email))) : json(400, { error_code: "invalid_credentials", msg: "Invalid login credentials" });
      return json(400, {});
    }
    if (url.pathname === "/auth/v1/logout") return r.fulfill({ status: 204 });
    if (url.pathname === "/functions/v1/moderar") return ia ? ia(r, req.postDataJSON()) : json(404, {});
    const token = (req.headers()["authorization"] || "").split(" ")[1] || "";
    let quien = null;
    try { quien = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()); } catch (e) { }
    const u = quien && Object.entries(USUARIOS).map(([, x]) => x).find(x => x.id === quien.sub);
    if (url.pathname === "/auth/v1/user") return u ? json(200, usuario(Object.keys(USUARIOS).find(k => USUARIOS[k] === u))) : json(401, {});
    if (url.pathname.startsWith("/rest/v1/")) {
      if (!u) return json(401, { code: "42501", message: "permission denied" });
      const res = base.manejar(req.method(), url, req.postDataJSON(), u);
      return json(res.status, res.body);
    }
    return json(404, {});
  });
}

async function entrarNube(page, correo) {
  await page.goto("/");
  await page.fill("#l-correo", correo);
  await page.fill("#l-pass", PASS);
  await page.click('#form-login button[type="submit"]');
  await expect(page.locator("#shell")).toBeVisible();
  await page.waitForFunction(() => App.sesion && App.comunidad.listo);
}
const ir = (page, ruta) => page.evaluate(r => { location.hash = r; }, ruta);
async function sinPendientes(page) {
  await page.waitForFunction(async () => (await App.cola.contar()) === 0);
}

test("dos alumnos en dispositivos distintos ven el mismo blog y la moderación funciona", async ({ browser }) => {
  const base = crearBase();
  const ctxAna = await browser.newContext(), ctxLaura = await browser.newContext();
  const ana = await ctxAna.newPage(), laura = await ctxLaura.newPage();
  await prepararNube(ana, base); await prepararNube(laura, base);

  // Ana publica algo normal y algo dudoso.
  await entrarNube(ana, "ana@gmail.com");
  await ir(ana, "blog");
  await ana.fill("#bp-t", "Hola desde mi celular");
  await ana.fill("#bp-x", "Primera publicación guardada en Supabase #UTSC");
  await ana.click('[data-f="publicar"] .btn-primary');
  await ana.fill("#bp-t", "Opinión del examen");
  await ana.fill("#bp-x", "Pinche examen de cálculo, muy difícil");
  await ana.click('[data-f="publicar"] .btn-primary');
  await expect.poll(() => base.t.blog_publicaciones.length).toBe(2);
  await expect.poll(() => base.t.blog_avisos.length).toBe(1);
  await sinPendientes(ana);
  expect(base.t.blog_publicaciones.map(p => p.mod_estado).sort()).toEqual(["aprobado", "revision"]);
  expect(base.t.blog_publicaciones[0].autor_id).toBe(USUARIOS["ana@gmail.com"].id);
  expect(JSON.stringify(base.t.blog_publicaciones)).not.toContain("ana@gmail.com");   // no se guarda su correo

  // Laura (moderadora) entra en otro navegador: ve lo aprobado en el blog y lo dudoso en su panel.
  await entrarNube(laura, "laura@gmail.com");
  await ir(laura, "blog");
  await expect(laura.locator(".post", { hasText: "Hola desde mi celular" })).toBeVisible();
  await expect(laura.locator(".post", { hasText: "Opinión del examen" })).toHaveCount(0);
  expect(await laura.evaluate(() => App.state.notificaciones.some(n => n.txt.includes("Nueva publicación en revisión")))).toBe(true);
  await laura.click('[data-a="like"]');
  await ir(laura, "moderacion");
  const tarjeta = laura.locator(".mod-item", { hasText: "Pinche examen de cálculo" });
  await expect(tarjeta).toBeVisible();
  await tarjeta.locator('[data-a="aprobar"]').click();
  await expect(tarjeta).toHaveCount(0);
  await expect.poll(() => base.t.blog_bitacora.length).toBe(1);
  await sinPendientes(laura);
  expect(base.t.blog_publicaciones.every(p => p.mod_estado === "aprobado")).toBe(true);
  expect(base.t.blog_bitacora).toHaveLength(1);
  expect(base.t.blog_reacciones).toHaveLength(1);

  // Ana recibe el aviso y ve el me gusta al actualizar.
  await ana.evaluate(() => App.comunidad.refrescar());
  await expect.poll(() => ana.evaluate(() => App.state.notificaciones.some(n => n.txt.includes("fue aprobada")))).toBe(true);
  await ir(ana, "blog");
  await expect(ana.locator(".post", { hasText: "Hola desde mi celular" }).locator('[data-a="like"]')).toContainText("1");

  // Ana borra su publicación: desaparece para Laura también.
  await ana.locator(".post", { hasText: "Hola desde mi celular" }).locator('[data-a="eliminar"]').click();
  await ana.click(".overlay .btn-danger");
  await expect.poll(() => base.t.blog_publicaciones.length).toBe(1);
  await laura.evaluate(() => App.comunidad.refrescar());
  await ir(laura, "blog");
  await expect(laura.locator(".post", { hasText: "Hola desde mi celular" })).toHaveCount(0);
  await ctxAna.close(); await ctxLaura.close();
});

test("lo publicado sin conexión llega a Supabase al volver el internet", async ({ page, context }) => {
  const base = crearBase();
  await prepararNube(page, base);
  await entrarNube(page, "ana@gmail.com");
  await ir(page, "blog");
  await context.setOffline(true);
  await page.fill("#bp-t", "Escrito sin internet");
  await page.fill("#bp-x", "Lo escribí en el camión sin datos");
  await page.click('[data-f="publicar"] .btn-primary');
  await expect(page.locator(".post", { hasText: "Escrito sin internet" })).toBeVisible();
  expect(base.t.blog_publicaciones).toHaveLength(0);
  await context.setOffline(false);
  await expect.poll(() => base.t.blog_publicaciones.length).toBe(1);
});

test("con Supabase configurado, la cuenta de prueba entra sin registrarse", async ({ page }) => {
  const base = crearBase();
  await prepararNube(page, base);
  await page.goto("/");
  await page.click("#demo");
  await expect(page.locator("#shell")).toBeVisible();
  expect(await page.evaluate(() => App.cuentas.modo)).toBe("local");
  await page.reload();
  await expect(page.locator("#shell")).toBeVisible();   // la sesión de prueba sigue al recargar
  await page.evaluate(() => { App.cerrarSesion(); location.hash = ""; App.render(true); });
  expect(await page.evaluate(() => App.cuentas.modo)).toBe("nube");   // al salir, regresa al modo real
});

test("con moderación por IA: la IA decide y, si falla, decide el filtro local", async ({ page }) => {
  const base = crearBase();
  const recibido = [];
  let iaFalla = false;
  await prepararNube(page, base, { ia: (r, cuerpo) => {
    recibido.push(cuerpo);
    if (iaFalla) return r.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "caída" }) });
    return r.fulfill({ contentType: "application/json", body: JSON.stringify({ decision: "revisar", motivos: ["La IA vio datos personales"], prioridad: "normal", fuente: "IA" }) });
  } });
  await entrarNube(page, "ana@gmail.com");
  await ir(page, "blog");
  await page.fill("#bp-t", "Vendo mi calculadora");
  await page.fill("#bp-x", "Está como nueva, pregunten en el salón");
  await page.click('[data-f="publicar"] .btn-primary');
  await expect.poll(() => base.t.blog_publicaciones.length).toBe(1);
  expect(base.t.blog_publicaciones[0].mod_estado).toBe("revision");
  expect(base.t.blog_publicaciones[0].mod_por).toBe("IA");
  expect(base.t.blog_publicaciones[0].mod_motivos).toEqual(["La IA vio datos personales"]);
  expect(recibido[0].titulo).toBe("Vendo mi calculadora");

  iaFalla = true;
  await page.fill("#bp-t", "Torneo de futbol");
  await page.fill("#bp-x", "El viernes a las 5 en la cancha principal");
  await page.click('[data-f="publicar"] .btn-primary');
  await expect.poll(() => base.t.blog_publicaciones.length).toBe(2);
  const segundo = base.t.blog_publicaciones.find(p => p.titulo === "Torneo de futbol");
  expect(segundo.mod_estado).toBe("aprobado");
  expect(segundo.mod_por).toBe("Filtro automático");
});
