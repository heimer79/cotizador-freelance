const crypto = require('crypto');

const MONTO_MINIMO = 2000;
const MONTO_MAXIMO = 500000;
const MAX_DONACIONES_DIA = 3;
const MAX_MONTO_DIA = 200000;
const ZONA_HORARIA = 'America/Bogota';
const DESFASE_UTC_HORAS = 5;

class LimiteDonacionError extends Error {}
class MontoDonacionError extends Error {}

function diaBogota(fecha) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(fecha);
}

function rangoDiaBogota(fecha) {
  const inicio = new Date(`${diaBogota(fecha)}T${String(DESFASE_UTC_HORAS).padStart(2, '0')}:00:00.000Z`);
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  return { inicio: inicio.toISOString(), fin: fin.toISOString() };
}

function validarMonto(monto) {
  if (!Number.isInteger(monto) || monto < MONTO_MINIMO || monto > MONTO_MAXIMO) {
    throw new MontoDonacionError('El monto debe estar entre $2.000 y $500.000 COP.');
  }
}

async function crearDonacion(db, { profesionalId, monto, referencia, ahora = new Date() }) {
  validarMonto(monto);

  const { inicio, fin } = rangoDiaBogota(ahora);
  return db.transaction(async (tx) => {
    const resumen = await tx.get(
      `SELECT COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS acumulado
       FROM donacion
       WHERE profesional_id = ? AND estado IN ('pendiente', 'exitosa')
         AND fecha_creacion >= ? AND fecha_creacion < ?`,
      [profesionalId, inicio, fin]
    );

    if (resumen.cantidad >= MAX_DONACIONES_DIA) {
      throw new LimiteDonacionError('Has alcanzado el límite de donaciones por hoy. Podrás donar nuevamente mañana.');
    }
    if (resumen.acumulado + monto > MAX_MONTO_DIA) {
      throw new LimiteDonacionError('Has alcanzado el límite de donaciones por hoy. Podrás donar nuevamente mañana.');
    }

    const resultado = await tx.run(
      `INSERT INTO donacion (profesional_id, monto, estado, referencia_pasarela, pasarela, fecha_creacion)
       VALUES (?, ?, 'pendiente', ?, 'wompi', ?)`,
      [profesionalId, monto, referencia, ahora.toISOString()]
    );

    return tx.get('SELECT * FROM donacion WHERE id = ?', [resultado.insertId]);
  });
}

function generarReferencia() {
  return `DON-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

const ESTADOS_WOMPI = {
  APPROVED: 'exitosa',
  DECLINED: 'fallida',
  ERROR: 'fallida',
  VOIDED: 'cancelada'
};

function enlaceCheckoutWompi({ publicKey, integritySecret, monto, referencia, urlRetorno }) {
  const montoEnCentavos = monto * 100;
  const firma = crypto
    .createHash('sha256')
    .update(`${referencia}${montoEnCentavos}COP${integritySecret}`)
    .digest('hex');

  const parametros = new URLSearchParams({
    'public-key': publicKey,
    currency: 'COP',
    'amount-in-cents': String(montoEnCentavos),
    reference: referencia,
    'signature:integrity': firma,
    'redirect-url': urlRetorno
  });
  return `https://checkout.wompi.co/p/?${parametros.toString()}`;
}

async function listarDonaciones(db, profesionalId, pagina, porPagina) {
  const totalRow = await db.get('SELECT COUNT(*) AS total FROM donacion WHERE profesional_id = ?', [profesionalId]);
  const total = totalRow ? totalRow.total : 0;
  const filas = await db.all(
    `SELECT * FROM donacion WHERE profesional_id = ? ORDER BY fecha_creacion DESC, id DESC LIMIT ? OFFSET ?`,
    [profesionalId, porPagina, (pagina - 1) * porPagina]
  );
  return { filas, total };
}

module.exports = {
  MONTO_MINIMO,
  MONTO_MAXIMO,
  MAX_DONACIONES_DIA,
  MAX_MONTO_DIA,
  LimiteDonacionError,
  MontoDonacionError,
  diaBogota,
  rangoDiaBogota,
  crearDonacion,
  generarReferencia,
  ESTADOS_WOMPI,
  enlaceCheckoutWompi,
  listarDonaciones
};
