// Modo nube (Supabase Auth) con un Supabase de mentira: se interceptan las peticiones
// para probar registro, confirmación de correo, inicio de sesión y recuperación sin internet.
const { test, expect } = require("@playwright/test");

test.use({ serviceWorkers: "block" });   // así page.route ve todas las peticiones

const URL_SB = "https://prueba.supabase.co";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");

function usuario(correo, extra = {}) {
  return Object.assign({
    id: "11111111-2222-3333-4444-555555555555", aud: "authenticated", role: "authenticated", email: correo,
    email_confirmed_at: new Date().toISOString(),
    user_metadata: { nombre: "Ana Sofía", apellidos: "López Hernández", matricula: "27102", carrera: "DSM", semestre: 4, grupo: "DSM04AV", rol: "Moderador" },
    app_metadata: { provider: "email" }, created_at: new Date().toISOString()
  }, extra);
}
function sesion(user) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return { access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, exp, email: user.email, role: "authenticated" })}.firma`,
    token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "r1", user };
}

async function prepararNube(page, { confirmado = true } = {}) {
  const llamadas = [];
  await page.route("**/js/config.js", r => r.fulfill({ contentType: "application/javascript",
    body: `window.App = window.App || {}; App.config = { supabaseUrl: "${URL_SB}", supabaseKey: "sb_publishable_prueba", soloCorreoInstitucional: false };` }));
  await page.route("https://api.pwnedpasswords.com/**", r => r.fulfill({ body: "0000000000000000000000000000000000A:1" }));
  await page.route(URL_SB + "/**", async r => {
    const url = new URL(r.request().url()), cuerpo = r.request().postDataJSON() || {};
    llamadas.push({ ruta: url.pathname + url.search, cuerpo });
    const json = (status, body) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/auth/v1/signup") return json(200, usuario(cuerpo.email, { email_confirmed_at: null, user_metadata: cuerpo.data }));
    if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "pkce")
      return cuerpo.code_verifier ? json(200, sesion(usuario("ana@gmail.com"))) : json(400, { error_code: "bad_code_verifier", msg: "invalid flow state" });
    if (url.pathname === "/auth/v1/user" && r.request().method() === "PUT") {
      llamadas.push({ ruta: "cambio-password", cuerpo });
      return json(200, usuario("ana@gmail.com"));
    }
    if (url.pathname === "/auth/v1/token") {
      if (cuerpo.password !== "Nopal-Verde-82") return json(400, { error_code: "invalid_credentials", msg: "Invalid login credentials" });
      if (!confirmado) return json(400, { error_code: "email_not_confirmed", msg: "Email not confirmed" });
      return json(200, sesion(usuario(cuerpo.email)));
    }
    if (url.pathname === "/auth/v1/recover") return json(200, {});
    if (url.pathname === "/auth/v1/logout") return r.fulfill({ status: 204 });
    if (url.pathname === "/auth/v1/user") return json(200, usuario("ana@gmail.com"));
    return json(404, {});
  });
  return llamadas;
}

test("registro con correo real: pide confirmar el correo", async ({ page }) => {
  const llamadas = await prepararNube(page);
  await page.goto("/");
  await expect(page.locator("#demo")).toHaveCount(0);   // sin cuentas de prueba en modo nube
  await page.click('[data-modo="crear"]');
  await page.fill("#r-nombre", "Ana Sofía");
  await page.fill("#r-apellidos", "López Hernández");
  await page.fill("#r-mat", "27102");
  await page.fill("#r-correo", "ana@gmail.com");
  await page.fill("#r-pass", "Nopal-Verde-82");
  await page.fill("#r-pass2", "Nopal-Verde-82");
  await page.click('#form-crear button[type="submit"]');
  await expect(page.locator(".login-revisa")).toContainText("ana@gmail.com");
  const registro = llamadas.find(l => l.ruta.startsWith("/auth/v1/signup"));
  expect(registro.cuerpo.data.matricula).toBe("27102");
  expect(registro.cuerpo.data.rol).toBeUndefined();
});

test("contraseña filtrada se rechaza", async ({ page }) => {
  await prepararNube(page);
  await page.route("https://api.pwnedpasswords.com/**", async r => {
    // Responde con el sufijo exacto del SHA-1 de la contraseña para simular que está filtrada.
    const crypto = require("node:crypto");
    const sha = crypto.createHash("sha1").update("Nopal-Verde-82").digest("hex").toUpperCase();
    r.fulfill({ body: sha.slice(5) + ":42\r\n" });
  });
  await page.goto("/");
  await page.click('[data-modo="crear"]');
  await page.fill("#r-nombre", "Ana Sofía");
  await page.fill("#r-apellidos", "López Hernández");
  await page.fill("#r-mat", "27102");
  await page.fill("#r-correo", "ana@gmail.com");
  await page.fill("#r-pass", "Nopal-Verde-82");
  await page.fill("#r-pass2", "Nopal-Verde-82");
  await page.click('#form-crear button[type="submit"]');
  await expect(page.locator(".field-error")).toContainText("filtraciones");
});

test("sin confirmar el correo no deja entrar", async ({ page }) => {
  await prepararNube(page, { confirmado: false });
  await page.goto("/");
  await page.fill("#l-correo", "ana@gmail.com");
  await page.fill("#l-pass", "Nopal-Verde-82");
  await page.click('#form-login button[type="submit"]');
  await expect(page.locator(".login-revisa")).toBeVisible();
  await expect(page.locator("#login-alert")).toContainText("confirma tu correo");
});

test("inicio de sesión real: el rol sale de app_metadata, no de lo que escribe el usuario", async ({ page }) => {
  await prepararNube(page);
  await page.goto("/");
  await page.fill("#l-correo", "ana@gmail.com");
  await page.fill("#l-pass", "mala-contraseña");
  await page.click('#form-login button[type="submit"]');
  await expect(page.locator("#login-alert")).toHaveText("Correo o contraseña incorrectos.");
  await page.fill("#l-pass", "Nopal-Verde-82");
  await page.click('#form-login button[type="submit"]');
  await expect(page.locator('[data-shell="nombre"]')).toHaveText("Ana Sofía López Hernández");
  expect(await page.evaluate(() => App.state.usuario.rol)).toBe("Alumno");
  // La contraseña no se guarda en ningún lado del navegador.
  const guardado = await page.evaluate(() => JSON.stringify(localStorage));
  expect(guardado).not.toContain("Nopal-Verde-82");
  // Al recargar, la sesión sigue abierta.
  await page.reload();
  await expect(page.locator("#shell")).toBeVisible();
});

test("olvidé mi contraseña manda el enlace sin revelar si la cuenta existe", async ({ page }) => {
  const llamadas = await prepararNube(page);
  await page.goto("/");
  await page.click('[data-modo="recuperar"]');
  await page.fill("#rc-correo", "quien-sea@gmail.com");
  await page.click('#form-recuperar button[type="submit"]');
  await expect(page.locator(".login-revisa")).toContainText("Si hay una cuenta con quien-sea@gmail.com");
  const rec = llamadas.find(l => l.ruta.startsWith("/auth/v1/recover"));
  expect(rec.ruta).toContain("redirect_to=");
});

test("el enlace de recuperación pide la contraseña nueva antes de entrar", async ({ page }) => {
  const llamadas = await prepararNube(page);
  await page.goto("/");
  await page.click('[data-modo="recuperar"]');
  await page.fill("#rc-correo", "ana@gmail.com");
  await page.click('#form-recuperar button[type="submit"]');
  await expect(page.locator(".login-revisa")).toBeVisible();
  // Así regresa Supabase al abrir el enlace del correo (flujo PKCE).
  await page.goto("/?accion=recuperar&code=codigo-de-prueba");
  await expect(page.locator("#form-nueva")).toBeVisible();
  expect(await page.evaluate(() => location.search)).toBe("");   // el código ya no queda en la dirección
  await page.fill("#n-pass", "Cactus#Lunar-17");
  await page.fill("#n-pass2", "Cactus#Lunar-17");
  await page.click('#form-nueva button[type="submit"]');
  await expect(page.locator("#shell")).toBeVisible();
  expect(llamadas.find(l => l.ruta === "cambio-password").cuerpo.password).toBe("Cactus#Lunar-17");
});

test("un enlace caducado muestra un aviso claro", async ({ page }) => {
  await prepararNube(page);
  await page.goto("/?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
  await expect(page.locator("#login-alert")).toContainText("caducó");
});
