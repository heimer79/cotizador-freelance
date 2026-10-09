// Mirror del módulo backend app/backend/calculo.js para uso en frontend.
// Fuente de verdad única: ambos producen resultados idénticos para los mismos inputs (FR-011, SC-003).

export const TARIFAS_IVA = [0, 5, 19];

export const CONCEPTOS_RETENCION = {
  honorarios: [10, 11],
  servicios: [4, 6],
  compras: [2.5, 3.5]
};

export function redondear(valor) {
  return Math.round(valor);
}

export function calcularBaseGravable(lineas) {
  if (!lineas || lineas.length === 0) return 0;
  return lineas.reduce((suma, linea) => suma + linea.cantidad * linea.precioUnitario, 0);
}

/**
 * Calcula todos los impuestos colombianos sobre una cotización.
 *
 * @param {object} params
 * @param {Array<{cantidad: number, precioUnitario: number}>} params.lineas
 * @param {number}  params.ivaTarifa
 * @param {boolean} params.ivaResponsable
 * @param {boolean} params.retencionActivada
 * @param {number}  params.retencionPorcentaje
 * @param {boolean} params.reteivaActivada
 * @param {number}  params.reteivaPorcentaje
 * @param {boolean} params.reteicaActivada
 * @param {number}  params.reteicaPorcentaje
 * @param {boolean} params.compensarRetencion
 */
export function calcularTotales({
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
