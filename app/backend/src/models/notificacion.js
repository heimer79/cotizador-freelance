const { db } = require('../../db');

async function registrarNotificacion({ tipo, titulo, descripcion }) {
  await db.run(
    'INSERT INTO notificaciones_admin (tipo, titulo, descripcion) VALUES (?, ?, ?)',
    [tipo, titulo, descripcion]
  );
}

async function listar(pagina = 1, limite = 20) {
  const offset = (pagina - 1) * limite;
  const filas = await db.all(
    'SELECT * FROM notificaciones_admin ORDER BY fecha DESC LIMIT ? OFFSET ?',
    [limite, offset]
  );
  const total = await db.get('SELECT COUNT(*) AS cnt FROM notificaciones_admin');
  return { notificaciones: filas, total: total.cnt };
}

async function contarNoLeidas() {
  const fila = await db.get('SELECT COUNT(*) AS cnt FROM notificaciones_admin WHERE leida = 0');
  return fila.cnt;
}

async function marcarLeida(id) {
  await db.run('UPDATE notificaciones_admin SET leida = 1 WHERE id = ?', [id]);
}

module.exports = { registrarNotificacion, listar, contarNoLeidas, marcarLeida };
