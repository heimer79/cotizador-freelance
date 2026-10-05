const fs = require('fs');
const path = require('path');
const express = require('express');

// Lee ads-config.json en cada petición: editar el fichero basta, sin redeploy (FR-008).
const RUTA_CONFIG = path.join(__dirname, '..', 'config', 'ads-config.json');

function leerEspacios() {
  const contenido = JSON.parse(fs.readFileSync(RUTA_CONFIG, 'utf8'));
  return contenido.espacios.map((espacio) => ({
    ...espacio,
    activo: espacio.activo !== false,
    anunciante: espacio.tipo === 'pauta_directa' ? espacio.anunciante || null : null,
    fallback: espacio.fallback || 'adsense'
  }));
}

function crearRutasConfigAds() {
  const router = express.Router();

  router.get('/ads', (req, res, next) => {
    try {
      res.json({
        espacios: leerEspacios(),
        adsense_client_id: process.env.ADSENSE_CLIENT_ID || null
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = crearRutasConfigAds;
