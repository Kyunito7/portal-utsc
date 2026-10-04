// Cuentas: crear, iniciar sesión, contraseña incorrecta y datos que se conservan al recargar.
const { test, expect } = require("@playwright/test");
const { abrir, entrar, salir, ir } = require("./ayuda");

test("crear una cuenta nueva y volver a entrar", async ({ page }) => {
  await abrir(page);
  await page.click('[data-modo="crear"]');
  await page.fill("#r-nombre", "Ana Sofía");
  await page.fill("#r-apellidos", "López Hernández");
  await page.fill("#r-mat", "27102");
  await page.fill("#r-pass", "segura2026");
  await page.fill("#r-pass2", "segura2026");
  await expect(page.locator("#r-correo")).toHaveValue("27102@utsc.edu.mx");   // se sugiere solo
  await page.click('#form-crear button[type="submit"]');
  await expect(page.locator('[data-shell="nombre"]')).toHaveText("Ana Sofía López Hernández");

  await salir(page);
  await page.fill("#l-correo", "27102@utsc.edu.mx");
  await page.fill("#l-pass", "segura2026");
  await page.click('#form-login button[type="submit"]');
  await expect(page.locator('[data-shell="matricula"]')).toHaveText("27102");
});

test("contraseña incorrecta muestra un aviso", async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await salir(page);
  await page.fill("#l-correo", "demo@utsc.edu.mx");
  await page.fill("#l-pass", "otra-cosa1");
  await page.click('#form-login button[type="submit"]');
  await expect(page.locator("#login-alert")).toHaveText("La contraseña no es correcta.");
});

test("la sesión y los datos sobreviven a una recarga", async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await ir(page, "tramites");
  await page.reload();
  await expect(page.locator("#shell")).toBeVisible();
  expect(await page.evaluate(() => App.ruta())).toBe("tramites");
  expect(await page.evaluate(async () => !!(await App.bd.leer("estado", "demo@utsc.edu.mx")))).toBe(true);
});
