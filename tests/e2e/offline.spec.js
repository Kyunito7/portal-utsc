// Sin conexión: el portal abre, guarda lo que haces y lo envía al volver el internet.
const { test, expect } = require("@playwright/test");
const { abrir, entrar, ir, publicar } = require("./ayuda");

test("abre y navega sin conexión", async ({ page, context }) => {
  await abrir(page);
  await entrar(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-shell="nombre"]')).toHaveText("Alumno de Prueba");
  await expect(page.locator("#barra-conexion")).toBeVisible();
  await ir(page, "noticias");
  await expect(page.locator(".news-card").first()).toBeVisible();   // noticias desde el caché
});

test("lo publicado sin conexión se envía al volver el internet", async ({ page, context }) => {
  await abrir(page);
  await entrar(page);
  await context.setOffline(true);
  await publicar(page, "Prueba sin conexión", "Esta publicación se hizo sin internet");
  await expect(page.locator(".post .b-pendiente").first()).toBeVisible();
  await expect(page.locator("#chip-cola b")).toHaveText("1");
  expect(await page.evaluate(async () => (await App.cola.pendientes()).map(a => a.tipo))).toEqual(["publicacion"]);

  await context.setOffline(false);
  await expect(page.locator("#chip-cola")).toBeHidden({ timeout: 10_000 });
  await expect(page.locator(".post .b-pendiente")).toHaveCount(0);
});

test("los pagos se bloquean sin conexión", async ({ page, context }) => {
  await abrir(page);
  await entrar(page);
  await ir(page, "pagos");
  await context.setOffline(true);
  await page.locator('[data-a="pagar"]').first().click();
  await expect(page.locator(".overlay h2")).toHaveText("Necesitas conexión para pagar");
});
