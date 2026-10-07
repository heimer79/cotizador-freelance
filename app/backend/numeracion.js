// Numeración AAAA-NNN por usuario y año natural (FR-007).
// El contador nunca retrocede, así que el número de un borrador eliminado no se reutiliza (FR-014c).
function siguienteNumero(db, usuarioId, fecha) {
  const anio = String(fecha.getFullYear());

  const transaccion = db.transaction(() => {
    const fila = db
      .prepare('SELECT ultimo_numero FROM contador_cotizaciones WHERE usuario_id = ? AND anio = ?')
      .get(usuarioId, anio);
    const siguiente = fila ? fila.ultimo_numero + 1 : 1;

    if (fila) {
      db.prepare('UPDATE contador_cotizaciones SET ultimo_numero = ? WHERE usuario_id = ? AND anio = ?').run(
        siguiente,
        usuarioId,
        anio
      );
    } else {
      db.prepare('INSERT INTO contador_cotizaciones (usuario_id, anio, ultimo_numero) VALUES (?, ?, ?)').run(
        usuarioId,
        anio,
        siguiente
      );
    }

    return siguiente;
  });

  const numero = transaccion();
  return `${anio}-${String(numero).padStart(3, '0')}`;
}

module.exports = { siguienteNumero };
