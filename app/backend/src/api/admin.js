const express = require('express');
const { obtenerSeccion, establecerSeccion } = require('../models/configuracion-plataforma');
const { listar: listarNotificaciones, contarNoLeidas, marcarLeida } = require('../models/notificacion');
const { establecerCuentaManual } = require('../models/suscripcion');

const TABLAS_AUTORIZADAS = new Set([
  'usuarios', 'suscripciones', 'configuracion_plataforma', 'documentos_legales',
  'aceptaciones_legales', 'notificaciones_admin', 'donacion', 'auth_proveedores', 'historial_actividad'
]);

function crearRutasAdmin(db, soloAdminMw) {
  const router = express.Router();
  router.use(soloAdminMw);

  // Configuración por sección
  router.get('/config/:seccion', async (req, res) => {
    try {
      const datos = await obtenerSeccion(req.params.seccion);
      res.json({ config: datos });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.put('/config/:seccion', async (req, res) => {
    try {
      await establecerSeccion(req.params.seccion, req.body);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Gestión de usuarios
  router.get('/usuarios', async (req, res) => {
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = 20;
    const offset = (pagina - 1) * limite;
    const busqueda = `%${req.query.busqueda || ''}%`;

    const usuarios = await db.all(
      `SELECT id, nombre_completo, email, rol, tipo_cuenta, fecha_registro, estado
       FROM usuarios
       WHERE nombre_completo LIKE ? OR email LIKE ?
       ORDER BY fecha_registro DESC LIMIT ? OFFSET ?`,
      [busqueda, busqueda, limite, offset]
    );
    const total = await db.get(
      'SELECT COUNT(*) AS cnt FROM usuarios WHERE nombre_completo LIKE ? OR email LIKE ?',
      [busqueda, busqueda]
    );
    res.json({ usuarios, total: total.cnt, pagina, limite });
  });

  router.patch('/usuarios/:id/suspender', async (req, res) => {
    await db.run(`UPDATE usuarios SET estado = 'suspendido' WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  });

  router.patch('/usuarios/:id/reactivar', async (req, res) => {
    await db.run(`UPDATE usuarios SET estado = 'activo' WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  });

  router.patch('/usuarios/:id/rol', async (req, res) => {
    const { rol } = req.body;
    if (!['normal', 'admin'].includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    if (rol === 'normal') {
      const admins = await db.get(`SELECT COUNT(*) AS cnt FROM usuarios WHERE rol = 'admin'`);
      if (admins.cnt <= 1) {
        return res.status(409).json({ error: 'No puedes quitar el rol de administrador al único admin' });
      }
    }
    await db.run('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, req.params.id]);
    res.json({ ok: true });
  });

  router.patch('/usuarios/:id/cuenta', async (req, res) => {
    const { tipoCuenta } = req.body;
    if (!['gratuita', 'premium'].includes(tipoCuenta)) {
      return res.status(400).json({ error: 'Tipo de cuenta inválido' });
    }
    await establecerCuentaManual(req.params.id, tipoCuenta);
    res.json({ ok: true });
  });

  // Notificaciones
  router.get('/notificaciones', async (req, res) => {
    const pagina = parseInt(req.query.pagina) || 1;
    const { notificaciones, total } = await listarNotificaciones(pagina);
    res.json({ notificaciones, total, pagina });
  });

  router.get('/notificaciones/conteo', async (req, res) => {
    const noLeidas = await contarNoLeidas();
    res.json({ noLeidas });
  });

  router.patch('/notificaciones/:id', async (req, res) => {
    await marcarLeida(req.params.id);
    res.json({ ok: true });
  });

  // Visor de base de datos (solo lectura)
  router.get('/bd/:tabla', async (req, res) => {
    const tabla = req.params.tabla;
    if (!TABLAS_AUTORIZADAS.has(tabla)) {
      return res.status(403).json({ error: 'Tabla no autorizada' });
    }
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = 50;
    const offset = (pagina - 1) * limite;

    const filas = await db.all(`SELECT * FROM ${tabla} ORDER BY 1 DESC LIMIT ? OFFSET ?`, [limite, offset]);
    const total = await db.get(`SELECT COUNT(*) AS cnt FROM ${tabla}`);
    res.json({ filas, total: total.cnt, pagina, limite, tabla });
  });

  return router;
}

module.exports = crearRutasAdmin;
