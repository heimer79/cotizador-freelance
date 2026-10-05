const express = require('express');
const {
  MONTO_MAXIMO,
  LimiteDonacionError,
  MontoDonacionError,
  crearDonacion,
  generarReferencia,
  enlaceCheckoutWompi,
  listarDonaciones
} = require('../services/donacion-service');
const { aFormatoApi } = require('../models/donacion');

function configuracionWompi() {
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!publicKey || !integritySecret) return null;
  return { publicKey, integritySecret };
}

function crearRutasDonaciones(db) {
  const router = express.Router();

  router.post('/', (req, res) => {
    const monto = req.body.monto;

    const wompi = configuracionWompi();
    if (!wompi) {
      return res.status(503).json({
        error: 'La pasarela de pagos no está disponible en este momento. Intenta más tarde.'
      });
    }

    let donacion;
    try {
      donacion = crearDonacion(db, {
        profesionalId: req.usuario.id,
        monto,
        referencia: generarReferencia()
      });
    } catch (error) {
      if (error instanceof MontoDonacionError) return res.status(400).json({ error: error.message });
      if (error instanceof LimiteDonacionError) return res.status(429).json({ error: error.message });
      throw error;
    }

    const urlRetorno = `${process.env.APP_URL || 'http://localhost:3000'}/?donacion=${donacion.id}`;
    const checkoutUrl = enlaceCheckoutWompi({
      ...wompi,
      monto: donacion.monto,
      referencia: donacion.referencia_pasarela,
      urlRetorno
    });

    res.status(201).json({
      donacion_id: donacion.id,
      monto: donacion.monto,
      estado: donacion.estado,
      checkout_url: checkoutUrl,
      fecha_creacion: donacion.fecha_creacion
    });
  });

  router.get('/', (req, res) => {
    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const porPagina = Math.min(50, Math.max(1, parseInt(req.query.por_pagina, 10) || 20));

    const { filas, total } = listarDonaciones(db, req.usuario.id, pagina, porPagina);
    res.json({ donaciones: filas.map(aFormatoApi), total, pagina, por_pagina: porPagina });
  });

  return router;
}

module.exports = { crearRutasDonaciones, MONTO_MAXIMO };
