const { test } = require('node:test');
const assert = require('node:assert');
const { conServidor, usuarioVerificado, json } = require('./ayuda');

async function crearCliente(base, cookie, datos = {}) {
  const r = await json(`${base}/api/clientes`, {
    method: 'POST',
    cookie,
    body: { nombre: 'Acme SAS', tipo: 'persona_juridica', agenteRetenedor: true, ...datos }
  });
  return r.cuerpo;
}

async function crearCotizacion(base, cookie, clienteId, extra = {}) {
  return json(`${base}/api/cotizaciones`, { method: 'POST', cookie, body: { clienteId, ...extra } });
}

test('la copia del cliente en la cotización queda congelada tras editar el cliente', async () => {
  await conServidor(async (base, db) => {
    const { cookie } = usuarioVerificado(db);
    const cliente = await crearCliente(base, cookie);
    const cot = await crearCotizacion(base, cookie, cliente.id);
    assert.strictEqual(cot.status, 201);
    assert.strictEqual(cot.cuerpo.cliente.nombre, 'Acme SAS');

    await json(`${base}/api/clientes/${cliente.id}`, {
      method: 'PUT',
      cookie,
      body: { nombre: 'Otro nombre', tipo: 'persona_juridica', agenteRetenedor: true }
    });

    const despues = await json(`${base}/api/cotizaciones/${cot.cuerpo.id}`, { cookie });
    assert.strictEqual(despues.cuerpo.cliente.nombre, 'Acme SAS');
  });
});

test('la copia del cliente sobrevive al borrado del cliente', async () => {
  await conServidor(async (base, db) => {
    const { cookie } = usuarioVerificado(db);
    const cliente = await crearCliente(base, cookie, { nombre: 'Beta Ltda' });
    const cot = await crearCotizacion(base, cookie, cliente.id);

    const borrado = await json(`${base}/api/clientes/${cliente.id}`, { method: 'DELETE', cookie });
    assert.strictEqual(borrado.status, 204);

    const despues = await json(`${base}/api/cotizaciones/${cot.cuerpo.id}`, { cookie });
    assert.strictEqual(despues.status, 200);
    assert.strictEqual(despues.cuerpo.cliente.nombre, 'Beta Ltda');
  });
});

test('el número de cotización es consecutivo por usuario y año, y AAAA-NNN', async () => {
  await conServidor(async (base, db) => {
    const ana = usuarioVerificado(db);
    const beto = usuarioVerificado(db);
    const clienteAna = await crearCliente(base, ana.cookie);
    const clienteBeto = await crearCliente(base, beto.cookie);

    const a1 = await crearCotizacion(base, ana.cookie, clienteAna.id);
    const a2 = await crearCotizacion(base, ana.cookie, clienteAna.id);
    const b1 = await crearCotizacion(base, beto.cookie, clienteBeto.id);

    const anio = new Date().getFullYear();
    assert.strictEqual(a1.cuerpo.numero, `${anio}-001`);
    assert.strictEqual(a2.cuerpo.numero, `${anio}-002`);
    assert.strictEqual(b1.cuerpo.numero, `${anio}-001`);
  });
});

test('un número de borrador eliminado no se reutiliza', async () => {
  await conServidor(async (base, db) => {
    const { cookie } = usuarioVerificado(db);
    const cliente = await crearCliente(base, cookie);
    const primera = await crearCotizacion(base, cookie, cliente.id);
    await json(`${base}/api/cotizaciones/${primera.cuerpo.id}`, { method: 'DELETE', cookie });
    const segunda = await crearCotizacion(base, cookie, cliente.id);
    assert.notStrictEqual(segunda.cuerpo.numero, primera.cuerpo.numero);
  });
});

