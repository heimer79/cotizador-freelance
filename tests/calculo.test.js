const { test } = require('node:test');
const assert = require('node:assert');
const { calcularCotizacion, validarRetencion, redondear } = require('../backend/calculo');

const lineasReferencia = [
  { cantidad: 1, precioUnitario: 1500000 },
  { cantidad: 1, precioUnitario: 500000 }
];

test('caso de referencia SC-004: honorarios 11 % -> total 2.160.000', () => {
  const r = calcularCotizacion({
    lineas: lineasReferencia,
    ivaTarifa: 19,
    retencionActivada: true,
    retencionPorcentaje: 11
  });
  assert.deepStrictEqual(r, { baseGravable: 2000000, iva: 380000, retencion: 220000, total: 2160000 });
});

test('honorarios 10 % -> total 2.180.000', () => {
  const r = calcularCotizacion({ lineas: lineasReferencia, ivaTarifa: 19, retencionActivada: true, retencionPorcentaje: 10 });
  assert.strictEqual(r.total, 2180000);
});

test('sin retención activada -> total base + IVA', () => {
  const r = calcularCotizacion({ lineas: lineasReferencia, ivaTarifa: 19, retencionActivada: false, retencionPorcentaje: 11 });
  assert.strictEqual(r.retencion, 0);
  assert.strictEqual(r.total, 2380000);
});

test('IVA reducido 5 % y excluido 0 % se aplican a toda la cotización', () => {
  assert.strictEqual(calcularCotizacion({ lineas: lineasReferencia, ivaTarifa: 5, retencionActivada: false }).iva, 100000);
  assert.strictEqual(calcularCotizacion({ lineas: lineasReferencia, ivaTarifa: 0, retencionActivada: false }).total, 2000000);
});

test('retención de compras 2.5 % sobre base 1.000.001 redondea solo al final', () => {
  const r = calcularCotizacion({
    lineas: [{ cantidad: 1, precioUnitario: 1000001 }],
    ivaTarifa: 0,
    retencionActivada: true,
    retencionPorcentaje: 2.5
  });
  // 1.000.001 × 2,5 % = 25.000,025 → 25.000
  assert.strictEqual(r.retencion, 25000);
  assert.strictEqual(r.total, 975001);
});

test('lista de líneas vacía -> todos los importes en 0', () => {
  const r = calcularCotizacion({ lineas: [], ivaTarifa: 19, retencionActivada: true, retencionPorcentaje: 11 });
  assert.deepStrictEqual(r, { baseGravable: 0, iva: 0, retencion: 0, total: 0 });
});

test('redondear usa Math.round', () => {
  assert.strictEqual(redondear(2.5), 3);
  assert.strictEqual(redondear(2.4), 2);
});

test('persona natural no agente retenedor no puede tener retención (EC3, SC-007)', () => {
  const error = validarRetencion({
    tipoCliente: 'persona_natural',
    agenteRetenedor: false,
    activada: true,
    concepto: 'honorarios',
    porcentaje: 11
  });
  assert.ok(error && error.includes('agente retenedor'));
});

test('persona natural que sí es agente retenedor puede tener retención', () => {
  const error = validarRetencion({
    tipoCliente: 'persona_natural',
    agenteRetenedor: true,
    activada: true,
    concepto: 'honorarios',
    porcentaje: 10
  });
  assert.strictEqual(error, null);
});

test('cliente que no es agente retenedor no puede tener retención', () => {
  const error = validarRetencion({
    tipoCliente: 'persona_juridica',
    agenteRetenedor: false,
    activada: true,
    concepto: 'servicios',
    porcentaje: 4
  });
  assert.ok(error);
});

test('porcentajes de retención deben corresponder al concepto DIAN', () => {
  const ok = { tipoCliente: 'persona_juridica', agenteRetenedor: true, activada: true };
  assert.strictEqual(validarRetencion({ ...ok, concepto: 'servicios', porcentaje: 6 }), null);
  assert.strictEqual(validarRetencion({ ...ok, concepto: 'compras', porcentaje: 3.5 }), null);
  assert.ok(validarRetencion({ ...ok, concepto: 'servicios', porcentaje: 11 }));
  assert.ok(validarRetencion({ ...ok, concepto: 'inventada', porcentaje: 1 }));
});

test('sin retención activada no se valida el cliente', () => {
  assert.strictEqual(validarRetencion({ tipoCliente: 'persona_natural', agenteRetenedor: false, activada: false }), null);
});
