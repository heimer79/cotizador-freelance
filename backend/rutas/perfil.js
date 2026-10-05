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

  router.get('/', (req, res) => {
    const fila = db.prepare('SELECT * FROM perfil WHERE usuario_id = ?').get(req.usuario.id);
    res.json(aFormatoApi(fila || {}));
  });

  router.put('/', (req, res) => {
    const { nombre, nit, contacto, logoBase64, regimen } = req.body;

    if (regimen && !REGIMENES.includes(regimen)) {
      return res.status(400).json({ error: 'El régimen tributario debe ser ordinario, simple o no responsable de IVA' });
    }
    if (logoBase64 && !String(logoBase64).startsWith('data:image/')) {
      return res.status(400).json({ error: 'El logo debe ser una imagen' });
    }

    db.prepare(
      `INSERT INTO perfil (usuario_id, nombre, nit, contacto, logo_base64, regimen)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(usuario_id) DO UPDATE SET
         nombre = excluded.nombre,
         nit = excluded.nit,
         contacto = excluded.contacto,
         logo_base64 = excluded.logo_base64,
         regimen = excluded.regimen`
    ).run(req.usuario.id, nombre || null, nit || null, contacto || null, logoBase64 || null, regimen || null);

    const guardado = db.prepare('SELECT * FROM perfil WHERE usuario_id = ?').get(req.usuario.id);
    res.json(aFormatoApi(guardado));
  });

  return router;
}

module.exports = crearRutasPerfil;
