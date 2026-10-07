const express = require('express');

function aFormatoApi(fila) {
  return { id: fila.id, nombre: fila.nombre, precioDefecto: fila.precio_defecto };
}

function validarServicio(body) {
  if (!body.nombre || !String(body.nombre).trim()) {
    return 'El nombre del servicio es obligatorio';
  }
  if (!Number.isInteger(body.precioDefecto) || body.precioDefecto <= 0) {
    return 'El precio por defecto debe ser un número entero mayor que cero';
  }
  return null;
}

function crearRutasCatalogo(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const filas = await db.all('SELECT * FROM catalogo WHERE usuario_id = ? ORDER BY nombre', [req.usuario.id]);
    res.json(filas.map(aFormatoApi));
  });

  router.post('/', async (req, res) => {
    const error = validarServicio(req.body);
    if (error) return res.status(400).json({ error });

    const resultado = await db.run(
      'INSERT INTO catalogo (usuario_id, nombre, precio_defecto) VALUES (?, ?, ?)',
      [req.usuario.id, req.body.nombre.trim(), req.body.precioDefecto]
    );

    const creado = await db.get('SELECT * FROM catalogo WHERE id = ?', [resultado.insertId]);
    res.status(201).json(aFormatoApi(creado));
  });

  router.put('/:id', async (req, res) => {
    const fila = await db.get('SELECT * FROM catalogo WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
    if (!fila) return res.status(404).json({ error: 'Servicio no encontrado' });

    const error = validarServicio(req.body);
    if (error) return res.status(400).json({ error });

    await db.run(
      'UPDATE catalogo SET nombre = ?, precio_defecto = ? WHERE id = ? AND usuario_id = ?',
      [req.body.nombre.trim(), req.body.precioDefecto, req.params.id, req.usuario.id]
    );

    const actualizado = await db.get('SELECT * FROM catalogo WHERE id = ?', [req.params.id]);
    res.json(aFormatoApi(actualizado));
  });

  router.delete('/:id', async (req, res) => {
    const resultado = await db.run('DELETE FROM catalogo WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
    if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.status(204).end();
  });

  return router;
}

module.exports = crearRutasCatalogo;
