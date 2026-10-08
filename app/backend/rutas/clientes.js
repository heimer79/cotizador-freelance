const express = require('express');

const TIPOS_CLIENTE = ['persona_natural', 'persona_juridica'];

function aFormatoApi(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    documento: fila.documento,
    contacto: fila.contacto,
    tipo: fila.tipo,
    agenteRetenedor: !!fila.agente_retenedor
  };
}

function validarCliente(body) {
  if (!body.nombre || !String(body.nombre).trim()) {
    return 'El nombre o razón social es obligatorio';
  }
  if (!TIPOS_CLIENTE.includes(body.tipo)) {
    return 'El tipo de cliente debe ser persona natural o persona jurídica';
  }
  return null;
}

function crearRutasClientes(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const filas = await db.all('SELECT * FROM clientes WHERE usuario_id = ? ORDER BY nombre', [req.usuario.id]);
    res.json(filas.map(aFormatoApi));
  });

  router.post('/', async (req, res) => {
    const error = validarCliente(req.body);
    if (error) return res.status(400).json({ error });

    if (req.usuario.tipoCuenta !== 'premium') {
      return res.status(403).json({
        error: 'Guardar clientes requiere una cuenta premium',
        enlacePlanes: '/planes'
      });
    }

    const cuentaClientes = await db.get('SELECT COUNT(*) AS cnt FROM clientes WHERE usuario_id = ?', [req.usuario.id]);
    if (cuentaClientes.cnt >= 200) {
      return res.status(403).json({ error: 'Has alcanzado el límite de 200 clientes.', enlacePlanes: '/planes' });
    }

    const { nombre, documento, contacto, tipo, agenteRetenedor } = req.body;
    const resultado = await db.run(
      `INSERT INTO clientes (usuario_id, nombre, documento, contacto, tipo, agente_retenedor)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.usuario.id, nombre.trim(), documento || null, contacto || null, tipo, agenteRetenedor ? 1 : 0]
    );

    const creado = await db.get('SELECT * FROM clientes WHERE id = ?', [resultado.insertId]);
    res.status(201).json(aFormatoApi(creado));
  });

  router.put('/:id', async (req, res) => {
    const fila = await db.get('SELECT * FROM clientes WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
    if (!fila) return res.status(404).json({ error: 'Cliente no encontrado' });

    const error = validarCliente(req.body);
    if (error) return res.status(400).json({ error });

    const { nombre, documento, contacto, tipo, agenteRetenedor } = req.body;
    await db.run(
      `UPDATE clientes SET nombre = ?, documento = ?, contacto = ?, tipo = ?, agente_retenedor = ?
       WHERE id = ? AND usuario_id = ?`,
      [nombre.trim(), documento || null, contacto || null, tipo, agenteRetenedor ? 1 : 0, req.params.id, req.usuario.id]
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
