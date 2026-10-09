const express = require('express');

const LIMITE_CATALOGO = { gratuita: 20, premium: 200 };

function aFormatoApi(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion || '',
    precioDefecto: fila.precio_defecto,
    cantidadDefecto: fila.cantidad_defecto || 1
  };
}

function validarServicio(body) {
  if (!body.nombre || !String(body.nombre).trim()) {
    return 'El nombre del servicio es obligatorio';
  }
  if (!Number.isInteger(body.precioDefecto) || body.precioDefecto <= 0) {
    return 'El precio por defecto debe ser un número entero mayor que cero';
  }
  if (body.descripcion && String(body.descripcion).length > 500) {
    return 'La descripción no puede superar 500 caracteres';
  }
  if (body.cantidadDefecto !== undefined && (!Number.isInteger(body.cantidadDefecto) || body.cantidadDefecto < 1)) {
    return 'La cantidad por defecto debe ser un número entero mayor o igual a 1';
  }
  return null;
}

function crearRutasCatalogo(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const filas = await db.all('SELECT * FROM catalogo WHERE usuario_id = ? ORDER BY nombre', [req.usuario.id]);
    res.json(filas.map(aFormatoApi));
  });

  // T025: descripcion, cantidadDefecto, límites de almacenamiento (FR-014, FR-017)
  router.post('/', async (req, res) => {
    const error = validarServicio(req.body);
    if (error) return res.status(400).json({ error });

    const limite = req.usuario.rol === 'admin' ? null : (LIMITE_CATALOGO[req.usuario.tipoCuenta] ?? LIMITE_CATALOGO.gratuita);
    if (limite !== null) {
      const cuenta = await db.get('SELECT COUNT(*) AS cnt FROM catalogo WHERE usuario_id = ?', [req.usuario.id]);
      if (cuenta.cnt >= limite) {
        return res.status(403).json({ error: `Has alcanzado el límite de ${limite} servicios del catálogo de tu plan.`, enlacePlanes: '/planes' });
      }
    }

    const resultado = await db.run(
      'INSERT INTO catalogo (usuario_id, nombre, descripcion, precio_defecto, cantidad_defecto) VALUES (?, ?, ?, ?, ?)',
      [req.usuario.id, req.body.nombre.trim(), req.body.descripcion || null, req.body.precioDefecto, req.body.cantidadDefecto || 1]
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
      'UPDATE catalogo SET nombre = ?, descripcion = ?, precio_defecto = ?, cantidad_defecto = ? WHERE id = ? AND usuario_id = ?',
      [req.body.nombre.trim(), req.body.descripcion || null, req.body.precioDefecto, req.body.cantidadDefecto || 1, req.params.id, req.usuario.id]
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
