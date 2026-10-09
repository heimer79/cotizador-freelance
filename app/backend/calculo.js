const TARIFAS_IVA = [0, 5, 19];

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

/**
 * Calcula todos los impuestos colombianos sobre una cotización.
 * Fuente de verdad única para backend y frontend (T010).
 *
 * @param {object} params
 * @param {Array<{cantidad: number, precioUnitario: number}>} params.lineas
 * @param {number}  params.ivaTarifa           - 0 o 19 (porcentaje)
 * @param {boolean} params.ivaResponsable       - si el emisor es responsable de IVA
 * @param {boolean} params.retencionActivada
 * @param {number}  params.retencionPorcentaje  - 4, 6, 10, 11 o personalizado
 * @param {boolean} params.reteivaActivada
 * @param {number}  params.reteivaPorcentaje    - % sobre monto IVA (típicamente 15)
 * @param {boolean} params.reteicaActivada
 * @param {number}  params.reteicaPorcentaje    - % por municipio
 * @param {boolean} params.compensarRetencion   - ajustar precio para absorber retención
 */
function calcularTotales({
  lineas,
  ivaTarifa = 0,
  ivaResponsable = true,
  retencionActivada = false,
  retencionPorcentaje = 0,
  reteivaActivada = false,
  reteivaPorcentaje = 15,
  reteicaActivada = false,
  reteicaPorcentaje = 0,
  compensarRetencion = false
}) {
  if (!lineas || lineas.length === 0) {
    return { baseGravable: 0, iva: 0, retencion: 0, reteiva: 0, reteica: 0, compensacion: 0, totalNeto: 0 };
  }

  let baseGravable;
  let compensacion = 0;

  if (compensarRetencion && retencionActivada && retencionPorcentaje > 0) {
    // Ajustar precio unitario para que el neto recibido cubra el precio original
    const factor = 1 - retencionPorcentaje / 100;
    const baseOriginal = lineas.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
    baseGravable = baseOriginal / factor;
    compensacion = redondear(baseGravable - baseOriginal);
    baseGravable = redondear(baseGravable);
  } else {
    baseGravable = redondear(calcularBaseGravable(lineas));
  }

  const tarifaIva = ivaResponsable ? (ivaTarifa || 0) : 0;
  const ivaExacto = (baseGravable * tarifaIva) / 100;
  const retencionExacta = retencionActivada ? (baseGravable * retencionPorcentaje) / 100 : 0;
  const reteivaExacto = reteivaActivada ? (ivaExacto * reteivaPorcentaje) / 100 : 0;
  const reteicaExacto = reteicaActivada ? (baseGravable * reteicaPorcentaje) / 100 : 0;

  const iva = redondear(ivaExacto);
  const retencion = redondear(retencionExacta);
  const reteiva = redondear(reteivaExacto);
  const reteica = redondear(reteicaExacto);

  const totalNeto = baseGravable + iva - retencion - reteiva - reteica;

  return {
    baseGravable,
    iva,
    retencion,
    reteiva,
    reteica,
    compensacion,
    totalNeto: redondear(totalNeto)
  };
}

module.exports = {
  TARIFAS_IVA,
  CONCEPTOS_RETENCION,
  redondear,
  calcularBaseGravable,
  validarRetencion,
  calcularCotizacion,
  calcularTotales
};
