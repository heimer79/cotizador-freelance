const fs = require('fs');
const path = require('path');
const express = require('express');
const { obtener } = require('../models/configuracion-plataforma');

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

// Los espacios de tipo adsense (o con fallback adsense) reciben su Slot ID desde
// la configuración guardada en el panel admin, no desde el JSON estático (FR-008).
async function conSlotsGuardados(espacios) {
  return Promise.all(
    espacios.map(async (espacio) => {
      if (espacio.tipo !== 'adsense' && espacio.fallback !== 'adsense') return espacio;
      const slotGuardado = await obtener(`adsense_slot__${espacio.id}`);
      return { ...espacio, adsense_slot: slotGuardado || espacio.adsense_slot || null };
    })
  );
}

function crearRutasConfigAds() {
  const router = express.Router();

  router.get('/ads', async (req, res, next) => {
    try {
      const [espacios, adsenseIdGuardado] = await Promise.all([
        conSlotsGuardados(leerEspacios()),
        obtener('adsense_id')
      ]);
      res.json({
        espacios,
        adsense_client_id: adsenseIdGuardado || process.env.ADSENSE_CLIENT_ID || null
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = crearRutasConfigAds;
