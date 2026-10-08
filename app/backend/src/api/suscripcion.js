const express = require('express');
const crypto = require('crypto');
const { crear, obtenerEstado, cancelarRenovacion } = require('../models/suscripcion');
const { registrarNotificacion } = require('../models/notificacion');
const { obtener } = require('../models/configuracion-plataforma');

function crearRutasSuscripcion(db, requiereSesion, verificarPremiumMw, correo) {
  const router = express.Router();

  router.post('/crear', requiereSesion, async (req, res) => {
    const { modalidad = 'automatica' } = req.body;

    let accessToken;
    try {
      accessToken = await obtener('mercadopago_access_token') || process.env.MERCADOPAGO_ACCESS_TOKEN;
    } catch {
      accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    }

    if (!accessToken) {
      return res.status(503).json({ error: 'Servicio de pago temporalmente no disponible' });
    }

    try {
      const { MercadoPagoConfig, Preference } = require('mercadopago');
      const mpClient = new MercadoPagoConfig({ accessToken });
      const pref = new Preference(mpClient);

      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const preferencia = await pref.create({
        body: {
          items: [{ title: 'PresupuestosPro Premium (1 año)', quantity: 1, unit_price: 20, currency_id: 'USD' }],
          back_urls: {
            success: `${appUrl}/?suscripcion=ok`,
            failure: `${appUrl}/?suscripcion=error`,
            pending: `${appUrl}/?suscripcion=pendiente`
          },
          notification_url: `${appUrl}/api/suscripcion/webhook`,
          metadata: { usuario_id: req.usuario.id, modalidad }
        }
      });

      res.json({ urlPago: preferencia.init_point, preferenceId: preferencia.id });
    } catch (e) {
      await registrarNotificacion({ tipo: 'pago_fallido', titulo: 'Error al crear preferencia MercadoPago', descripcion: e.message }).catch(() => {});
      res.status(503).json({ error: 'Servicio de pago temporalmente no disponible' });
    }
  });

  router.post('/webhook', async (req, res) => {
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return res.status(200).end();

    try {
      let accessToken;
      try {
        accessToken = await obtener('mercadopago_access_token') || process.env.MERCADOPAGO_ACCESS_TOKEN;
      } catch {
        accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      }

      if (!accessToken) return res.status(200).end();

      const { MercadoPagoConfig, Payment } = require('mercadopago');
      const mpClient = new MercadoPagoConfig({ accessToken });
      const payment = new Payment(mpClient);
      const pago = await payment.get({ id: data.id });

      if (pago.status === 'approved') {
        const meta = pago.metadata || {};
        const usuarioId = meta.usuario_id;
        const modalidad = meta.modalidad || 'automatica';

        if (usuarioId) {
          await crear({ usuarioId, modalidad, referencia: String(data.id) });
          const usuario = await db.get('SELECT email, nombre_completo FROM usuarios WHERE id = ?', [usuarioId]);
          if (usuario && correo) {
            await correo.enviar({
              para: usuario.email,
              asunto: 'Tu suscripción Premium está activa — PresupuestosPro',
              texto: `Hola ${usuario.nombre_completo}, tu suscripción Premium está activa por 1 año. Gracias por tu apoyo.`,
              html: `<p>Hola ${usuario.nombre_completo},</p><p>Tu suscripción Premium está activa por 1 año. Gracias por tu apoyo.</p>`
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error('Webhook error:', e.message);
    }

    res.status(200).end();
  });

  router.post('/cancelar', requiereSesion, async (req, res) => {
    await cancelarRenovacion(req.usuario.id);
    res.json({ ok: true });
  });

  router.get('/estado', requiereSesion, async (req, res) => {
    const estado = await obtenerEstado(req.usuario.id);
    res.json(estado || { estado: 'sin_suscripcion' });
  });

  return router;
}

module.exports = crearRutasSuscripcion;
