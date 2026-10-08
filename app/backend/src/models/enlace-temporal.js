const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');
const { db } = require('../../db');

const DIAS_EXPIRACION = 7;

function fechaExpiracion() {
  const d = new Date();
  d.setDate(d.getDate() + DIAS_EXPIRACION);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function crear({ usuarioId, rutaPdf }) {
  const token = randomUUID();
  const expira = fechaExpiracion();
  await db.run(
    'INSERT INTO enlaces_temporales (token, ruta_pdf, usuario_id, fecha_expiracion) VALUES (?, ?, ?, ?)',
    [token, rutaPdf, usuarioId, expira]
  );
  return token;
}

async function verificar(token) {
  const fila = await db.get(
    'SELECT * FROM enlaces_temporales WHERE token = ? AND fecha_expiracion > NOW()',
    [token]
  );
  return fila || null;
}

async function limpiarExpirados() {
  const expirados = await db.all(
    'SELECT ruta_pdf FROM enlaces_temporales WHERE fecha_expiracion <= NOW()'
  );
  for (const { ruta_pdf } of expirados) {
    try { fs.unlinkSync(ruta_pdf); } catch { /* archivo ya eliminado */ }
  }
  await db.run('DELETE FROM enlaces_temporales WHERE fecha_expiracion <= NOW()');
}

module.exports = { crear, verificar, limpiarExpirados };
