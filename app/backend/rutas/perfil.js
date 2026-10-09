const express = require('express');
const { obtenerRecientes } = require('../src/models/historial-actividad');

const REGIMENES = ['ordinario', 'simple', 'no_responsable_iva'];
const TIPOS_EMISOR = ['persona_natural', 'persona_juridica'];

function aFormatoApi(fila) {
  return {
    nombre: fila.nombre || '',
    nit: fila.nit || '',
    contacto: fila.contacto || '',
    logoBase64: fila.logo_base64 || '',
    regimen: fila.regimen || '',
    tipoEmisor: fila.tipo_emisor || 'persona_natural'
  };
}

function crearRutasPerfil(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const fila = await db.get('SELECT * FROM perfil WHERE usuario_id = ?', [req.usuario.id]);
    res.json(aFormatoApi(fila || {}));
  });

  router.put('/', async (req, res) => {
    const { nombre, nit, contacto, logoBase64, regimen, tipoEmisor } = req.body;

    if (regimen && !REGIMENES.includes(regimen)) {
      return res.status(400).json({ error: 'El régimen tributario debe ser ordinario, simple o no responsable de IVA' });
    }
    if (logoBase64 && !String(logoBase64).startsWith('data:image/')) {
      return res.status(400).json({ error: 'El logo debe ser una imagen' });
    }
    if (tipoEmisor && !TIPOS_EMISOR.includes(tipoEmisor)) {
      return res.status(400).json({ error: 'El tipo de emisor debe ser persona_natural o persona_juridica' });
    }

    await db.run(
      `INSERT INTO perfil (usuario_id, nombre, nit, contacto, logo_base64, regimen, tipo_emisor)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nombre = VALUES(nombre),
         nit = VALUES(nit),
         contacto = VALUES(contacto),
         logo_base64 = VALUES(logo_base64),
         regimen = VALUES(regimen),
         tipo_emisor = VALUES(tipo_emisor)`,
      [req.usuario.id, nombre || null, nit || null, contacto || null, logoBase64 || null, regimen || null, tipoEmisor || 'persona_natural']
    );

    const guardado = await db.get('SELECT * FROM perfil WHERE usuario_id = ?', [req.usuario.id]);
    res.json(aFormatoApi(guardado));
  });

  router.get('/actividad', async (req, res) => {
    const actividad = await obtenerRecientes(req.usuario.id);
    res.json(actividad);
  });

  // T038: PUT preferencias PDF del usuario (FR-025, FR-026)
  router.put('/preferencias-pdf', async (req, res) => {
    const { plantilla, colores } = req.body;
    if (!plantilla) return res.status(400).json({ error: 'La plantilla es obligatoria' });

    const plantillaReg = await db.get('SELECT * FROM plantillas_pdf WHERE id = ?', [plantilla]);
    if (!plantillaReg) return res.status(404).json({ error: 'Plantilla no encontrada' });
    if (plantillaReg.solo_premium && req.usuario.tipoCuenta !== 'premium' && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Esta plantilla requiere cuenta premium' });
    }
    if (colores) {
      const hexValido = /^#[0-9A-Fa-f]{6}$/;
      for (const valor of Object.values(colores)) {
        if (!hexValido.test(valor)) return res.status(400).json({ error: `Color inválido: ${valor}` });
      }
    }

    await db.run(
      `UPDATE usuarios SET plantilla_pdf_preferida = ?, colores_pdf_preferidos = ? WHERE id = ?`,
      [plantilla, colores ? JSON.stringify(colores) : null, req.usuario.id]
    );
    res.json({ ok: true });
  });

  // T032, T033, T034: Emisores endpoints (FR-018, FR-019, FR-020)
  function emisorAApi(fila) {
    return {
      id: fila.id,
      esPrincipal: !!fila.es_principal,
      nombre: fila.nombre,
      documento: fila.documento || '',
      email: fila.email || '',
      telefono: fila.telefono || '',
      logoBase64: fila.logo_base64 || '',
      tipoEmisor: fila.tipo_emisor || 'persona_natural',
      ivaResponsable: !!fila.iva_responsable,
      ivaPorcentaje: fila.iva_porcentaje || 19,
      retencionPorcentaje: fila.retencion_porcentaje || null,
      retencionConcepto: fila.retencion_concepto || null,
      reteivaPorcentaje: fila.reteiva_porcentaje || 15,
      reteicaPorcentaje: fila.reteica_porcentaje || null,
      reteicaMunicipio: fila.reteica_municipio || null,
      compensarRetencion: !!fila.compensar_retencion
    };
  }

  router.get('/emisores', async (req, res) => {
    const filas = await db.all('SELECT * FROM emisores WHERE usuario_id = ? ORDER BY es_principal DESC, id ASC', [req.usuario.id]);
    res.json(filas.map(emisorAApi));
  });

  router.post('/emisores', async (req, res) => {
    if (req.usuario.tipoCuenta !== 'premium' && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo cuentas premium pueden crear emisores adicionales' });
    }
    const cuenta = await db.get('SELECT COUNT(*) AS cnt FROM emisores WHERE usuario_id = ?', [req.usuario.id]);
    if (cuenta.cnt >= 5) {
      return res.status(403).json({ error: 'Límite de 5 emisores alcanzado' });
    }

    const { nombre, documento, email, telefono, logoBase64, tipoEmisor, ivaResponsable, ivaPorcentaje,
            retencionPorcentaje, retencionConcepto, reteivaPorcentaje, reteicaPorcentaje, reteicaMunicipio, compensarRetencion } = req.body;

    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const resultado = await db.run(
      `INSERT INTO emisores (usuario_id, es_principal, nombre, documento, email, telefono, logo_base64, tipo_emisor,
        iva_responsable, iva_porcentaje, retencion_porcentaje, retencion_concepto,
        reteiva_porcentaje, reteica_porcentaje, reteica_municipio, compensar_retencion)
       VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.usuario.id, nombre, documento || null, email || null, telefono || null, logoBase64 || null,
       tipoEmisor || 'persona_natural', ivaResponsable ? 1 : 0, ivaPorcentaje || 19,
       retencionPorcentaje || null, retencionConcepto || null, reteivaPorcentaje || 15,
       reteicaPorcentaje || null, reteicaMunicipio || null, compensarRetencion ? 1 : 0]
    );
    const creado = await db.get('SELECT * FROM emisores WHERE id = ?', [resultado.insertId]);
    res.status(201).json(emisorAApi(creado));
  });

  router.put('/emisores/:id', async (req, res) => {
    const fila = await db.get('SELECT * FROM emisores WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
    if (!fila) return res.status(404).json({ error: 'Emisor no encontrado' });

    const { nombre, documento, email, telefono, logoBase64, tipoEmisor, ivaResponsable, ivaPorcentaje,
            retencionPorcentaje, retencionConcepto, reteivaPorcentaje, reteicaPorcentaje, reteicaMunicipio, compensarRetencion } = req.body;

    await db.run(
      `UPDATE emisores SET nombre = ?, documento = ?, email = ?, telefono = ?, logo_base64 = ?, tipo_emisor = ?,
        iva_responsable = ?, iva_porcentaje = ?, retencion_porcentaje = ?, retencion_concepto = ?,
        reteiva_porcentaje = ?, reteica_porcentaje = ?, reteica_municipio = ?, compensar_retencion = ?
       WHERE id = ?`,
      [nombre || fila.nombre, documento !== undefined ? documento : fila.documento,
       email !== undefined ? email : fila.email, telefono !== undefined ? telefono : fila.telefono,
       logoBase64 !== undefined ? logoBase64 : fila.logo_base64,
       tipoEmisor || fila.tipo_emisor,
       ivaResponsable !== undefined ? (ivaResponsable ? 1 : 0) : fila.iva_responsable,
       ivaPorcentaje || fila.iva_porcentaje,
       retencionPorcentaje !== undefined ? retencionPorcentaje : fila.retencion_porcentaje,
       retencionConcepto !== undefined ? retencionConcepto : fila.retencion_concepto,
       reteivaPorcentaje || fila.reteiva_porcentaje,
       reteicaPorcentaje !== undefined ? reteicaPorcentaje : fila.reteica_porcentaje,
       reteicaMunicipio !== undefined ? reteicaMunicipio : fila.reteica_municipio,
       compensarRetencion !== undefined ? (compensarRetencion ? 1 : 0) : fila.compensar_retencion,
       fila.id]
    );
    const actualizado = await db.get('SELECT * FROM emisores WHERE id = ?', [fila.id]);
    res.json(emisorAApi(actualizado));
  });

  router.delete('/emisores/:id', async (req, res) => {
    const fila = await db.get('SELECT * FROM emisores WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
    if (!fila) return res.status(404).json({ error: 'Emisor no encontrado' });
    if (fila.es_principal) return res.status(400).json({ error: 'No se puede eliminar el emisor principal' });
    await db.run('DELETE FROM emisores WHERE id = ?', [fila.id]);
    res.json({ ok: true });
  });

  return router;
}

module.exports = crearRutasPerfil;
