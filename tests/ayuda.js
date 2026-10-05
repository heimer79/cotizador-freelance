const { abrirBaseDatos } = require('../backend/db');
const { crearApp } = require('../backend/server');
const { hashPassword, crearSesion, NOMBRE_COOKIE } = require('../backend/auth');

// Correo de prueba que no envía nada; guarda lo enviado para inspeccionarlo.
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

async function conServidor(fn, { correo = correoEnMemoria() } = {}) {
  const db = abrirBaseDatos(':memory:');
  const app = crearApp(db, { correo });
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}`;

  try {
    await fn(base, db, correo);
  } finally {
    servidor.close();
  }
}

// Crea un usuario ya verificado con sesión activa y devuelve la cabecera Cookie para usarla.
function usuarioVerificado(db, email = `u${Math.random().toString(36).slice(2)}@ejemplo.com`) {
  const { lastInsertRowid: id } = db
    .prepare(
      `INSERT INTO usuarios (nombre_completo, email, tipo_documento, numero_documento, password_hash, email_verificado)
       VALUES (?, ?, 'CC', '123', ?, 1)`
    )
    .run('Profesional Prueba', email, hashPassword('clave-segura'));
  db.prepare('INSERT INTO perfil (usuario_id, nombre, nit) VALUES (?, ?, ?)').run(id, 'Profesional Prueba', '123');
  const token = crearSesion(db, id);
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

module.exports = { conServidor, usuarioVerificado, json, correoEnMemoria };
