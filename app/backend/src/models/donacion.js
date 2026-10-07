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

module.exports = { aFormatoApi };
