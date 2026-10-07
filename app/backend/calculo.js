const TARIFAS_IVA = [19, 5, 0];

// Porcentajes de retención en la fuente por concepto (FR-029).
const CONCEPTOS_RETENCION = {
  honorarios: [10, 11],
  servicios: [4, 6],
  compras: [2.5, 3.5]
};

// Único punto de redondeo: se aplica sobre los totales agregados (FR-013).
function redondear(valor) {
  return Math.round(valor);
}

function calcularBaseGravable(lineas) {
  if (!lineas || lineas.length === 0) return 0;
  return lineas.reduce((suma, linea) => suma + linea.cantidad * linea.precioUnitario, 0);
}

// Devuelve un mensaje en español si la combinación no es válida; null si lo es.
function validarRetencion({ tipoCliente, agenteRetenedor, activada, concepto, porcentaje }) {
  if (!activada) return null;

  if (tipoCliente !== 'persona_juridica' && tipoCliente !== 'persona_natural') {
    return 'El tipo de cliente debe ser persona natural o persona jurídica';
  }
  if (!agenteRetenedor) {
    return 'Este cliente no es agente retenedor, por eso no se le puede aplicar retención en la fuente.';
  }
  const porcentajesValidos = CONCEPTOS_RETENCION[concepto];
  if (!porcentajesValidos) {
    return 'El concepto de retención no es válido';
  }
  if (!porcentajesValidos.includes(porcentaje)) {
    return `El porcentaje de retención para ${concepto} debe ser ${porcentajesValidos.join(' % o ')} %`;
  }
  return null;
}

function calcularCotizacion({ lineas, ivaTarifa, retencionActivada, retencionPorcentaje }) {
  const baseGravable = calcularBaseGravable(lineas);
  const ivaExacto = (baseGravable * ivaTarifa) / 100;
  const retencionExacta = retencionActivada ? (baseGravable * retencionPorcentaje) / 100 : 0;
  const totalExacto = baseGravable + ivaExacto - retencionExacta;

  return {
    baseGravable: redondear(baseGravable),
    iva: redondear(ivaExacto),
    retencion: redondear(retencionExacta),
    total: redondear(totalExacto)
  };
}

module.exports = {
  TARIFAS_IVA,
  CONCEPTOS_RETENCION,
  redondear,
  calcularBaseGravable,
  validarRetencion,
  calcularCotizacion
};
