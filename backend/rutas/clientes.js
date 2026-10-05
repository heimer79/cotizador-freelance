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

  router.get('/', (req, res) => {
    const filas = db.prepare('SELECT * FROM clientes WHERE usuario_id = ? ORDER BY nombre').all(req.usuario.id);
    res.json(filas.map(aFormatoApi));
  });

  router.post('/', (req, res) => {
    const error = validarCliente(req.body);
    if (error) return res.status(400).json({ error });

    const { nombre, documento, contacto, tipo, agenteRetenedor } = req.body;
    const resultado = db
      .prepare(
        `INSERT INTO clientes (usuario_id, nombre, documento, contacto, tipo, agente_retenedor)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(req.usuario.id, nombre.trim(), documento || null, contacto || null, tipo, agenteRetenedor ? 1 : 0);

    const creado = db.prepare('SELECT * FROM clientes WHERE id = ?').get(resultado.lastInsertRowid);
    res.status(201).json(aFormatoApi(creado));
  });

  router.put('/:id', (req, res) => {
    const fila = db.prepare('SELECT * FROM clientes WHERE id = ? AND usuario_id = ?').get(req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cliente no encontrado' });

    const error = validarCliente(req.body);
    if (error) return res.status(400).json({ error });

    const { nombre, documento, contacto, tipo, agenteRetenedor } = req.body;
    db.prepare(
      `UPDATE clientes SET nombre = ?, documento = ?, contacto = ?, tipo = ?, agente_retenedor = ?
       WHERE id = ? AND usuario_id = ?`
    ).run(nombre.trim(), documento || null, contacto || null, tipo, agenteRetenedor ? 1 : 0, req.params.id, req.usuario.id);

    const actualizado = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
    res.json(aFormatoApi(actualizado));
  });

  // Las cotizaciones conservan una copia de los datos del cliente (FR-018), así que borrar no las afecta.
  router.delete('/:id', (req, res) => {
    const resultado = db.prepare('DELETE FROM clientes WHERE id = ? AND usuario_id = ?').run(req.params.id, req.usuario.id);
    if (resultado.changes === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.status(204).end();
  });

  return router;
}

module.exports = crearRutasClientes;
