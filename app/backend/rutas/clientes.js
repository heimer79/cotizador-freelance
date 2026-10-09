const express = require('express');

const TIPOS_CLIENTE = ['persona_natural', 'persona_juridica'];

// Límite de clientes guardados por tipo de cuenta. Los administradores no tienen límite.
const LIMITE_CLIENTES = {
  gratuita: 10,
  premium: 200
};

const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB decoded

function aFormatoApi(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    documento: fila.documento,
    contacto: fila.contacto,
    email: fila.email || '',
    telefono: fila.telefono || '',
    tipo: fila.tipo,
    agenteRetenedor: !!fila.agente_retenedor,
    logoBase64: fila.logo_base64 || ''
  };
}

function validarLogoBase64(logoBase64) {
  if (!logoBase64) return null;
  const str = String(logoBase64);
  if (!str.startsWith('data:image/jpeg;base64,') && !str.startsWith('data:image/png;base64,')) {
    return 'El logo debe ser una imagen JPG o PNG';
  }
  const base64data = str.split(',')[1] || '';
  const byteSize = Math.ceil(base64data.length * 0.75);
  if (byteSize > LOGO_MAX_BYTES) {
    return 'El logo no puede superar 2 MB';
  }
  return null;
}

function validarCliente(body) {
  if (!body.nombre || !String(body.nombre).trim()) {
    return 'El nombre o razón social es obligatorio';
  }
  if (!TIPOS_CLIENTE.includes(body.tipo)) {
    return 'El tipo de cliente debe ser persona natural o persona jurídica';
  }
  const errorLogo = validarLogoBase64(body.logoBase64);
  if (errorLogo) return errorLogo;
  return null;
}

function crearRutasClientes(db) {
  const router = express.Router();

  // T013: búsqueda por ?q=texto (FR-001)
  router.get('/', async (req, res) => {
    const q = req.query.q ? `%${req.query.q}%` : null;
    const filas = q
      ? await db.all(
          'SELECT * FROM clientes WHERE usuario_id = ? AND (nombre LIKE ? OR documento LIKE ?) ORDER BY nombre',
          [req.usuario.id, q, q]
        )
      : await db.all('SELECT * FROM clientes WHERE usuario_id = ? ORDER BY nombre', [req.usuario.id]);
    res.json(filas.map(aFormatoApi));
  });

  // T014: acepta email, telefono, logoBase64 con validación (FR-003, FR-004, EC-1, EC-3)
  router.post('/', async (req, res) => {
    const error = validarCliente(req.body);
    if (error) return res.status(400).json({ error });

    const limite = req.usuario.rol === 'admin' ? null : (LIMITE_CLIENTES[req.usuario.tipoCuenta] ?? LIMITE_CLIENTES.gratuita);
    if (limite !== null) {
      const cuentaClientes = await db.get('SELECT COUNT(*) AS cnt FROM clientes WHERE usuario_id = ?', [req.usuario.id]);
      if (cuentaClientes.cnt >= limite) {
        return res.status(403).json({
          error: `Has alcanzado el límite de ${limite} clientes de tu plan.`,
          enlacePlanes: '/planes'
        });
      }
    }

    const { nombre, documento, contacto, email, telefono, tipo, agenteRetenedor, logoBase64 } = req.body;
    const resultado = await db.run(
      `INSERT INTO clientes (usuario_id, nombre, documento, contacto, email, telefono, tipo, agente_retenedor, logo_base64)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.usuario.id, nombre.trim(), documento || null, contacto || null, email || null, telefono || null, tipo, agenteRetenedor ? 1 : 0, logoBase64 || null]
    );

    const creado = await db.get('SELECT * FROM clientes WHERE id = ?', [resultado.insertId]);
    res.status(201).json(aFormatoApi(creado));
  });

  // T015: soporte email, telefono, logoBase64 en PUT
  router.put('/:id', async (req, res) => {
    const fila = await db.get('SELECT * FROM clientes WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
    if (!fila) return res.status(404).json({ error: 'Cliente no encontrado' });

    const error = validarCliente(req.body);
    if (error) return res.status(400).json({ error });

    const { nombre, documento, contacto, email, telefono, tipo, agenteRetenedor, logoBase64 } = req.body;
    await db.run(
      `UPDATE clientes SET nombre = ?, documento = ?, contacto = ?, email = ?, telefono = ?, tipo = ?, agente_retenedor = ?, logo_base64 = ?
       WHERE id = ? AND usuario_id = ?`,
      [
        nombre.trim(),
        documento || null,
        contacto || null,
        email !== undefined ? (email || null) : fila.email,
        telefono !== undefined ? (telefono || null) : fila.telefono,
        tipo,
        agenteRetenedor ? 1 : 0,
        logoBase64 !== undefined ? (logoBase64 || null) : fila.logo_base64,
        req.params.id,
        req.usuario.id
      ]
    );

    const actualizado = await db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    res.json(aFormatoApi(actualizado));
  });

  router.delete('/:id', async (req, res) => {
    const resultado = await db.run('DELETE FROM clientes WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
    if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.status(204).end();
  });

  return router;
}

module.exports = crearRutasClientes;
