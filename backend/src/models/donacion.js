// Tabla y acceso a datos de donaciones (data-model.md, entidad Donacion).
function crearEsquemaDonaciones(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS donacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profesional_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      monto INTEGER NOT NULL CHECK (monto >= 2000 AND monto <= 500000),
      estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'exitosa', 'fallida', 'cancelada')),
      referencia_pasarela TEXT UNIQUE,
      pasarela TEXT NOT NULL,
      fecha_creacion TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      fecha_confirmacion TEXT,
      email_enviado INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_donacion_profesional_fecha ON donacion (profesional_id, fecha_creacion);
    CREATE INDEX IF NOT EXISTS idx_donacion_referencia ON donacion (referencia_pasarela);
  `);
}

function aFormatoApi(fila) {
  return {
    id: fila.id,
    monto: fila.monto,
    estado: fila.estado,
    referencia_pasarela: fila.referencia_pasarela,
    fecha_creacion: fila.fecha_creacion,
    fecha_confirmacion: fila.fecha_confirmacion
  };
}

module.exports = { crearEsquemaDonaciones, aFormatoApi };
