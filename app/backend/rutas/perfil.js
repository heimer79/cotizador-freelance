const express = require('express');

const REGIMENES = ['ordinario', 'simple', 'no_responsable_iva'];

function aFormatoApi(fila) {
  return {
    nombre: fila.nombre || '',
    nit: fila.nit || '',
    contacto: fila.contacto || '',
    logoBase64: fila.logo_base64 || '',
    regimen: fila.regimen || ''
  };
}

function crearRutasPerfil(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const fila = await db.get('SELECT * FROM perfil WHERE usuario_id = ?', [req.usuario.id]);
    res.json(aFormatoApi(fila || {}));
  });

  router.put('/', async (req, res) => {
    const { nombre, nit, contacto, logoBase64, regimen } = req.body;

    if (regimen && !REGIMENES.includes(regimen)) {
      return res.status(400).json({ error: 'El régimen tributario debe ser ordinario, simple o no responsable de IVA' });
    }
    if (logoBase64 && !String(logoBase64).startsWith('data:image/')) {
      return res.status(400).json({ error: 'El logo debe ser una imagen' });
    }

    await db.run(
      `INSERT INTO perfil (usuario_id, nombre, nit, contacto, logo_base64, regimen)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nombre = VALUES(nombre),
         nit = VALUES(nit),
         contacto = VALUES(contacto),
         logo_base64 = VALUES(logo_base64),
         regimen = VALUES(regimen)`,
      [req.usuario.id, nombre || null, nit || null, contacto || null, logoBase64 || null, regimen || null]
    );

    const guardado = await db.get('SELECT * FROM perfil WHERE usuario_id = ?', [req.usuario.id]);
    res.json(aFormatoApi(guardado));
  });

  return router;
}

module.exports = crearRutasPerfil;
