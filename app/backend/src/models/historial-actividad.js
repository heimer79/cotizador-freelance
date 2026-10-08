const { db } = require('../../db');

const LIMITE_POR_USUARIO = 20;

async function registrar({ usuarioId, tipo, detalle = null }) {
  await db.run(
    'INSERT INTO historial_actividad (usuario_id, tipo, detalle) VALUES (?, ?, ?)',
    [usuarioId, tipo, detalle]
  );
  // Conservar solo las últimas LIMITE_POR_USUARIO entradas
  await db.run(
    `DELETE FROM historial_actividad
     WHERE usuario_id = ?
       AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM historial_actividad WHERE usuario_id = ? ORDER BY fecha DESC LIMIT ?
         ) sub
       )`,
    [usuarioId, usuarioId, LIMITE_POR_USUARIO]
  );
}

async function obtenerRecientes(usuarioId) {
  return db.all(
    'SELECT tipo, detalle, fecha FROM historial_actividad WHERE usuario_id = ? ORDER BY fecha DESC LIMIT ?',
    [usuarioId, LIMITE_POR_USUARIO]
  );
}

module.exports = { registrar, obtenerRecientes };
