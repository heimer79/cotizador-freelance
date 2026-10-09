// Tests unitarios para calcularTotales() — node --test (T078)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calcularTotales } = require('../calculo.js');

const linea1 = [{ cantidad: 1, precioUnitario: 5000000 }];
const lineasMultiples = [
  { cantidad: 2, precioUnitario: 1000000 },
  { cantidad: 1, precioUnitario: 500000 }
];

test('solo IVA 19%', () => {
  const r = calcularTotales({ lineas: linea1, ivaTarifa: 19, ivaResponsable: true });
  assert.equal(r.baseGravable, 5000000);
  assert.equal(r.iva, 950000);
  assert.equal(r.retencion, 0);
  assert.equal(r.reteiva, 0);
  assert.equal(r.reteica, 0);
  assert.equal(r.totalNeto, 5950000);
});

test('solo retención fuente 4%', () => {
  const r = calcularTotales({ lineas: linea1, retencionActivada: true, retencionPorcentaje: 4 });
  assert.equal(r.baseGravable, 5000000);
  assert.equal(r.iva, 0);
  assert.equal(r.retencion, 200000);
  assert.equal(r.totalNeto, 4800000);
});

test('solo retención fuente 6%', () => {
  const r = calcularTotales({ lineas: linea1, retencionActivada: true, retencionPorcentaje: 6 });
  assert.equal(r.retencion, 300000);
  assert.equal(r.totalNeto, 4700000);
});

test('solo retención fuente 10%', () => {
  const r = calcularTotales({ lineas: linea1, retencionActivada: true, retencionPorcentaje: 10 });
  assert.equal(r.retencion, 500000);
  assert.equal(r.totalNeto, 4500000);
});

test('solo retención fuente 11%', () => {
  const r = calcularTotales({ lineas: linea1, retencionActivada: true, retencionPorcentaje: 11 });
  assert.equal(r.retencion, 550000);
  assert.equal(r.totalNeto, 4450000);
});

test('IVA 19% + retención 6% combinados', () => {
  const r = calcularTotales({ lineas: linea1, ivaTarifa: 19, ivaResponsable: true, retencionActivada: true, retencionPorcentaje: 6 });
  assert.equal(r.baseGravable, 5000000);
  assert.equal(r.iva, 950000);
  assert.equal(r.retencion, 300000);
  assert.equal(r.totalNeto, 5650000);
});

test('reteIVA 15% sobre IVA', () => {
  const r = calcularTotales({ lineas: linea1, ivaTarifa: 19, ivaResponsable: true, reteivaActivada: true, reteivaPorcentaje: 15 });
  assert.equal(r.iva, 950000);
  assert.equal(r.reteiva, 142500);
  assert.equal(r.totalNeto, 5950000 - 142500);
});

test('reteICA porcentaje personalizado', () => {
  const r = calcularTotales({ lineas: linea1, reteicaActivada: true, reteicaPorcentaje: 0.966 });
  assert.equal(r.reteica, Math.round(5000000 * 0.966 / 100));
  assert.equal(r.totalNeto, 5000000 - r.reteica);
});

test('compensación de retención activa', () => {
  const r = calcularTotales({ lineas: linea1, retencionActivada: true, retencionPorcentaje: 6, compensarRetencion: true });
  assert.ok(r.compensacion > 0);
  assert.ok(r.baseGravable > 5000000);
});

test('todos los impuestos simultáneos', () => {
  const r = calcularTotales({
    lineas: linea1,
    ivaTarifa: 19, ivaResponsable: true,
    retencionActivada: true, retencionPorcentaje: 6,
    reteivaActivada: true, reteivaPorcentaje: 15,
    reteicaActivada: true, reteicaPorcentaje: 0.966
  });
  assert.equal(r.baseGravable, 5000000);
  assert.equal(r.iva, 950000);
  assert.equal(r.retencion, 300000);
  assert.equal(r.reteiva, 142500);
  assert.equal(r.reteica, Math.round(5000000 * 0.966 / 100));
  assert.equal(r.totalNeto, 5000000 + 950000 - 300000 - 142500 - r.reteica);
});

test('líneas múltiples', () => {
  const r = calcularTotales({ lineas: lineasMultiples, ivaTarifa: 19, ivaResponsable: true });
  assert.equal(r.baseGravable, 2500000);
  assert.equal(r.iva, Math.round(2500000 * 0.19));
});

test('valores en cero (sin líneas)', () => {
  const r = calcularTotales({ lineas: [] });
  assert.equal(r.baseGravable, 0);
  assert.equal(r.totalNeto, 0);
});

test('IVA no responsable (0%)', () => {
  const r = calcularTotales({ lineas: linea1, ivaTarifa: 19, ivaResponsable: false });
  assert.equal(r.iva, 0);
  assert.equal(r.totalNeto, 5000000);
});
