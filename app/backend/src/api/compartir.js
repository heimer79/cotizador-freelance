const express = require('express');
const path = require('path');
const fs = require('fs');
const { crear, verificar } = require('../models/enlace-temporal');

const PDF_DIR = path.join(__dirname, '../../datos/pdfs-temporales');

function crearRutasCrearEnlace(db, requiereSesion, verificarPremiumMw) {
  const router = express.Router();

  router.post('/', requiereSesion, verificarPremiumMw, async (req, res) => {
    const { pdfBase64, cotizacionId, nombre } = req.body;
    if (!pdfBase64 || !cotizacionId) {
      return res.status(400).json({ error: 'pdfBase64 y cotizacionId son obligatorios' });
    }

    const cotizacion = await db.get(
      'SELECT id, numero FROM cotizaciones WHERE id = ? AND usuario_id = ?',
      [cotizacionId, req.usuario.id]
    );
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada' });

    if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

    const nombreArchivo = nombre || `cotizacion-${cotizacion.numero}.pdf`;
    const rutaRelativa = path.join('datos/pdfs-temporales', `${Date.now()}-${nombreArchivo}`);
    const rutaAbsoluta = path.join(__dirname, '../../', rutaRelativa);

    const buffer = Buffer.from(pdfBase64.replace(/^data:application\/pdf;base64,/, ''), 'base64');
    fs.writeFileSync(rutaAbsoluta, buffer);

    const enlace = await crear({ usuarioId: req.usuario.id, rutaPdf: rutaRelativa });
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    res.json({ url: `${appUrl}/compartir/${enlace.token}`, expira: enlace.expira });
  });

  return router;
}

function crearRutasAccesoEnlace() {
  const router = express.Router();

  router.get('/:token', async (req, res) => {
    const enlace = await verificar(req.params.token);
    if (!enlace) {
      return res.status(410).sendFile(
        path.join(__dirname, '../../../public', 'enlace-expirado.html'),
        (err) => {
          if (err) res.status(410).send('<h1>Enlace expirado</h1><p>Este enlace de cotización ya no está disponible.</p>');
        }
      );
    }

    const rutaAbsoluta = path.join(__dirname, '../../', enlace.ruta_pdf);
    if (!fs.existsSync(rutaAbsoluta)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(rutaAbsoluta)}"`);
    res.sendFile(rutaAbsoluta);
  });

  return router;
}

module.exports = { crearRutasCrearEnlace, crearRutasAccesoEnlace };
