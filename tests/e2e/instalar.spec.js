// Aviso "Instala el portal" en Inicio: tarjeta con celular, se oculta con "Ahora no" o con la X.
const { test, expect } = require("@playwright/test");
const { abrir, entrar } = require("./ayuda");

for (const boton of ['.instalar-app .btn-ghost', '.instalar-app .cerrar']) {
  test(`el aviso de instalar se oculta y no regresa (${boton.includes("cerrar") ? "X" : "Ahora no"})`, async ({ page }) => {
    await abrir(page);
    await entrar(page);
    const aviso = page.locator(".instalar-app");
    await page.evaluate(() => { App.capacidades.puedeInstalar = () => true; App.capacidades.pintarBotones(); }); // simula un navegador que permite instalar
    await expect(aviso).toBeVisible();
    await expect(aviso.locator("li")).toHaveCount(3);
    await page.click(boton);
    await expect(aviso).toHaveCount(0);
    await page.evaluate(() => App.guardarYa()); // espera a que se guarde antes de recargar
    await page.reload();
    await page.waitForFunction(() => window.App && App.sesion);
    await expect(page.locator(".instalar-app")).toHaveCount(0);
  });
}
