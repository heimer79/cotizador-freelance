const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');
const { conServidor, usuarioVerificado, json } = require('../../../../tests/ayuda');

// Mock del SDK de MercadoPago: evita llamadas reales a la API en los tests.
const pagosSimulados = new Map();
const preferenciasCreadas = [];
let contadorPreferencias = 0;

mock.module('mercadopago', {
  exports: {
    MercadoPagoConfig: class MercadoPagoConfig {
      constructor({ accessToken }) { this.accessToken = accessToken; }
    },
    Preference: class Preference {
      constructor(client) { this.client = client; }
      async create({ body }) {
        contadorPreferencias += 1;
        preferenciasCreadas.push(body);
        const id = `pref-${contadorPreferencias}`;
        return { id, init_point: `https://mercadopago.test/checkout/${id}` };
      }
    },
    Payment: class Payment {
      constructor(client) { this.client = client; }
      async get({ id }) {
        const pago = pagosSimulados.get(String(id));
        if (!pago) throw new Error('Pago no encontrado en el mock');
        return pago;
      }
    }
  }
});

function simularPago(id, datos) {
  pagosSimulados.set(String(id), datos);
}

let anteriores;
beforeEach(() => {
  anteriores = { ...process.env };
  Object.assign(process.env, { MERCADOPAGO_ACCESS_TOKEN: 'TEST-token-123', APP_URL: 'http://localhost:3000' });
  pagosSimulados.clear();
  preferenciasCreadas.length = 0;
  contadorPreferencias = 0;
});
afterEach(() => {
  process.env = anteriores;
});

test('POST /api/donaciones crea la donación pendiente y devuelve la preferencia de MercadoPago', async () => {
  await conServidor(async (base, db) => {
    const { cookie } = await usuarioVerificado(db);
    const r = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 10000 } });

    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.cuerpo.estado, 'pendiente');
    assert.match(r.cuerpo.checkout_url, /^https:\/\/mercadopago\.test\/checkout\//);

    const fila = await db.get('SELECT referencia_pasarela, pasarela FROM donacion WHERE id = ?', [r.cuerpo.donacion_id]);
    assert.strictEqual(fila.pasarela, 'mercadopago');

    const preferencia = preferenciasCreadas[preferenciasCreadas.length - 1];
    assert.strictEqual(preferencia.external_reference, fila.referencia_pasarela);
    assert.strictEqual(preferencia.items[0].unit_price, 10000);
    assert.strictEqual(preferencia.items[0].currency_id, 'COP');
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
    const { cookie } = await usuarioVerificado(db);
    const r = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 1000 } });
    assert.strictEqual(r.status, 400);
    assert.match(r.cuerpo.error, /2\.000/);
  });
});

test('el 4.º intento del día responde 429', async () => {
  await conServidor(async (base, db) => {
    const { cookie } = await usuarioVerificado(db);
    for (let i = 0; i < 3; i++) {
      await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 2000 } });
    }
    const r = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 2000 } });
    assert.strictEqual(r.status, 429);
  });
});

test('sin access token de MercadoPago configurado responde 503 con mensaje amigable (EC3)', async () => {
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  await conServidor(async (base, db) => {
    const { cookie } = await usuarioVerificado(db);
    const r = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 10000 } });
    assert.strictEqual(r.status, 503);
  });
});

test('GET /api/donaciones lista solo las donaciones del profesional, paginadas', async () => {
  await conServidor(async (base, db) => {
    const ana = await usuarioVerificado(db);
    const beto = await usuarioVerificado(db);
    await json(`${base}/api/donaciones`, { method: 'POST', cookie: ana.cookie, body: { monto: 5000 } });
    await json(`${base}/api/donaciones`, { method: 'POST', cookie: beto.cookie, body: { monto: 5000 } });

    const r = await json(`${base}/api/donaciones?pagina=1&por_pagina=20`, { cookie: ana.cookie });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.cuerpo.total, 1);
    assert.strictEqual(r.cuerpo.donaciones[0].monto, 5000);
  });
});

