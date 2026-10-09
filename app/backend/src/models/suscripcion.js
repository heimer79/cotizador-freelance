const { db } = require('../../db');

function fechaVencimiento() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function crear({ usuarioId, modalidad, pasarela = 'mercadopago', referencia = null }) {
  const inicio = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const vencimiento = fechaVencimiento();
  const resultado = await db.run(
    `INSERT INTO suscripciones (usuario_id, fecha_inicio, fecha_vencimiento, estado, modalidad, referencia_pasarela, pasarela)
     VALUES (?, ?, ?, 'activa', ?, ?, ?)`,
    [usuarioId, inicio, vencimiento, modalidad, referencia, pasarela]
  );
  await db.run(`UPDATE usuarios SET tipo_cuenta = 'premium' WHERE id = ?`, [usuarioId]);
  return resultado.insertId;
}

async function obtenerEstado(usuarioId) {
  return db.get(
    `SELECT * FROM suscripciones WHERE usuario_id = ? ORDER BY fecha_creacion DESC LIMIT 1`,
    [usuarioId]
  );
}

async function verificarVigencia(usuarioId) {
  const sus = await obtenerEstado(usuarioId);
  if (!sus) return false;
  return sus.estado === 'activa' && new Date(sus.fecha_vencimiento) > new Date();
}

async function cancelarRenovacion(usuarioId) {
  await db.run(
    `UPDATE suscripciones SET modalidad = 'manual' WHERE usuario_id = ? AND estado = 'activa'`,
    [usuarioId]
  );
}

// Otorga o revoca premium manualmente desde el panel de administración, sin pasar por una
// pasarela de pago. Al otorgar, crea una suscripción 'activa' para que procesarTransiciones()
// no revierta el tipo_cuenta en el siguiente ciclo.
async function establecerCuentaManual(usuarioId, tipoCuenta) {
  await db.run(
    `UPDATE suscripciones SET estado = 'cancelada' WHERE usuario_id = ? AND estado = 'activa'`,
    [usuarioId]
  );

  if (tipoCuenta === 'premium') {
    const inicio = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const vencimiento = fechaVencimiento();
    await db.run(
      `INSERT INTO suscripciones (usuario_id, fecha_inicio, fecha_vencimiento, estado, modalidad, pasarela)
       VALUES (?, ?, ?, 'activa', 'manual', 'admin')`,
      [usuarioId, inicio, vencimiento]
    );
    await db.run(`UPDATE usuarios SET tipo_cuenta = 'premium' WHERE id = ?`, [usuarioId]);
  } else {
    await db.run(`UPDATE usuarios SET tipo_cuenta = 'gratuita' WHERE id = ?`, [usuarioId]);
  }
}

async function procesarTransiciones() {
  const ahora = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // activa → vencida
  await db.run(
    `UPDATE suscripciones SET estado = 'vencida'
     WHERE estado = 'activa' AND fecha_vencimiento < ?`,
    [ahora]
  );

  // vencida → gracia (30 días)
  await db.run(
    `UPDATE suscripciones SET estado = 'gracia'
     WHERE estado = 'vencida'
       AND fecha_vencimiento < DATE_SUB(?, INTERVAL 30 DAY)`,
    [ahora]
  );

  // gracia → retencion (90 días adicionales = 120 días desde vencimiento)
  await db.run(
    `UPDATE suscripciones SET estado = 'retencion'
     WHERE estado = 'gracia'
       AND fecha_vencimiento < DATE_SUB(?, INTERVAL 120 DAY)`,
    [ahora]
  );

  // Actualizar tipo_cuenta según estado activo
  await db.run(
    `UPDATE usuarios u
     SET u.tipo_cuenta = 'gratuita'
     WHERE u.tipo_cuenta = 'premium'
       AND NOT EXISTS (
         SELECT 1 FROM suscripciones s
         WHERE s.usuario_id = u.id AND s.estado = 'activa'
       )`
  );

  // Eliminar datos de usuarios en retención
  const enRetencion = await db.all(
    `SELECT DISTINCT usuario_id FROM suscripciones
     WHERE estado = 'retencion'
       AND fecha_vencimiento < DATE_SUB(?, INTERVAL 120 DAY)`,
    [ahora]
  );
  for (const { usuario_id } of enRetencion) {
    await db.run('DELETE FROM cotizaciones WHERE usuario_id = ? AND temporal = 0', [usuario_id]);
    await db.run('DELETE FROM clientes WHERE usuario_id = ?', [usuario_id]);
    await db.run('DELETE FROM grupos_clientes WHERE usuario_id = ?', [usuario_id]);
    await db.run(`UPDATE usuarios SET tipo_cuenta = 'gratuita' WHERE id = ?`, [usuario_id]);
  }
}

module.exports = { crear, obtenerEstado, verificarVigencia, cancelarRenovacion, procesarTransiciones, establecerCuentaManual };
