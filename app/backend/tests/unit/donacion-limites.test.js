const { test, before } = require('node:test');
const assert = require('node:assert');
const { abrirBaseDatos, db } = require('../../db');
const {
  crearDonacion,
  rangoDiaBogota,
  diaBogota,
  LimiteDonacionError,
  MontoDonacionError
} = require('../../src/services/donacion-service');
const { hashPassword } = require('../../auth');

let initialized = false;

const TABLAS = [
  'lineas_cotizacion', 'contador_cotizaciones', 'cotizaciones',
  'donacion', 'catalogo', 'perfil', 'tokens_correo', 'sesiones', 'clientes', 'usuarios'
];

async function limpiarTablas() {
  await db.run('SET FOREIGN_KEY_CHECKS = 0');
  for (const tabla of TABLAS) {
    await db.run(`TRUNCATE TABLE \`${tabla}\``);
  }
  await db.run('SET FOREIGN_KEY_CHECKS = 1');
}

async function bdConProfesional() {
  if (!initialized) {
    await abrirBaseDatos();
    initialized = true;
  }
  await limpiarTablas();
  const resultado = await db.run(
    `INSERT INTO usuarios (nombre_completo, email, tipo_documento, numero_documento, password_hash)
     VALUES ('Ana', ?, 'CC', '1', ?)`,
    [`ana${Math.random().toString(36).slice(2)}@ejemplo.com`, hashPassword('clave-segura')]
  );
  return { db, profesionalId: resultado.insertId };
}

let referencias = 0;
const nuevaReferencia = () => `REF-${++referencias}-${Math.random().toString(36).slice(2)}`;

const MEDIODIA = new Date('2026-10-05T17:00:00.000Z');

test('rechaza el 4.º intento del día (máximo 3 donaciones pendientes o exitosas)', async () => {
  const { db, profesionalId } = await bdConProfesional();
  for (let i = 0; i < 3; i++) {
    await crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: MEDIODIA });
  }
  await assert.rejects(
    () => crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: MEDIODIA }),
    LimiteDonacionError
  );
});

test('una donación pendiente con más de 60 minutos expira a cancelada y libera el cupo diario', async () => {
  const { db, profesionalId } = await bdConProfesional();
  for (let i = 0; i < 3; i++) {
    await crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: MEDIODIA });
  }

  const unaHoraYUnMinutoDespues = new Date(MEDIODIA.getTime() + 61 * 60 * 1000);
  const nueva = await crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: unaHoraYUnMinutoDespues });
  assert.strictEqual(nueva.estado, 'pendiente');

  const anteriores = await db.all('SELECT estado FROM donacion WHERE profesional_id = ? AND id != ?', [profesionalId, nueva.id]);
  assert.strictEqual(anteriores.length, 3);
  assert.ok(anteriores.every((d) => d.estado === 'cancelada'));
});

test('una donación pendiente no expira antes de los 60 minutos', async () => {
  const { db, profesionalId } = await bdConProfesional();
  for (let i = 0; i < 3; i++) {
    await crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: MEDIODIA });
  }

  const cincuentaMinutosDespues = new Date(MEDIODIA.getTime() + 50 * 60 * 1000);
  await assert.rejects(
    () => crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: cincuentaMinutosDespues }),
    LimiteDonacionError
  );
});

test('una donación fallida no consume cupo diario', async () => {
  const { db, profesionalId } = await bdConProfesional();
  for (let i = 0; i < 3; i++) {
    const d = await crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: MEDIODIA });
    await db.run("UPDATE donacion SET estado = 'fallida' WHERE id = ?", [d.id]);
  }
  await crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: MEDIODIA });
});

test('el acumulado diario no puede superar 200.000 COP', async () => {
  const { db, profesionalId } = await bdConProfesional();
  await crearDonacion(db, { profesionalId, monto: 150000, referencia: nuevaReferencia(), ahora: MEDIODIA });
  await assert.rejects(
    () => crearDonacion(db, { profesionalId, monto: 60000, referencia: nuevaReferencia(), ahora: MEDIODIA }),
    LimiteDonacionError
  );
  await crearDonacion(db, { profesionalId, monto: 50000, referencia: nuevaReferencia(), ahora: MEDIODIA });
});

test('el día se calcula en America/Bogota: 04:59 UTC aún es el día anterior', () => {
  assert.strictEqual(diaBogota(new Date('2026-10-06T04:59:00.000Z')), '2026-10-05');
  assert.strictEqual(diaBogota(new Date('2026-10-06T05:00:00.000Z')), '2026-10-06');
});

test('el cupo se reinicia a medianoche de Bogotá, no a medianoche UTC', async () => {
  const { db, profesionalId } = await bdConProfesional();
  for (let i = 0; i < 3; i++) {
    await crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: new Date('2026-10-06T04:30:00.000Z') });
  }
  await assert.rejects(
    () => crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: new Date('2026-10-06T04:45:00.000Z') }),
    LimiteDonacionError
  );
  await crearDonacion(db, { profesionalId, monto: 10000, referencia: nuevaReferencia(), ahora: new Date('2026-10-06T05:01:00.000Z') });
});

test('rangoDiaBogota devuelve medianoche Bogotá a medianoche Bogotá en UTC', () => {
  const r = rangoDiaBogota(MEDIODIA);
  assert.strictEqual(r.inicio, '2026-10-05T05:00:00.000Z');
  assert.strictEqual(r.fin, '2026-10-06T05:00:00.000Z');
});

test('montos fuera de 2.000–500.000 COP o no enteros se rechazan', async () => {
  const { db, profesionalId } = await bdConProfesional();
  for (const monto of [1999, 500001, 10.5, '10000']) {
    await assert.rejects(
      () => crearDonacion(db, { profesionalId, monto, referencia: nuevaReferencia(), ahora: MEDIODIA }),
      MontoDonacionError
    );
  }
  await crearDonacion(db, { profesionalId, monto: 2000, referencia: nuevaReferencia(), ahora: MEDIODIA });
});

test('la comprobación de límites y la inserción son atómicas (sin pasar el límite con peticiones seguidas)', async () => {
  const { db, profesionalId } = await bdConProfesional();
  let aceptadas = 0;
  for (let i = 0; i < 10; i++) {
    try {
      await crearDonacion(db, { profesionalId, monto: 2000, referencia: nuevaReferencia(), ahora: MEDIODIA });
      aceptadas++;
    } catch (error) {
      assert.ok(error instanceof LimiteDonacionError);
    }
  }
  assert.strictEqual(aceptadas, 3);
});
