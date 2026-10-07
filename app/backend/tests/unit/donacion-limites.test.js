const { test } = require('node:test');
const assert = require('node:assert');
const { abrirBaseDatos } = require('../../db');
const {
  crearDonacion,
  rangoDiaBogota,
  diaBogota,
  LimiteDonacionError,
  MontoDonacionError
} = require('../../src/services/donacion-service');
const { hashPassword } = require('../../auth');

function bdConProfesional() {
  const db = abrirBaseDatos(':memory:');
  const { lastInsertRowid: id } = db
    .prepare(
      `INSERT INTO usuarios (nombre_completo, email, tipo_documento, numero_documento, password_hash)
       VALUES ('Ana', 'ana@ejemplo.com', 'CC', '1', ?)`
    )
    .run(hashPassword('clave-segura'));
  return { db, profesionalId: id };
}

let referencias = 0;
const nuevaReferencia = () => `REF-${++referencias}`;

// 12:00 en Bogotá del 5 de octubre de 2026 (17:00 UTC).
const MEDIODIA = new Date('2026-10-05T17:00:00.000Z');

test('rechaza el 4.º intento del día (máximo 3 donaciones pendientes o exitosas)', () => {
  const { db, profesionalId } = bdConProfesional();
  for (let i = 0; i < 3; i++) {
    crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: MEDIODIA });
  }
  assert.throws(
    () => crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: MEDIODIA }),
    LimiteDonacionError
  );
});

test('una donación fallida no consume cupo diario', () => {
  const { db, profesionalId } = bdConProfesional();
  for (let i = 0; i < 3; i++) {
    const d = crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: MEDIODIA });
    db.prepare("UPDATE donacion SET estado = 'fallida' WHERE id = ?").run(d.id);
  }
  assert.doesNotThrow(() =>
    crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: MEDIODIA })
  );
});

test('el acumulado diario no puede superar 200.000 COP', () => {
  const { db, profesionalId } = bdConProfesional();
  crearDonacion(db, { profesionalId, monto: 150000, referencia: nuevaReferencia(), ahora: MEDIODIA });
  assert.throws(
    () => crearDonacion(db, { profesionalId, monto: 60000, referencia: nuevaReferencia(), ahora: MEDIODIA }),
    LimiteDonacionError
  );
  assert.doesNotThrow(() =>
    crearDonacion(db, { profesionalId, monto: 50000, referencia: nuevaReferencia(), ahora: MEDIODIA })
  );
});

test('el día se calcula en America/Bogota: 04:59 UTC aún es el día anterior', () => {
  // 04:59 UTC del 6 de octubre = 23:59 del 5 de octubre en Bogotá.
  assert.strictEqual(diaBogota(new Date('2026-10-06T04:59:00.000Z')), '2026-10-05');
  // 05:00 UTC = 00:00 del 6 de octubre en Bogotá.
  assert.strictEqual(diaBogota(new Date('2026-10-06T05:00:00.000Z')), '2026-10-06');
});

test('el cupo se reinicia a medianoche de Bogotá, no a medianoche UTC', () => {
  const { db, profesionalId } = bdConProfesional();
  for (let i = 0; i < 3; i++) {
    crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: new Date('2026-10-06T04:30:00.000Z') });
  }
  // 04:30 UTC todavía es 5 de octubre en Bogotá: sin cupo.
  assert.throws(
    () => crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: new Date('2026-10-06T04:45:00.000Z') }),
    LimiteDonacionError
  );
  // 05:01 UTC ya es 6 de octubre en Bogotá: cupo nuevo.
  assert.doesNotThrow(() =>
    crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: new Date('2026-10-06T05:01:00.000Z') })
  );
});

test('rangoDiaBogota devuelve medianoche Bogotá a medianoche Bogotá en UTC', () => {
  const r = rangoDiaBogota(MEDIODIA);
  assert.strictEqual(r.inicio, '2026-10-05T05:00:00.000Z');
  assert.strictEqual(r.fin, '2026-10-06T05:00:00.000Z');
});

test('montos fuera de 2.000–500.000 COP o no enteros se rechazan', () => {
  const { db, profesionalId } = bdConProfesional();
  for (const monto of [1999, 500001, 10.5, '10000']) {
    assert.throws(
      () => crearDonacion(db, { profesionalId, monto, referencia: nuevaReferencia(), ahora: MEDIODIA }),
      MontoDonacionError
    );
  }
  assert.doesNotThrow(() =>
    crearDonacion(db, { profesionalId, monto: 2000, referencia: nuevaReferencia(), ahora: MEDIODIA })
  );
});

test('la comprobación de límites y la inserción son atómicas (sin pasar el límite con peticiones seguidas)', () => {
  const { db, profesionalId } = bdConProfesional();
  let aceptadas = 0;
  for (let i = 0; i < 10; i++) {
    try {
      crearDonacion(db, { profesionalId, monto: 2000, referencia: nuevaReferencia(), ahora: MEDIODIA });
      aceptadas++;
    } catch (error) {
      assert.ok(error instanceof LimiteDonacionError);
    }
  }
  assert.strictEqual(aceptadas, 3);
});
