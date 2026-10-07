const crypto = require('crypto');
const express = require('express');
const { ESTADOS_WOMPI } = require('../services/donacion-service');
const { aFormatoApi } = require('../models/donacion');

// Wompi firma los eventos: SHA-256 de los valores de `signature.properties` (en orden),
// seguidos de `timestamp` y del secreto de integridad.
function firmaValida(cuerpo, secreto) {
  const firma = cuerpo.signature;
  if (!firma || !Array.isArray(firma.properties) || typeof firma.checksum !== 'string') return false;

  const valores = firma.properties.map((ruta) =>
    ruta.split('.').reduce((obj, clave) => (obj ? obj[clave] : undefined), cuerpo.data)
  );
  if (valores.some((v) => v === undefined)) return false;

  const esperado = crypto
    .createHash('sha256')
    .update(`${valores.join('')}${cuerpo.timestamp}${secreto}`)
    .digest('hex');

  const a = Buffer.from(esperado);
  const b = Buffer.from(firma.checksum);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function crearRutasWebhookDonaciones(db, correo) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const secreto = process.env.WOMPI_INTEGRITY_SECRET;
    if (!secreto) return res.status(503).json({ error: 'Webhook no configurado' });

    const cuerpo = req.body || {};
    if (!firmaValida(cuerpo, secreto)) {
      return res.status(400).json({ error: 'Firma inválida' });
    }

    const transaccion = cuerpo.data && cuerpo.data.transaction;
    if (!transaccion || !transaccion.reference) {
      return res.status(400).json({ error: 'Payload no reconocido' });
    }

    const donacion = db
      .prepare(
        `SELECT d.*, u.email, u.nombre_completo FROM donacion d
         JOIN usuarios u ON u.id = d.profesional_id
         WHERE d.referencia_pasarela = ?`
      )
      .get(transaccion.reference);
    if (!donacion) return res.json({ ok: true, ignorado: true });

    // Idempotencia: solo se procesan donaciones aún pendientes.
    if (donacion.estado !== 'pendiente') return res.json({ ok: true, ignorado: true });

    const nuevoEstado = ESTADOS_WOMPI[transaccion.status];
    if (!nuevoEstado) return res.json({ ok: true, ignorado: true });

    if (nuevoEstado === 'exitosa' && transaccion.amount_in_cents !== donacion.monto * 100) {
      return res.status(400).json({ error: 'El monto no coincide con la donación' });
    }

    const ahora = new Date().toISOString();
    db.prepare(
      `UPDATE donacion SET estado = ?, fecha_confirmacion = ? WHERE id = ? AND estado = 'pendiente'`
    ).run(nuevoEstado, ahora, donacion.id);

    if (nuevoEstado === 'exitosa' && !donacion.email_enviado) {
      try {
        await correo.enviarConfirmacionDonacion({
          para: donacion.email,
          nombre: donacion.nombre_completo,
          monto: donacion.monto,
          referencia: donacion.referencia_pasarela,
          fecha: ahora
        });
        db.prepare('UPDATE donacion SET email_enviado = 1 WHERE id = ?').run(donacion.id);
      } catch (error) {
        // El pago ya está confirmado; un fallo de correo no debe provocar reintentos de Wompi.
        console.error('No se pudo enviar la confirmación de donación:', error.message);
      }
    }

    const actualizada = db.prepare('SELECT * FROM donacion WHERE id = ?').get(donacion.id);
    res.json({ ok: true, donacion: aFormatoApi(actualizada) });
  });

  return router;
}

module.exports = crearRutasWebhookDonaciones;
