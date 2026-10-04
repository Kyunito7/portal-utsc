// Moderación: el filtro bloquea o manda a revisión, y el moderador decide.
const { test, expect } = require("@playwright/test");
const { abrir, entrar, salir, ir, publicar } = require("./ayuda");

test("insultos se bloquean con explicación", async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await publicar(page, "Opinión del examen", "El profe es un p3nd3j0");
  await expect(page.locator(".mod-bloqueo")).toContainText("Lenguaje ofensivo");
  expect(await page.evaluate(() => App.comunidad.posts.some(p => p.titulo === "Opinión del examen"))).toBe(false);
});

test("lo dudoso pasa a revisión y el moderador lo aprueba", async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await publicar(page, "Opinión del examen", "Pinche examen de cálculo, muy difícil");
  await expect(page.locator(".post").first().locator(".badge", { hasText: "En revisión" })).toBeVisible();
  await expect(page.locator('#dropdown [data-a="moderacion"]')).toBeHidden();   // un alumno no ve el panel

  await salir(page);
  await entrar(page, "moderador");
  await ir(page, "moderacion");
  const tarjeta = page.locator(".mod-item", { hasText: "Pinche examen de cálculo" });
  await expect(tarjeta).toBeVisible();
  await tarjeta.locator('[data-a="aprobar"]').click();
  await expect(tarjeta).toHaveCount(0);

  await salir(page);
  await entrar(page);
  expect(await page.evaluate(() => App.state.notificaciones[0].txt)).toContain("fue aprobada");
  await ir(page, "blog");
  await expect(page.locator(".post", { hasText: "Opinión del examen" }).locator(".badge", { hasText: "En revisión" })).toHaveCount(0);
});

test("con 3 reportes una publicación se oculta", async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await ir(page, "blog");
  await page.click('[data-a="reportar"][data-id="p5"]');   // ya trae 2 reportes de ejemplo
  await page.click(".overlay .btn-danger");
  await expect(page.locator("#post-p5")).toHaveCount(0);
});
