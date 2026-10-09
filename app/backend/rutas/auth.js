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
  crearMiddlewareSesion,
  passport
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

function datosPublicos(fila, proveedores = []) {
  return {
    id: fila.id,
    nombre: fila.nombre_completo,
    email: fila.email,
    verificado: !!fila.email_verificado,
    rol: fila.rol || 'normal',
    tipoCuenta: fila.tipo_cuenta || 'gratuita',
    estado: fila.estado || 'activo',
    totpActivo: !!fila.totp_activo,
    proveedores
  };
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
    try {
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
        await tx.run(
          'INSERT IGNORE INTO auth_proveedores (usuario_id, proveedor) VALUES (?, ?)',
          [resultado.insertId, 'email']
        );
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
    } catch (e) {
      console.error('[auth] POST /registro:', e);
      res.status(500).json({ error: 'Error al crear la cuenta. Intenta de nuevo.' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const usuario = await db.get(
        'SELECT * FROM usuarios WHERE email = ?',
        [String(email || '').trim().toLowerCase()]
      );

      if (!usuario || typeof password !== 'string' || !verificarPassword(password, usuario.password_hash)) {
        return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
      }

      // T057: Si el usuario tiene 2FA activo, exigir código TOTP antes de emitir sesión (FR-040)
      if (usuario.totp_activo) {
        const { codigo2fa } = req.body;
        if (!codigo2fa) {
          return res.status(403).json({ requiere2fa: true, error: 'Se requiere el código de verificación 2FA' });
        }
        const { TOTP, Secret } = require('otpauth');
        const totp2fa = await db.get('SELECT * FROM totp_2fa WHERE usuario_id = ?', [usuario.id]);
        if (!totp2fa) {
          return res.status(500).json({ error: 'Configuración 2FA inválida. Contacta soporte.' });
        }
        const totp = new TOTP({ secret: Secret.fromBase32(totp2fa.secreto_cifrado) });
        const delta = totp.validate({ token: String(codigo2fa).replace(/\s/g, ''), window: 1 });
        if (delta === null) {
          return res.status(401).json({ requiere2fa: true, error: 'Código 2FA incorrecto o expirado' });
        }
      }

      emitirCookieSesion(res, await crearSesion(db, usuario.id));
      res.json({ usuario: datosPublicos(usuario) });
    } catch (e) {
      console.error('[auth] POST /login:', e);
      res.status(500).json({ error: 'Error al iniciar sesión. Intenta de nuevo.' });
    }
  });

  router.post('/logout', async (req, res) => {
    const token = leerCookie(req, NOMBRE_COOKIE);
    if (token) await db.run('DELETE FROM sesiones WHERE token_hash = ?', [hashToken(token)]);
    res.clearCookie(NOMBRE_COOKIE, { path: '/' });
    res.status(204).end();
  });

  router.get('/me', requiereSesion, async (req, res) => {
    try {
      const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);
      const proveedores = await db.all('SELECT proveedor FROM auth_proveedores WHERE usuario_id = ?', [req.usuario.id]);
      res.json({ usuario: datosPublicos(usuario, proveedores.map((p) => p.proveedor)) });
    } catch (e) {
      console.error('[auth] GET /me:', e);
      res.status(500).json({ error: 'Error al obtener sesión' });
    }
  });

  router.post('/verificar', async (req, res) => {
    try {
      const usuarioId = await consumirTokenCorreo(db, String(req.body.token || ''), 'verificacion');
      if (!usuarioId) {
        return res.status(400).json({ error: 'El enlace de verificación no es válido o ya venció. Pide uno nuevo.' });
      }
      await db.run('UPDATE usuarios SET email_verificado = 1 WHERE id = ?', [usuarioId]);
      res.json({ ok: true });
    } catch (e) {
      console.error('[auth] POST /verificar:', e);
      res.status(500).json({ error: 'Error al verificar el correo' });
    }
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

  router.get('/yo', requiereSesion, async (req, res) => {
    try {
      const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);
      const proveedores = await db.all('SELECT proveedor FROM auth_proveedores WHERE usuario_id = ?', [req.usuario.id]);
      res.json({ usuario: datosPublicos(usuario, proveedores.map((p) => p.proveedor)) });
    } catch (e) {
      console.error('[auth] GET /yo:', e);
      res.status(500).json({ error: 'Error al obtener sesión' });
    }
  });

  router.post('/establecer-password', requiereSesion, async (req, res) => {
    try {
      const { password } = req.body;
      if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
        return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
      }
      await db.run('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hashPassword(password), req.usuario.id]);
      await db.run(
        'INSERT IGNORE INTO auth_proveedores (usuario_id, proveedor) VALUES (?, ?)',
        [req.usuario.id, 'email']
      );
      res.json({ ok: true });
    } catch (e) {
      console.error('[auth] POST /establecer-password:', e);
      res.status(500).json({ error: 'Error al establecer contraseña' });
    }
  });

  router.post('/restablecer', async (req, res) => {
    try {
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
    } catch (e) {
      console.error('[auth] POST /restablecer:', e);
      res.status(500).json({ error: 'Error al restablecer la contraseña' });
    }
  });

  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

  router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login?error=google_failed' }),
    async (req, res) => {
      if (!req.user) return res.redirect('/login?error=google_failed');
      const token = await crearSesion(db, req.user.id);
      emitirCookieSesion(res, token);
      res.redirect('/');
    }
  );

  router.get('/facebook', passport.authenticate('facebook', { scope: ['email'], session: false }));

  router.get('/facebook/callback',
    passport.authenticate('facebook', { session: false, failureRedirect: '/login?error=facebook_failed' }),
    async (req, res) => {
      if (!req.user) return res.redirect('/login?error=facebook_failed');
      const token = await crearSesion(db, req.user.id);
      emitirCookieSesion(res, token);
      res.redirect('/');
    }
  );

  // ── T053-T057: 2FA endpoints (FR-037, FR-038, FR-039, FR-040) ──

  // T053: Iniciar activación TOTP — genera secreto y QR
  router.post('/2fa/activar', requiereSesion, async (req, res) => {
    try {
      const { TOTP, Secret } = require('otpauth');
      const qrcode = require('qrcode');

      const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);
      if (usuario.totp_activo) {
        return res.status(400).json({ error: '2FA ya está activado. Desactívalo primero.' });
      }

      const secretObj = new Secret();
      const secretBase32 = secretObj.base32;

      const totp = new TOTP({ issuer: 'PresupuestosPro', label: usuario.email, secret: secretObj });
      const otpUri = totp.toString();
      const qrDataUrl = await qrcode.toDataURL(otpUri);

      await db.run(
        `INSERT INTO totp_2fa (usuario_id, secreto_cifrado) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE secreto_cifrado = VALUES(secreto_cifrado), fecha_activacion = CURRENT_TIMESTAMP`,
        [req.usuario.id, secretBase32]
      );

      res.json({ qr: qrDataUrl, secret: secretBase32 });
    } catch (e) {
      console.error('[auth] POST /2fa/activar:', e);
      res.status(500).json({ error: 'Error al iniciar activación 2FA' });
    }
  });

  // T054: Verificar y confirmar TOTP
  router.post('/2fa/verificar', requiereSesion, async (req, res) => {
    try {
      const { TOTP, Secret } = require('otpauth');
      const { codigo } = req.body;
      if (!codigo) return res.status(400).json({ error: 'El código es obligatorio' });

      const fila = await db.get('SELECT * FROM totp_2fa WHERE usuario_id = ?', [req.usuario.id]);
      if (!fila) return res.status(400).json({ error: 'No hay 2FA pendiente de activar' });

      const totp = new TOTP({ secret: Secret.fromBase32(fila.secreto_cifrado) });
      const delta = totp.validate({ token: String(codigo).replace(/\s/g, ''), window: 1 });

      if (delta === null) {
        return res.status(400).json({ error: 'Código incorrecto o expirado' });
      }

      // Generar códigos de recuperación
      const crypto = require('crypto');
      const codigos = Array.from({ length: 8 }, () => crypto.randomBytes(5).toString('hex'));

      await db.run('UPDATE usuarios SET totp_activo = 1 WHERE id = ?', [req.usuario.id]);
      await db.run('DELETE FROM codigos_recuperacion WHERE usuario_id = ?', [req.usuario.id]);
      for (const c of codigos) {
        const hash = require('crypto').createHash('sha256').update(c).digest('hex');
        await db.run('INSERT INTO codigos_recuperacion (usuario_id, codigo_hash) VALUES (?, ?)', [req.usuario.id, hash]);
      }

      res.json({ ok: true, codigos });
    } catch (e) {
      console.error('[auth] POST /2fa/verificar:', e);
      res.status(500).json({ error: 'Error al verificar 2FA' });
    }
  });

  // T055: Recuperar acceso con código de recuperación
  router.post('/2fa/recuperar', async (req, res) => {
    try {
      const { email, password, codigo } = req.body;
      if (!email || !password || !codigo) return res.status(400).json({ error: 'Faltan datos' });

      const usuario = await db.get('SELECT * FROM usuarios WHERE email = ?', [String(email).trim().toLowerCase()]);
      const { verificarPassword } = require('../auth');
      if (!usuario || !verificarPassword(password, usuario.password_hash)) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      const codigoHash = require('crypto').createHash('sha256').update(String(codigo).trim().toLowerCase()).digest('hex');
      const fila = await db.get(
        'SELECT * FROM codigos_recuperacion WHERE usuario_id = ? AND codigo_hash = ? AND usado = 0',
        [usuario.id, codigoHash]
      );
      if (!fila) return res.status(401).json({ error: 'Código de recuperación inválido o ya usado' });

      await db.run('UPDATE codigos_recuperacion SET usado = 1 WHERE id = ?', [fila.id]);
      emitirCookieSesion(res, await crearSesion(db, usuario.id));
      res.json({ usuario: datosPublicos(usuario) });
    } catch (e) {
      res.status(500).json({ error: 'Error en recuperación 2FA' });
    }
  });

  // T056: Desactivar 2FA
  router.delete('/2fa', requiereSesion, async (req, res) => {
    try {
      await db.run('DELETE FROM totp_2fa WHERE usuario_id = ?', [req.usuario.id]);
      await db.run('UPDATE usuarios SET totp_activo = 0 WHERE id = ?', [req.usuario.id]);
      await db.run('DELETE FROM codigos_recuperacion WHERE usuario_id = ?', [req.usuario.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al desactivar 2FA' });
    }
  });

  return router;
}

module.exports = crearRutasAuth;
