const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { conServidor, usuarioVerificado, json } = require('../../../tests/ayuda');

const CLAVES = {
  WOMPI_PUBLIC_KEY: 'pub_test_123',
  WOMPI_INTEGRITY_SECRET: 'secreto_integridad_test'
};

let anteriores;
beforeEach(() => {
  anteriores = { ...process.env };
  Object.assign(process.env, CLAVES, { APP_URL: 'http://localhost:3000' });
});
afterEach(() => {
  process.env = anteriores;
});

// Firma de evento igual que la de Wompi: propiedades + timestamp + secreto.
function eventoFirmado(transaccion, timestamp = 1700000000) {
  const propiedades = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];
  const valores = propiedades.map((p) => transaccion[p.split('.')[1]]);
  const checksum = crypto
    .createHash('sha256')
    .update(`${valores.join('')}${timestamp}${CLAVES.WOMPI_INTEGRITY_SECRET}`)
    .digest('hex');
  return {
    event: 'transaction.updated',
    data: { transaction: transaccion },
    signature: { properties: propiedades, checksum },
    timestamp
  };
}

test('POST /api/donaciones crea la donación pendiente y devuelve un enlace de checkout firmado', async () => {
  await conServidor(async (base, db) => {
    const { cookie } = usuarioVerificado(db);
    const r = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 10000 } });

    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.cuerpo.estado, 'pendiente');
    assert.match(r.cuerpo.checkout_url, /^https:\/\/checkout\.wompi\.co\/p\/\?/);
    const url = new URL(r.cuerpo.checkout_url);
    assert.strictEqual(url.searchParams.get('amount-in-cents'), '1000000');
    assert.strictEqual(url.searchParams.get('public-key'), CLAVES.WOMPI_PUBLIC_KEY);

    const referencia = url.searchParams.get('reference');
    const firma = crypto
      .createHash('sha256')
      .update(`${referencia}1000000COP${CLAVES.WOMPI_INTEGRITY_SECRET}`)
      .digest('hex');
    assert.strictEqual(url.searchParams.get('signature:integrity'), firma);
  });
});

test('POST /api/donaciones responde 401 sin sesión', async () => {
  await conServidor(async (base) => {
    const r = await json(`${base}/api/donaciones`, { method: 'POST', body: { monto: 10000 } });
    assert.strictEqual(r.status, 401);
  });
});

test('POST /api/donaciones responde 400 con monto fuera de rango', async () => {
  await conServidor(async (base, db) => {
    const { cookie } = usuarioVerificado(db);
    const r = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 1000 } });
    assert.strictEqual(r.status, 400);
    assert.match(r.cuerpo.error, /2\.000/);
  });
});

test('el 4.º intento del día responde 429', async () => {
  await conServidor(async (base, db) => {
    const { cookie } = usuarioVerificado(db);
    for (let i = 0; i < 3; i++) {
      await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 2000 } });
    }
    const r = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 2000 } });
    assert.strictEqual(r.status, 429);
  });
});

test('sin claves de Wompi configuradas responde 503 con mensaje amigable (EC3)', async () => {
  delete process.env.WOMPI_PUBLIC_KEY;
  await conServidor(async (base, db) => {
    const { cookie } = usuarioVerificado(db);
    const r = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 10000 } });
    assert.strictEqual(r.status, 503);
  });
});

test('GET /api/donaciones lista solo las donaciones del profesional, paginadas', async () => {
  await conServidor(async (base, db) => {
    const ana = usuarioVerificado(db);
    const beto = usuarioVerificado(db);
    await json(`${base}/api/donaciones`, { method: 'POST', cookie: ana.cookie, body: { monto: 5000 } });
    await json(`${base}/api/donaciones`, { method: 'POST', cookie: beto.cookie, body: { monto: 5000 } });

    const r = await json(`${base}/api/donaciones?pagina=1&por_pagina=20`, { cookie: ana.cookie });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.cuerpo.total, 1);
    assert.strictEqual(r.cuerpo.donaciones[0].monto, 5000);
  });
});

test('webhook APPROVED con firma válida marca la donación exitosa y envía la confirmación', async () => {
  await conServidor(async (base, db, correo) => {
    const { cookie, id } = usuarioVerificado(db, 'donante@ejemplo.com');
    const creada = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 20000 } });
    const referencia = new URL(creada.cuerpo.checkout_url).searchParams.get('reference');

    const evento = eventoFirmado({ id: 'txn-1', reference: referencia, status: 'APPROVED', amount_in_cents: 2000000 });
    const r = await json(`${base}/api/donaciones/webhook`, { method: 'POST', body: evento });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.cuerpo.donacion.estado, 'exitosa');

    const confirmaciones = correo.enviados.filter((m) => m.tipo === 'donacion');
    assert.strictEqual(confirmaciones.length, 1);
    assert.strictEqual(confirmaciones[0].monto, 20000);
    assert.strictEqual(confirmaciones[0].para, 'donante@ejemplo.com');

    // Segundo evento igual: idempotente, no reenvía correo.
    await json(`${base}/api/donaciones/webhook`, { method: 'POST', body: evento });
    assert.strictEqual(correo.enviados.filter((m) => m.tipo === 'donacion').length, 1);
    assert.ok(id);
  });
});

test('webhook con firma inválida responde 400 y no cambia la donación', async () => {
  await conServidor(async (base, db) => {
    const { cookie } = usuarioVerificado(db);
    const creada = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 20000 } });
    const referencia = new URL(creada.cuerpo.checkout_url).searchParams.get('reference');

    const evento = eventoFirmado({ id: 'txn-2', reference: referencia, status: 'APPROVED', amount_in_cents: 2000000 });
    evento.signature.checksum = 'falsificado';
    const r = await json(`${base}/api/donaciones/webhook`, { method: 'POST', body: evento });
    assert.strictEqual(r.status, 400);

    const estado = db.prepare('SELECT estado FROM donacion WHERE referencia_pasarela = ?').get(referencia);
    assert.strictEqual(estado.estado, 'pendiente');
  });
});

test('webhook DECLINED marca la donación como fallida y no envía correo', async () => {
  await conServidor(async (base, db, correo) => {
    const { cookie } = usuarioVerificado(db);
    const creada = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 5000 } });
    const referencia = new URL(creada.cuerpo.checkout_url).searchParams.get('reference');

    await json(`${base}/api/donaciones/webhook`, {
      method: 'POST',
      body: eventoFirmado({ id: 'txn-3', reference: referencia, status: 'DECLINED', amount_in_cents: 500000 })
    });

    const fila = db.prepare('SELECT estado FROM donacion WHERE referencia_pasarela = ?').get(referencia);
    assert.strictEqual(fila.estado, 'fallida');
    assert.strictEqual(correo.enviados.length, 0);
  });
});