test('una cotización emitida es de solo lectura y no se puede eliminar', async () => {
  await conServidor(async (base, db) => {
    const { cookie } = usuarioVerificado(db);
    const cliente = await crearCliente(base, cookie);
    const cot = await crearCotizacion(base, cookie, cliente.id);
    const url = `${base}/api/cotizaciones/${cot.cuerpo.id}`;

    const sinLineas = await json(`${url}/emitir`, { method: 'POST', cookie });
    assert.strictEqual(sinLineas.status, 422);

    await json(`${url}/lineas`, { method: 'POST', cookie, body: { descripcion: 'Diseño', cantidad: 1, precioUnitario: 100000 } });
    const emitida = await json(`${url}/emitir`, { method: 'POST', cookie });
    assert.strictEqual(emitida.cuerpo.estado, 'emitida');

    const editarLinea = await json(`${url}/lineas`, { method: 'POST', cookie, body: { descripcion: 'Extra', cantidad: 1, precioUnitario: 1 } });
    assert.strictEqual(editarLinea.status, 409);

    const editar = await json(url, { method: 'PUT', cookie, body: { ivaTarifa: 0 } });
    assert.strictEqual(editar.status, 409);

    const borrar = await json(url, { method: 'DELETE', cookie });
    assert.strictEqual(borrar.status, 409);
  });
});

test('la retención se rechaza para persona natural con explicación (EC3)', async () => {
  await conServidor(async (base, db) => {
    const { cookie } = usuarioVerificado(db);
    const natural = await crearCliente(base, cookie, { tipo: 'persona_natural', agenteRetenedor: false });
    const r = await crearCotizacion(base, cookie, natural.id, {
      retencion: { activada: true, concepto: 'honorarios', porcentaje: 11 }
    });
    assert.strictEqual(r.status, 422);
    assert.match(r.cuerpo.error, /agente retenedor/);
  });
});

test('la emisión conserva los datos del emisor; un borrador los refresca desde el perfil', async () => {
  await conServidor(async (base, db) => {
    const { cookie } = usuarioVerificado(db);
    const cliente = await crearCliente(base, cookie);
    const cot = await crearCotizacion(base, cookie, cliente.id);
    const url = `${base}/api/cotizaciones/${cot.cuerpo.id}`;

    await json(`${base}/api/perfil`, { method: 'PUT', cookie, body: { nombre: 'Ana Pérez', nit: '999', regimen: 'simple' } });
    const borrador = await json(url, { method: 'PUT', cookie, body: { ivaTarifa: 19 } });
    assert.strictEqual(borrador.cuerpo.emisor.nombre, 'Ana Pérez');
    assert.strictEqual(borrador.cuerpo.emisor.regimen, 'simple');

    await json(`${url}/lineas`, { method: 'POST', cookie, body: { descripcion: 'Diseño', cantidad: 1, precioUnitario: 100000 } });
    await json(`${url}/emitir`, { method: 'POST', cookie });
    await json(`${base}/api/perfil`, { method: 'PUT', cookie, body: { nombre: 'Otro nombre', nit: '999', regimen: 'ordinario' } });

    const emitida = await json(url, { cookie });
    assert.strictEqual(emitida.cuerpo.emisor.nombre, 'Ana Pérez');
    assert.strictEqual(emitida.cuerpo.emisor.regimen, 'simple');
  });
});

test('cada usuario solo ve y modifica sus propios datos', async () => {
  await conServidor(async (base, db) => {
    const ana = usuarioVerificado(db);
    const beto = usuarioVerificado(db);
    const cliente = await crearCliente(base, ana.cookie);
    const cot = await crearCotizacion(base, ana.cookie, cliente.id);

    const lectura = await json(`${base}/api/cotizaciones/${cot.cuerpo.id}`, { cookie: beto.cookie });
    assert.strictEqual(lectura.status, 404);

    const borrado = await json(`${base}/api/clientes/${cliente.id}`, { method: 'DELETE', cookie: beto.cookie });
    assert.strictEqual(borrado.status, 404);

    const listaBeto = await json(`${base}/api/clientes`, { cookie: beto.cookie });
    assert.deepStrictEqual(listaBeto.cuerpo, []);
  });
});

test('sin sesión la API responde 401', async () => {
  await conServidor(async (base) => {
    const r = await json(`${base}/api/cotizaciones`);
    assert.strictEqual(r.status, 401);
  });
});

test('con sesión pero correo sin verificar, las escrituras responden 403 y las lecturas siguen', async () => {
  await conServidor(async (base, db) => {
    const { cookie, id } = usuarioVerificado(db);
    db.prepare('UPDATE usuarios SET email_verificado = 0 WHERE id = ?').run(id);

    const escritura = await json(`${base}/api/clientes`, { method: 'POST', cookie, body: { nombre: 'X', tipo: 'persona_natural' } });
    assert.strictEqual(escritura.status, 403);

    const lectura = await json(`${base}/api/clientes`, { cookie });
    assert.strictEqual(lectura.status, 200);
  });
});

