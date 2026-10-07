const crypto = require('crypto');
const express = require('express');
const { ESTADOS_WOMPI } = require('../services/donacion-service');
const { aFormatoApi } = require('../models/donacion');

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

    const donacion = await db.get(
      `SELECT d.*, u.email, u.nombre_completo FROM donacion d
       JOIN usuarios u ON u.id = d.profesional_id
       WHERE d.referencia_pasarela = ?`,
      [transaccion.reference]
    );
    if (!donacion) return res.json({ ok: true, ignorado: true });

    if (donacion.estado !== 'pendiente') return res.json({ ok: true, ignorado: true });

    const nuevoEstado = ESTADOS_WOMPI[transaccion.status];
    if (!nuevoEstado) return res.json({ ok: true, ignorado: true });

    if (nuevoEstado === 'exitosa' && transaccion.amount_in_cents !== donacion.monto * 100) {
      return res.status(400).json({ error: 'El monto no coincide con la donación' });
    }

    const ahora = new Date().toISOString();
    await db.run(
      `UPDATE donacion SET estado = ?, fecha_confirmacion = ? WHERE id = ? AND estado = 'pendiente'`,
      [nuevoEstado, ahora, donacion.id]
    );

    if (nuevoEstado === 'exitosa' && !donacion.email_enviado) {
      try {
        await correo.enviarConfirmacionDonacion({
          para: donacion.email,
          nombre: donacion.nombre_completo,
          monto: donacion.monto,
          referencia: donacion.referencia_pasarela,
          fecha: ahora
        });
        await db.run('UPDATE donacion SET email_enviado = 1 WHERE id = ?', [donacion.id]);
      } catch (error) {
        console.error('No se pudo enviar la confirmación de donación:', error.message);
      }
    }

    const actualizada = await db.get('SELECT * FROM donacion WHERE id = ?', [donacion.id]);
    res.json({ ok: true, donacion: aFormatoApi(actualizada) });
  });

  return router;
}

module.exports = crearRutasWebhookDonaciones;
