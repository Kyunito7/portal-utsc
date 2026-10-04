// Funciones que comparten las pruebas e2e.
const { expect } = require("@playwright/test");

// Abre el portal y espera a que el service worker esté listo (necesario para probar sin conexión).
async function abrir(page, ruta = "/") {
  await page.goto(ruta);
  await page.evaluate(() => navigator.serviceWorker.ready);
}

// Entra con una de las cuentas de prueba de la pantalla de inicio.
async function entrar(page, quien = "alumno") {
  await page.click(quien === "moderador" ? "#demo-mod" : "#demo");
  await expect(page.locator("#shell")).toBeVisible();
  await page.waitForFunction(() => window.App && App.sesion && App.comunidad.listo);
}

async function salir(page) {
  await page.evaluate(() => { App.cerrarSesion(); location.hash = ""; App.render(true); });
  await expect(page.locator("#login form")).toBeVisible();
}

async function ir(page, ruta) {
  await page.evaluate(r => { location.hash = r; }, ruta);
  await page.waitForFunction(r => App.ruta() === r.split("?")[0], ruta);
}

// Publica en el blog y regresa el texto del aviso que salió.
async function publicar(page, titulo, texto) {
  await ir(page, "blog");
  await page.fill("#bp-t", titulo);
  await page.fill("#bp-x", texto);
  await page.click('[data-f="publicar"] .btn-primary');
}

module.exports = { abrir, entrar, salir, ir, publicar };
