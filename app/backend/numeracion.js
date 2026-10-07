async function ejecutarNumeracion(runner, usuarioId, anio) {
  const fila = await runner.get(
    'SELECT ultimo_numero FROM contador_cotizaciones WHERE usuario_id = ? AND anio = ?',
    [usuarioId, anio]
  );
  const num = fila ? fila.ultimo_numero + 1 : 1;

  if (fila) {
    await runner.run(
      'UPDATE contador_cotizaciones SET ultimo_numero = ? WHERE usuario_id = ? AND anio = ?',
      [num, usuarioId, anio]
    );
  } else {
    await runner.run(
      'INSERT INTO contador_cotizaciones (usuario_id, anio, ultimo_numero) VALUES (?, ?, ?)',
      [usuarioId, anio, num]
    );
  }

  return num;
}

async function siguienteNumero(dbOrTx, usuarioId, fecha) {
  const anio = String(fecha.getFullYear());

  const siguiente = dbOrTx.transaction
    ? await dbOrTx.transaction(async (tx) => ejecutarNumeracion(tx, usuarioId, anio))
    : await ejecutarNumeracion(dbOrTx, usuarioId, anio);

  return `${anio}-${String(siguiente).padStart(3, '0')}`;
}

module.exports = { siguienteNumero };
