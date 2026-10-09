const express = require('express');
const {
  MONTO_MAXIMO,
  LimiteDonacionError,
  MontoDonacionError,
  crearDonacion,
  generarReferencia,
  listarDonaciones
} = require('../services/donacion-service');
const { aFormatoApi } = require('../models/donacion');
const { obtener } = require('../models/configuracion-plataforma');

async function obtenerAccessTokenMercadoPago() {
  try {
    return (await obtener('mercadopago_access_token')) || process.env.MERCADOPAGO_ACCESS_TOKEN;
  } catch {
    return process.env.MERCADOPAGO_ACCESS_TOKEN;
  }
}

function crearRutasDonaciones(db) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const monto = req.body.monto;

    const accessToken = await obtenerAccessTokenMercadoPago();
    if (!accessToken) {
      return res.status(503).json({
        error: 'La pasarela de pagos no está disponible en este momento. Intenta más tarde.'
      });
    }

    let donacion;
    try {
      donacion = await crearDonacion(db, {
        profesionalId: req.usuario.id,
        monto,
        referencia: generarReferencia()
      });
    } catch (error) {
      if (error instanceof MontoDonacionError) return res.status(400).json({ error: error.message });
      if (error instanceof LimiteDonacionError) return res.status(429).json({ error: error.message });
      throw error;
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const urlRetorno = `${appUrl}/?donacion=${donacion.id}`;

    try {
      const { MercadoPagoConfig, Preference } = require('mercadopago');
      const mpClient = new MercadoPagoConfig({ accessToken });
      const pref = new Preference(mpClient);

      const preferencia = await pref.create({
        body: {
          items: [{ title: 'Donación a PresupuestosPro', quantity: 1, unit_price: donacion.monto, currency_id: 'COP' }],
          external_reference: donacion.referencia_pasarela,
          back_urls: { success: urlRetorno, failure: urlRetorno, pending: urlRetorno },
          notification_url: `${appUrl}/api/donaciones/webhook`
        }
      });

      res.status(201).json({
        donacion_id: donacion.id,
        monto: donacion.monto,
        estado: donacion.estado,
        checkout_url: preferencia.init_point,
        fecha_creacion: donacion.fecha_creacion
      });
    } catch (e) {
      console.error('Error creando preferencia de MercadoPago:', {
        status: e.status,
        error: e.error,
        message: e.message,
        causes: e.causes
      });
      await db.run(`UPDATE donacion SET estado = 'fallida' WHERE id = ?`, [donacion.id]).catch(() => {});
      res.status(503).json({ error: 'La pasarela de pagos no está disponible en este momento. Intenta más tarde.' });
    }
  });

  router.get('/', async (req, res) => {
    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const porPagina = Math.min(50, Math.max(1, parseInt(req.query.por_pagina, 10) || 20));

    const { filas, total } = await listarDonaciones(db, req.usuario.id, pagina, porPagina);
    res.json({ donaciones: filas.map(aFormatoApi), total, pagina, por_pagina: porPagina });
  });

  return router;
}

module.exports = { crearRutasDonaciones, MONTO_MAXIMO };
