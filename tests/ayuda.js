const { abrirBaseDatos, db } = require('../backend/db');
const { crearApp } = require('../backend/server');
const { hashPassword, crearSesion, NOMBRE_COOKIE } = require('../backend/auth');

let initialized = false;

function correoEnMemoria() {
  const enviados = [];
  return {
    enviados,
    async enviar(mensaje) {
      enviados.push(mensaje);
      return { enviado: true };
    },
    async enviarConfirmacionDonacion(datos) {
      enviados.push({ tipo: 'donacion', ...datos });
      return { enviado: true };
    }
  };
}

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

async function conServidor(fn, { correo = correoEnMemoria() } = {}) {
  if (!initialized) {
    await abrirBaseDatos();
    initialized = true;
  }
  await limpiarTablas();
  const app = crearApp(db, { correo });
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}`;

  try {
    await fn(base, db, correo);
  } finally {
    servidor.close();
  }
}

async function usuarioVerificado(db, email = `u${Math.random().toString(36).slice(2)}@ejemplo.com`) {
  const resultado = await db.run(
    `INSERT INTO usuarios (nombre_completo, email, tipo_documento, numero_documento, password_hash, email_verificado)
     VALUES (?, ?, 'CC', '123', ?, 1)`,
    ['Profesional Prueba', email, hashPassword('clave-segura')]
  );
  const id = resultado.insertId;
  await db.run('INSERT INTO perfil (usuario_id, nombre, nit) VALUES (?, ?, ?)', [id, 'Profesional Prueba', '123']);
  const token = await crearSesion(db, id);
  return { id, cookie: `${NOMBRE_COOKIE}=${token}` };
}

async function json(url, opciones = {}) {
  const { cookie, body, headers, ...resto } = opciones;
  const respuesta = await fetch(url, {
    ...resto,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const texto = respuesta.status === 204 ? null : await respuesta.text();
  return { status: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null, headers: respuesta.headers };
}

module.exports = { conServidor, usuarioVerificado, json, correoEnMemoria, db };
