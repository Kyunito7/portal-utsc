// Pruebas unitarias del moderador automático (js/moderacion.js).
// Se corren con el test runner de Node: npm run test:unit
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

global.window = global;
require(path.join(__dirname, "../../js/moderacion.js"));
const { analizar, normalizar } = global.App.moderacion;
const decision = txt => analizar(txt).decision;

test("aprueba texto normal", () => {
  for (const t of [
    "Comparto mis apuntes del parcial, 40 ejercicios de SQL",
    "Qué buen proyecto, felicidades al equipo",
    "Gonzalo Álvarez ganó el concurso de cálculo",   // "alv" y "cálculo" no deben confundirse
    "Un estudio sobre Mongolia y la computadora"
  ]) assert.equal(decision(t), "aprobar", t);
});

test("bloquea insultos fuertes, aunque los disfracen", () => {
  for (const t of ["eres un pendejo", "eres un p3nd3j0", "p u t o el que lo lea", "peeendejoooo", "Hijo de puta"])
    assert.equal(decision(t), "bloquear", t);
});

test("manda a revisión groserías leves", () => {
  const r = analizar("Pinche examen de cálculo");
  assert.equal(r.decision, "revisar");
  assert.match(r.motivos[0], /pinche/);
});

test("marca amenazas como urgentes", () => {
  const r = analizar("Te voy a madrear a la salida");
  assert.equal(r.decision, "revisar");
  assert.equal(r.prioridad, "alta");
});

test("detecta spam, teléfonos y venta de respuestas", () => {
  assert.equal(decision("http://a.com y http://b.com"), "revisar");
  assert.equal(decision("ENTREN YA A ESTOS LINKS PARA CURSOS GRATIS"), "revisar");
  assert.equal(decision("llámame al 8112345678"), "revisar");
  assert.equal(decision("vendo respuestas del examen de cálculo"), "revisar");
});

test("normalizar quita acentos, números disfrazados y letras repetidas", () => {
  assert.equal(normalizar("PÉÉÉNDEJO"), "pendejo");
  assert.equal(normalizar("p3nd3j0"), "pendejo");
  assert.equal(normalizar("40 ejercicios"), "40 ejercicios");   // los números sueltos no se tocan
});