test('GET /api/donaciones expira a cancelada las pendientes con más de 60 minutos', async () => {
  await conServidor(async (base, db) => {
    const { cookie } = await usuarioVerificado(db);
    const creada = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 5000 } });

    const hace2Horas = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await db.run('UPDATE donacion SET fecha_creacion = ? WHERE id = ?', [hace2Horas.toISOString(), creada.cuerpo.donacion_id]);

    const r = await json(`${base}/api/donaciones?pagina=1&por_pagina=20`, { cookie });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.cuerpo.donaciones[0].estado, 'cancelada');
  });
});

test('webhook de pago approved marca la donación exitosa y envía la confirmación', async () => {
  await conServidor(async (base, db, correo) => {
    const { cookie, id } = await usuarioVerificado(db, 'donante@ejemplo.com');
    const creada = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 20000 } });
    const fila = await db.get('SELECT referencia_pasarela FROM donacion WHERE id = ?', [creada.cuerpo.donacion_id]);

    simularPago('pago-1', { status: 'approved', external_reference: fila.referencia_pasarela, transaction_amount: 20000 });

    const r = await json(`${base}/api/donaciones/webhook`, { method: 'POST', body: { type: 'payment', data: { id: 'pago-1' } } });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.cuerpo.donacion.estado, 'exitosa');

    const confirmaciones = correo.enviados.filter((m) => m.tipo === 'donacion');
    assert.strictEqual(confirmaciones.length, 1);
    assert.strictEqual(confirmaciones[0].monto, 20000);
    assert.strictEqual(confirmaciones[0].para, 'donante@ejemplo.com');

    await json(`${base}/api/donaciones/webhook`, { method: 'POST', body: { type: 'payment', data: { id: 'pago-1' } } });
    assert.strictEqual(correo.enviados.filter((m) => m.tipo === 'donacion').length, 1);
    assert.ok(id);
  });
});

test('webhook ignora notificaciones que no son de tipo payment', async () => {
  await conServidor(async (base) => {
    const r = await json(`${base}/api/donaciones/webhook`, { method: 'POST', body: { type: 'merchant_order', data: { id: '1' } } });
    assert.strictEqual(r.status, 200);
  });
});

test('webhook ignora pagos con referencia desconocida', async () => {
  await conServidor(async (base) => {
    simularPago('pago-x', { status: 'approved', external_reference: 'NO-EXISTE', transaction_amount: 1 });
    const r = await json(`${base}/api/donaciones/webhook`, { method: 'POST', body: { type: 'payment', data: { id: 'pago-x' } } });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.cuerpo.ignorado, true);
  });
});

test('webhook rechaza cuando el monto no coincide con la donación', async () => {
  await conServidor(async (base, db) => {
    const { cookie } = await usuarioVerificado(db);
    const creada = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 20000 } });
    const fila = await db.get('SELECT referencia_pasarela FROM donacion WHERE id = ?', [creada.cuerpo.donacion_id]);

    simularPago('pago-2', { status: 'approved', external_reference: fila.referencia_pasarela, transaction_amount: 999 });
    const r = await json(`${base}/api/donaciones/webhook`, { method: 'POST', body: { type: 'payment', data: { id: 'pago-2' } } });
    assert.strictEqual(r.status, 400);

    const estado = await db.get('SELECT estado FROM donacion WHERE referencia_pasarela = ?', [fila.referencia_pasarela]);
    assert.strictEqual(estado.estado, 'pendiente');
  });
});

test('webhook rejected marca la donación como fallida y no envía correo', async () => {
  await conServidor(async (base, db, correo) => {
    const { cookie } = await usuarioVerificado(db);
    const creada = await json(`${base}/api/donaciones`, { method: 'POST', cookie, body: { monto: 5000 } });
    const fila = await db.get('SELECT referencia_pasarela FROM donacion WHERE id = ?', [creada.cuerpo.donacion_id]);

    simularPago('pago-3', { status: 'rejected', external_reference: fila.referencia_pasarela, transaction_amount: 5000 });
    await json(`${base}/api/donaciones/webhook`, { method: 'POST', body: { type: 'payment', data: { id: 'pago-3' } } });

    const estado = await db.get('SELECT estado FROM donacion WHERE referencia_pasarela = ?', [fila.referencia_pasarela]);
    assert.strictEqual(estado.estado, 'fallida');
    assert.strictEqual(correo.enviados.length, 0);
  });
});
