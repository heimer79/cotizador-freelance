const { db } = require('../../db');

async function obtenerActivos() {
  return db.all('SELECT id, tipo, version, titulo, fecha_publicacion FROM documentos_legales WHERE activo = 1 ORDER BY tipo');
}

async function obtenerPorTipo(tipo) {
  return db.get('SELECT * FROM documentos_legales WHERE tipo = ? AND activo = 1', [tipo]);
}

async function verificarAceptacion(usuarioId) {
  const activos = await obtenerActivos();
  if (activos.length === 0) return { pendientes: [] };

  const aceptados = await db.all(
    `SELECT dl.tipo, al.documento_id
     FROM aceptaciones_legales al
     JOIN documentos_legales dl ON dl.id = al.documento_id
     WHERE al.usuario_id = ? AND dl.activo = 1`,
    [usuarioId]
  );

  const tiposAceptados = new Set(aceptados.map((a) => a.tipo));
  const pendientes = activos.filter((d) => !tiposAceptados.has(d.tipo));
  return { pendientes };
}

async function registrarAceptacion(usuarioId, documentoIds) {
  for (const docId of documentoIds) {
    await db.run(
      `INSERT INTO aceptaciones_legales (usuario_id, documento_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE fecha_aceptacion = CURRENT_TIMESTAMP`,
      [usuarioId, docId]
    );
  }
}

module.exports = { obtenerActivos, obtenerPorTipo, verificarAceptacion, registrarAceptacion };
