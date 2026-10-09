const express = require('express');
const { obtenerActivos, obtenerPorTipo, verificarAceptacion, registrarAceptacion } = require('../models/documento-legal');

function crearRutasLegal(requiereSesion) {
  const router = express.Router();

  // T049: Endpoint público para documento unificado (FR-035)
  router.get('/unificado', async (req, res) => {
    try {
      const doc = await obtenerPorTipo('unificado');
      if (!doc) return res.status(404).json({ error: 'Documento unificado no disponible' });
      res.json({ documento: doc });
    } catch (e) {
      res.status(500).json({ error: 'Error al obtener documento' });
    }
  });

  router.get('/documentos', async (req, res) => {
    try {
      const docs = await obtenerActivos();
      res.json({ documentos: docs });
    } catch (e) {
      console.error('[legal] GET /documentos:', e);
      res.status(500).json({ error: 'Error al obtener documentos legales' });
    }
  });

  router.get('/documentos/:tipo', async (req, res) => {
    try {
      const doc = await obtenerPorTipo(req.params.tipo);
      if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
      res.json({ documento: doc });
    } catch (e) {
      console.error('[legal] GET /documentos/:tipo:', e);
      res.status(500).json({ error: 'Error al obtener el documento' });
    }
  });

  router.post('/aceptar', requiereSesion, async (req, res) => {
    try {
      const { documentoIds } = req.body;
      if (!Array.isArray(documentoIds) || documentoIds.length === 0) {
        return res.status(400).json({ error: 'documentoIds debe ser un array no vacío' });
      }
      await registrarAceptacion(req.usuario.id, documentoIds);
      res.json({ ok: true });
    } catch (e) {
      console.error('[legal] POST /aceptar:', e);
      res.status(500).json({ error: 'Error al registrar aceptación' });
    }
  });

  router.get('/estado', requiereSesion, async (req, res) => {
    try {
      const { pendientes } = await verificarAceptacion(req.usuario.id);
      res.json({ pendientes });
    } catch (e) {
      console.error('[legal] GET /estado:', e);
      res.status(500).json({ error: 'Error al verificar estado legal' });
    }
  });

  return router;
}

module.exports = crearRutasLegal;
