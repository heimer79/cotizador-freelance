const express = require('express');
const { ESTADOS_MERCADOPAGO } = require('../services/donacion-service');
const { aFormatoApi } = require('../models/donacion');
const { obtener } = require('../models/configuracion-plataforma');

async function obtenerAccessTokenMercadoPago() {
  try {
    return (await obtener('mercadopago_access_token')) || process.env.MERCADOPAGO_ACCESS_TOKEN;
  } catch {
    return process.env.MERCADOPAGO_ACCESS_TOKEN;
  }
}

function crearRutasWebhookDonaciones(db, correo) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const { type, data } = req.body || {};
    if (type !== 'payment' || !data?.id) return res.status(200).end();

    const accessToken = await obtenerAccessTokenMercadoPago();
    if (!accessToken) return res.status(200).end();

    // Consultamos el pago directamente en la API de MercadoPago en vez de confiar en el cuerpo del webhook.
    let pago;
    try {
      const { MercadoPagoConfig, Payment } = require('mercadopago');
      const mpClient = new MercadoPagoConfig({ accessToken });
      const payment = new Payment(mpClient);
      pago = await payment.get({ id: data.id });
    } catch (e) {
      console.error('Webhook donaciones - error consultando el pago:', e.message);
      return res.status(200).end();
    }

    const referencia = pago.external_reference;
    if (!referencia) return res.json({ ok: true, ignorado: true });

    const donacion = await db.get(
      `SELECT d.*, u.email, u.nombre_completo FROM donacion d
       JOIN usuarios u ON u.id = d.profesional_id
       WHERE d.referencia_pasarela = ?`,
      [referencia]
    );
    if (!donacion) return res.json({ ok: true, ignorado: true });
    if (donacion.estado !== 'pendiente') return res.json({ ok: true, ignorado: true });

    const nuevoEstado = ESTADOS_MERCADOPAGO[pago.status];
    if (!nuevoEstado) return res.json({ ok: true, ignorado: true });

    if (nuevoEstado === 'exitosa' && pago.transaction_amount !== donacion.monto) {
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
