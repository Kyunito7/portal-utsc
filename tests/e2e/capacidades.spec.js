// Capacidades avanzadas: enlaces directos, recibir lo compartido, notificaciones y métricas.
const { test, expect } = require("@playwright/test");
const { abrir, entrar, ir } = require("./ayuda");

test("un enlace compartido abre y resalta la publicación", async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await ir(page, "blog?p=p4");
  await expect(page.locator("#post-p4")).toBeInViewport();
});

test("un enlace a una noticia la abre", async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await ir(page, "noticias?n=n3");
  await expect(page.locator(".overlay h2")).toContainText("ajedrez");
});

test("lo compartido desde otra app llega al formulario del blog", async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await page.goto("/index.html?titulo=Articulo&texto=Miren%20esto&url=https%3A%2F%2Fejemplo.com");
  await expect(page.locator("#bp-t")).toHaveValue("Articulo");
  await expect(page.locator("#bp-x")).toHaveValue("Miren esto\nhttps://ejemplo.com");
  expect(page.url()).not.toContain("?titulo");   // la dirección queda limpia
});

test("las notificaciones salen por el service worker", async ({ page, context }) => {
  await context.grantPermissions(["notifications"]);
  await abrir(page);
  await entrar(page);
  await page.evaluate(() => App.comunidad.avisar(App.state.usuario.correo, "Moderación", "Tu publicación fue aprobada", "blog"));
  await expect.poll(() => page.evaluate(async () =>
    (await (await navigator.serviceWorker.ready).getNotifications()).map(n => n.body))).toContain("Tu publicación fue aprobada");
});

test("el primer arranque no recarga la página", async ({ page }) => {
  let navegaciones = 0;
  page.on("framenavigated", f => { if (f === page.mainFrame()) navegaciones++; });
  await abrir(page);
  await page.waitForTimeout(1500);
  expect(navegaciones).toBe(1);
});

test("la ventana de rendimiento muestra las métricas", async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await page.evaluate(() => App.menu.rendimiento());
  await expect(page.locator(".metrica")).toHaveCount(5);
  await expect(page.locator(".metrica").first()).toContainText("LCP");
});
