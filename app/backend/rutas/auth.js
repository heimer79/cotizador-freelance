const express = require('express');
const {
  NOMBRE_COOKIE,
  hashPassword,
  verificarPassword,
  emitirCookieSesion,
  crearSesion,
  crearTokenCorreo,
  consumirTokenCorreo,
  leerCookie,
  hashToken,
  crearMiddlewareSesion
} = require('../auth');

const TIPOS_DOCUMENTO = ['CC', 'NIT', 'CE', 'pasaporte'];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function urlApp() {
  return process.env.APP_URL || 'http://localhost:3000';
}

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function correoVerificacion(nombre, token) {
  const enlace = `${urlApp()}/?verificar=${token}`;
  return {
    asunto: 'Confirma tu correo en PresupuestosPro',
    texto: `Hola ${nombre}, confirma tu correo para empezar a crear cotizaciones: ${enlace}\n\nEl enlace vence en 24 horas.`,
    html: `<p>Hola ${escapar(nombre)},</p><p>Confirma tu correo para empezar a crear cotizaciones:</p><p><a href="${enlace}">Confirmar mi correo</a></p><p>El enlace vence en 24 horas.</p>`
  };
}

function correoRestablecer(nombre, token) {
  const enlace = `${urlApp()}/?restablecer=${token}`;
  return {
    asunto: 'Restablece tu contraseña de PresupuestosPro',
    texto: `Hola ${nombre}, usa este enlace para crear una nueva contraseña: ${enlace}\n\nEl enlace vence en 1 hora. Si no lo pediste, ignora este correo.`,
    html: `<p>Hola ${escapar(nombre)},</p><p>Usa este enlace para crear una nueva contraseña:</p><p><a href="${enlace}">Restablecer contraseña</a></p><p>El enlace vence en 1 hora. Si no lo pediste, ignora este correo.</p>`
  };
}

function datosPublicos(fila) {
  return { id: fila.id, nombre: fila.nombre_completo, email: fila.email, verificado: !!fila.email_verificado };
}

function crearRutasAuth(db, correo) {
  const router = express.Router();
  const requiereSesion = crearMiddlewareSesion(db);

  async function enviarVerificacion(usuario) {
    const token = await crearTokenCorreo(db, usuario.id, 'verificacion');
    const mensaje = correoVerificacion(usuario.nombre_completo, token);
    await correo.enviar({ para: usuario.email, ...mensaje });
  }

  router.post('/registro', async (req, res) => {
    const { nombreCompleto, email, tipoDocumento, numeroDocumento, password } = req.body;

    if (!nombreCompleto || !String(nombreCompleto).trim()) {
      return res.status(400).json({ error: 'El nombre completo es obligatorio' });
    }
    if (!EMAIL_VALIDO.test(String(email || ''))) {
      return res.status(400).json({ error: 'Ingresa un correo electrónico válido' });
    }
    if (!TIPOS_DOCUMENTO.includes(tipoDocumento)) {
      return res.status(400).json({ error: 'El tipo de documento debe ser CC, NIT, CE o pasaporte' });
    }
    if (!numeroDocumento || !String(numeroDocumento).trim()) {
      return res.status(400).json({ error: 'El número de documento es obligatorio' });
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const existente = await db.get('SELECT id FROM usuarios WHERE email = ?', [emailNormalizado]);
    if (existente) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo electrónico' });
    }

    const nombre = nombreCompleto.trim();
    const documento = String(numeroDocumento).trim();

    const usuarioId = await db.transaction(async (tx) => {
      const resultado = await tx.run(
        `INSERT INTO usuarios (nombre_completo, email, tipo_documento, numero_documento, password_hash)
         VALUES (?, ?, ?, ?, ?)`,
        [nombre, emailNormalizado, tipoDocumento, documento, hashPassword(password)]
      );
      await tx.run('INSERT INTO perfil (usuario_id, nombre, nit) VALUES (?, ?, ?)', [
        resultado.insertId,
        nombre,
        documento
      ]);
      return resultado.insertId;
    });

    const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [usuarioId]);
    emitirCookieSesion(res, await crearSesion(db, usuarioId));

    try {
      await enviarVerificacion(usuario);
    } catch (error) {
      console.error('No se pudo enviar el correo de verificación:', error.message);
    }

    res.status(201).json({ usuario: datosPublicos(usuario) });
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const usuario = await db.get(
      'SELECT * FROM usuarios WHERE email = ?',
      [String(email || '').trim().toLowerCase()]
    );

    if (!usuario || typeof password !== 'string' || !verificarPassword(password, usuario.password_hash)) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    emitirCookieSesion(res, await crearSesion(db, usuario.id));
    res.json({ usuario: datosPublicos(usuario) });
  });

  router.post('/logout', async (req, res) => {
    const token = leerCookie(req, NOMBRE_COOKIE);
    if (token) await db.run('DELETE FROM sesiones WHERE token_hash = ?', [hashToken(token)]);
    res.clearCookie(NOMBRE_COOKIE, { path: '/' });
    res.status(204).end();
  });

  router.get('/me', requiereSesion, async (req, res) => {
    const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);
    res.json({ usuario: datosPublicos(usuario) });
  });

  router.post('/verificar', async (req, res) => {
    const usuarioId = await consumirTokenCorreo(db, String(req.body.token || ''), 'verificacion');
    if (!usuarioId) {
      return res.status(400).json({ error: 'El enlace de verificación no es válido o ya venció. Pide uno nuevo.' });
    }
    await db.run('UPDATE usuarios SET email_verificado = 1 WHERE id = ?', [usuarioId]);
    res.json({ ok: true });
  });

  router.post('/reenviar-verificacion', requiereSesion, async (req, res) => {
    const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (usuario.email_verificado) {
      return res.status(409).json({ error: 'Tu correo ya está verificado' });
    }
    try {
      await enviarVerificacion(usuario);
    } catch (error) {
      console.error('No se pudo reenviar el correo de verificación:', error.message);
      return res.status(502).json({ error: 'No pudimos enviar el correo en este momento. Intenta más tarde.' });
    }
    res.json({ ok: true });
  });

  router.post('/olvide', async (req, res) => {
    const usuario = await db.get(
      'SELECT * FROM usuarios WHERE email = ?',
      [String(req.body.email || '').trim().toLowerCase()]
    );

    if (usuario) {
      const token = await crearTokenCorreo(db, usuario.id, 'restablecer');
      const mensaje = correoRestablecer(usuario.nombre_completo, token);
      try {
        await correo.enviar({ para: usuario.email, ...mensaje });
      } catch (error) {
        console.error('No se pudo enviar el correo de restablecimiento:', error.message);
      }
    }
    res.json({ ok: true });
  });

  router.post('/restablecer', async (req, res) => {
    const { token, password } = req.body;
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
    }

    const usuarioId = await consumirTokenCorreo(db, String(token || ''), 'restablecer');
    if (!usuarioId) {
      return res.status(400).json({ error: 'El enlace para restablecer la contraseña no es válido o ya venció.' });
    }

    await db.transaction(async (tx) => {
      await tx.run('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hashPassword(password), usuarioId]);
      await tx.run('DELETE FROM sesiones WHERE usuario_id = ?', [usuarioId]);
    });

    res.json({ ok: true });
  });

  return router;
}

module.exports = crearRutasAuth;
