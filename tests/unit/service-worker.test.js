// Revisa que el service worker y el manifest estén completos.
// Atrapa el error más común: agregar un archivo nuevo y olvidar ponerlo en APP_SHELL.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const raiz = path.join(__dirname, "../..");
const leer = f => fs.readFileSync(path.join(raiz, f), "utf8");
const sw = leer("sw.js");
const appShell = [...sw.match(/const APP_SHELL = \[([\s\S]*?)\];/)[1].matchAll(/"\.\/([^"]*)"/g)].map(m => m[1]);

test("VERSION tiene formato vX.Y.Z", () => {
  assert.match(sw, /const VERSION = "v\d+\.\d+\.\d+";/);
});

test("todos los archivos de APP_SHELL existen", () => {
  for (const f of appShell.filter(Boolean)) assert.ok(fs.existsSync(path.join(raiz, f)), "No existe: " + f);
});

test("cada script e imagen de index.html está en APP_SHELL", () => {
  const html = leer("index.html");
  const usados = [...html.matchAll(/(?:src|href)="((?:js|css|img|fonts)\/[^"]+)"/g)].map(m => m[1]);
  for (const f of new Set(usados)) assert.ok(appShell.includes(f), "Falta en APP_SHELL: " + f);
});

test("cada vista JS está cargada en index.html", () => {
  const html = leer("index.html");
  for (const f of fs.readdirSync(path.join(raiz, "js/vistas")))
    assert.ok(html.includes(`src="js/vistas/${f}"`), "No se carga: js/vistas/" + f);
});

test("el manifest es válido y sus iconos existen", () => {
  const m = JSON.parse(leer("manifest.webmanifest"));
  for (const k of ["name", "short_name", "start_url", "display", "icons"]) assert.ok(m[k], "Falta " + k);
  assert.ok(m.icons.some(i => i.sizes === "512x512"), "Falta icono de 512");
  assert.ok(m.icons.some(i => i.purpose === "maskable"), "Falta icono maskable");
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(raiz, i.src)), "No existe: " + i.src);
});

test("data/noticias.json es válido", () => {
  const d = JSON.parse(leer("data/noticias.json"));
  assert.ok(Array.isArray(d.noticias) && d.noticias.length > 0);
  assert.ok(d.noticias.every(n => n.id && n.titulo && n.fecha));
});
