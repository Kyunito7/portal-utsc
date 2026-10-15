// Cuentas: crear, iniciar sesión, contraseña incorrecta y datos que se conservan al recargar.
const { test, expect } = require("@playwright/test");
const { abrir, entrar, salir, ir } = require("./ayuda");

test("crear una cuenta nueva y volver a entrar", async ({ page }) => {
  await abrir(page);
  await page.click('[data-modo="crear"]');
  await page.fill("#r-nombre", "Ana Sofía");
  await page.fill("#r-apellidos", "López Hernández");
  await page.fill("#r-mat", "27102");
  await page.fill("#r-correo", "ana.lopez@gmail.com");   // cualquier correo real
  await page.fill("#r-pass", "Nopal-Verde-82");
  await page.fill("#r-pass2", "Nopal-Verde-82");
  await expect(page.locator('.medidor')).toHaveAttribute("data-nivel", "4");
  await page.click('#form-crear button[type="submit"]');
  await expect(page.locator('[data-shell="nombre"]')).toHaveText("Ana Sofía López Hernández");

  await salir(page);
  await page.fill("#l-correo", "ana.lopez@gmail.com");
  await page.fill("#l-pass", "Nopal-Verde-82");
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
  // Mismo aviso si el correo no existe: no se revela quién tiene cuenta.
  await expect(page.locator("#login-alert")).toHaveText("Correo o contraseña incorrectos.");
  await page.fill("#l-correo", "nadie@gmail.com");
  await page.fill("#l-pass", "otra-cosa1");
  await page.click('#form-login button[type="submit"]');
  await expect(page.locator("#login-alert")).toHaveText("Correo o contraseña incorrectos.");
});

test("rechaza contraseñas débiles al crear la cuenta", async ({ page }) => {
  await abrir(page);
  await page.click('[data-modo="crear"]');
  await page.fill("#r-nombre", "Diego");
  await page.fill("#r-apellidos", "Ríos Contreras");
  await page.fill("#r-mat", "24812");
  await page.fill("#r-correo", "diego@gmail.com");
  const intentar = async (pass, aviso) => {
    await page.fill("#r-pass", pass);
    await page.fill("#r-pass2", pass);
    await page.click('#form-crear button[type="submit"]');
    await expect(page.locator("#r-pass").locator("xpath=ancestor::div[contains(@class,'field')][1]").locator(".field-error")).toContainText(aviso);
  };
  await intentar("corta1", "al menos 10");
  await intentar("Password2026!", "muy común");
  await intentar("Diego2026-xyz", "nombre, matrícula o correo");
  await intentar("Abcd9876-zz", "secuencias");
  await expect(page.locator("#shell")).toBeHidden();
});

test("después de 5 intentos fallidos pide esperar", async ({ page }) => {
  await abrir(page);
  for (let i = 0; i < 5; i++) {
    await page.fill("#l-correo", "alguien@gmail.com");
    await page.fill("#l-pass", "intento-" + i);
    await page.click('#form-login button[type="submit"]');
    await expect(page.locator("#login-alert")).toBeVisible();
  }
  await page.fill("#l-pass", "otro-intento");
  await page.click('#form-login button[type="submit"]');
  await expect(page.locator("#login-alert")).toContainText("espera");
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
