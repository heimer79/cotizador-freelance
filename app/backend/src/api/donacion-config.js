const express = require('express');
const { obtener } = require('../models/configuracion-plataforma');

// Enlaces públicos de donación configurados por el admin (FR-026/FR-027). No expone mercadopago_access_token (sensible, usado para cobrar suscripciones y donaciones vía API).
function crearRutasConfigDonaciones() {
  const router = express.Router();

  router.get('/donaciones', async (req, res, next) => {
    try {
      const [mercadopago, paypal] = await Promise.all([
        obtener('mercadopago_enlace_donacion'),
        obtener('paypal_enlace_donacion')
      ]);
      res.json({
        mercadopago_enlace_donacion: mercadopago || null,
        paypal_enlace_donacion: paypal || null
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = crearRutasConfigDonaciones;
