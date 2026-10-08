const express = require('express');

function crearRutasGrupos(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const grupos = await db.all(
      'SELECT id, nombre, descripcion FROM grupos_clientes WHERE usuario_id = ? ORDER BY nombre',
      [req.usuario.id]
    );
    res.json(grupos);
  });

  router.post('/', async (req, res) => {
    const { nombre, descripcion } = req.body;
    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ error: 'El nombre del grupo es obligatorio' });
    }
    const resultado = await db.run(
      'INSERT INTO grupos_clientes (usuario_id, nombre, descripcion) VALUES (?, ?, ?)',
      [req.usuario.id, nombre.trim(), descripcion || null]
    );
    const creado = await db.get('SELECT id, nombre, descripcion FROM grupos_clientes WHERE id = ?', [resultado.insertId]);
    res.status(201).json(creado);
  });

  router.put('/:id', async (req, res) => {
    const grupo = await db.get('SELECT id FROM grupos_clientes WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
    if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado' });

    const { nombre, descripcion } = req.body;
    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ error: 'El nombre del grupo es obligatorio' });
    }
    await db.run(
      'UPDATE grupos_clientes SET nombre = ?, descripcion = ? WHERE id = ?',
      [nombre.trim(), descripcion || null, req.params.id]
    );
    res.json({ id: Number(req.params.id), nombre: nombre.trim(), descripcion: descripcion || null });
  });

  router.delete('/:id', async (req, res) => {
    const resultado = await db.run('DELETE FROM grupos_clientes WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
    if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Grupo no encontrado' });
    res.status(204).end();
  });

  router.get('/:id/clientes', async (req, res) => {
    const grupo = await db.get('SELECT id FROM grupos_clientes WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
    if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado' });

    const clientes = await db.all(
      `SELECT c.id, c.nombre, c.documento, c.contacto, c.tipo
       FROM clientes c
       JOIN grupos_clientes_miembros gcm ON gcm.cliente_id = c.id
       WHERE gcm.grupo_id = ? ORDER BY c.nombre`,
      [req.params.id]
    );
    res.json(clientes);
  });

  router.post('/:id/clientes', async (req, res) => {
    const grupo = await db.get('SELECT id FROM grupos_clientes WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
    if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado' });

    const { clienteId } = req.body;
    if (!clienteId) return res.status(400).json({ error: 'clienteId es obligatorio' });

    const cliente = await db.get('SELECT id FROM clientes WHERE id = ? AND usuario_id = ?', [clienteId, req.usuario.id]);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    await db.run(
      'INSERT IGNORE INTO grupos_clientes_miembros (grupo_id, cliente_id) VALUES (?, ?)',
      [req.params.id, clienteId]
    );
    res.status(201).json({ ok: true });
  });

  router.delete('/:id/clientes/:clienteId', async (req, res) => {
    await db.run('DELETE FROM grupos_clientes_miembros WHERE grupo_id = ? AND cliente_id = ?', [req.params.id, req.params.clienteId]);
    res.status(204).end();
  });

  return router;
}

module.exports = crearRutasGrupos;