test('registro envía correo de verificación; verificar con el enlace habilita escrituras', async () => {
  await conServidor(async (base, db, correo) => {
    const registro = await json(`${base}/api/auth/registro`, {
      method: 'POST',
      body: {
        nombreCompleto: 'Carla Gómez',
        email: 'Carla@Ejemplo.co',
        tipoDocumento: 'CC',
        numeroDocumento: '1020304050',
        password: 'clave-larga-1'
      }
    });
    assert.strictEqual(registro.status, 201);
    assert.strictEqual(registro.cuerpo.usuario.verificado, false);

    const token = correo.enviados[0].texto.match(/verificar=([\w-]+)/)[1];
    const cookie = registro.headers.get('set-cookie').split(';')[0];

    const antes = await json(`${base}/api/clientes`, { method: 'POST', cookie, body: { nombre: 'X', tipo: 'persona_natural' } });
    assert.strictEqual(antes.status, 403);

    const verificado = await json(`${base}/api/auth/verificar`, { method: 'POST', body: { token } });
    assert.strictEqual(verificado.status, 200);

    const despues = await json(`${base}/api/clientes`, { method: 'POST', cookie, body: { nombre: 'X', tipo: 'persona_natural' } });
    assert.strictEqual(despues.status, 201);

    const reuso = await json(`${base}/api/auth/verificar`, { method: 'POST', body: { token } });
    assert.strictEqual(reuso.status, 400);
  });
});

test('login con contraseña incorrecta responde 401 con mensaje genérico', async () => {
  await conServidor(async (base, db) => {
    usuarioVerificado(db, 'ana@ejemplo.com');
    const malo = await json(`${base}/api/auth/login`, { method: 'POST', body: { email: 'ana@ejemplo.com', password: 'nope-nope' } });
    const inexistente = await json(`${base}/api/auth/login`, { method: 'POST', body: { email: 'nadie@ejemplo.com', password: 'nope-nope' } });
    assert.strictEqual(malo.status, 401);
    assert.strictEqual(malo.cuerpo.error, inexistente.cuerpo.error);
  });
});

test('restablecer contraseña con enlace válido cierra las sesiones abiertas', async () => {
  await conServidor(async (base, db, correo) => {
    const { id, cookie } = usuarioVerificado(db, 'ana@ejemplo.com');
    await json(`${base}/api/auth/olvide`, { method: 'POST', body: { email: 'ana@ejemplo.com' } });
    const token = correo.enviados[0].texto.match(/restablecer=([\w-]+)/)[1];

    const r = await json(`${base}/api/auth/restablecer`, { method: 'POST', body: { token, password: 'nueva-clave-1' } });
    assert.strictEqual(r.status, 200);

    const sesionVieja = await json(`${base}/api/clientes`, { cookie });
    assert.strictEqual(sesionVieja.status, 401);

    const login = await json(`${base}/api/auth/login`, { method: 'POST', body: { email: 'ana@ejemplo.com', password: 'nueva-clave-1' } });
    assert.strictEqual(login.status, 200);
    assert.ok(db.prepare('SELECT id FROM usuarios WHERE id = ?').get(id));
  });
});

test('olvidé mi contraseña responde igual exista o no el correo', async () => {
  await conServidor(async (base, db, correo) => {
    const existe = await json(`${base}/api/auth/olvide`, { method: 'POST', body: { email: 'nadie@ejemplo.com' } });
    assert.strictEqual(existe.status, 200);
    assert.strictEqual(correo.enviados.length, 0);
  });
});

test('la API de configuración de publicidad es pública y devuelve los espacios', async () => {
  await conServidor(async (base) => {
    const r = await json(`${base}/api/config/ads`);
    assert.strictEqual(r.status, 200);
    assert.ok(r.cuerpo.espacios.length >= 5);
    const pauta = r.cuerpo.espacios.filter((e) => e.tipo === 'pauta_directa');
    assert.ok(pauta.length >= 2);
  });
});
