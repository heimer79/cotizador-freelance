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

  router.get('/', (req, res) => {
    const filas = db.prepare('SELECT * FROM catalogo WHERE usuario_id = ? ORDER BY nombre').all(req.usuario.id);
    res.json(filas.map(aFormatoApi));
  });

  router.post('/', (req, res) => {
    const error = validarServicio(req.body);
    if (error) return res.status(400).json({ error });

    const resultado = db
      .prepare('INSERT INTO catalogo (usuario_id, nombre, precio_defecto) VALUES (?, ?, ?)')
      .run(req.usuario.id, req.body.nombre.trim(), req.body.precioDefecto);

    const creado = db.prepare('SELECT * FROM catalogo WHERE id = ?').get(resultado.lastInsertRowid);
    res.status(201).json(aFormatoApi(creado));
  });

  router.put('/:id', (req, res) => {
    const fila = db.prepare('SELECT * FROM catalogo WHERE id = ? AND usuario_id = ?').get(req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Servicio no encontrado' });

    const error = validarServicio(req.body);
    if (error) return res.status(400).json({ error });

    db.prepare('UPDATE catalogo SET nombre = ?, precio_defecto = ? WHERE id = ? AND usuario_id = ?').run(
      req.body.nombre.trim(),
      req.body.precioDefecto,
      req.params.id,
      req.usuario.id
    );

    const actualizado = db.prepare('SELECT * FROM catalogo WHERE id = ?').get(req.params.id);
    res.json(aFormatoApi(actualizado));
  });

  router.delete('/:id', (req, res) => {
    const resultado = db.prepare('DELETE FROM catalogo WHERE id = ? AND usuario_id = ?').run(req.params.id, req.usuario.id);
    if (resultado.changes === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.status(204).end();
  });

  return router;
}

module.exports = crearRutasCatalogo;
