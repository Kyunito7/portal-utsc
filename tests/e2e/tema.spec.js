// Modo oscuro / modo claro desde Configuración → Apariencia.
const { test, expect } = require("@playwright/test");
const { abrir, entrar } = require("./ayuda");

test("el interruptor de Configuración cambia el tema y se recuerda", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await abrir(page);
  await entrar(page);
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-tema", "claro");

  await page.click("#btn-user");
  await page.click('#dropdown [data-a="config"]');
  const interruptor = page.locator("#cf-tema");
  await expect(interruptor).not.toBeChecked();
  await page.locator('label[for="cf-tema"]').click();
  await expect(html).toHaveAttribute("data-tema", "oscuro");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(17, 19, 24)");

  await page.reload();
  await expect(html).toHaveAttribute("data-tema", "oscuro");
  await page.click("#btn-user");
  await page.click('#dropdown [data-a="config"]');
  await expect(page.locator("#cf-tema")).toBeChecked();
  await page.locator('label[for="cf-tema"]').click();
  await expect(html).toHaveAttribute("data-tema", "claro");
});

test("sin elegir nada, usa el tema del sistema", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await abrir(page);
  await expect(page.locator("html")).toHaveAttribute("data-tema", "oscuro");
});
