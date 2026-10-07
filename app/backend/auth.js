const crypto = require('crypto');

const NOMBRE_COOKIE = 'sesion';
const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000;
const VIGENCIA_VERIFICACION_MS = 24 * 60 * 60 * 1000;
const VIGENCIA_RESTABLECER_MS = 60 * 60 * 1000;

function hashPassword(password) {
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, sal, 64);
  return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`;
}

function verificarPassword(password, almacenado) {
  const [algoritmo, salHex, hashHex] = String(almacenado).split('$');
  if (algoritmo !== 'scrypt' || !salHex || !hashHex) return false;

  const esperado = Buffer.from(hashHex, 'hex');
  const calculado = crypto.scryptSync(password, Buffer.from(salHex, 'hex'), esperado.length);
  return crypto.timingSafeEqual(esperado, calculado);
}

function generarToken() {
  return crypto.randomBytes(32).toString('base64url');
}

// Los tokens se guardan solo como hash: quien lea la base de datos no puede usarlos.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function leerCookie(req, nombre) {
  const cabecera = req.headers.cookie || '';
  for (const parte of cabecera.split(';')) {
    const [clave, ...valor] = parte.trim().split('=');
    if (clave === nombre) return decodeURIComponent(valor.join('='));
  }
  return null;
}

function emitirCookieSesion(res, token) {
  res.cookie(NOMBRE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DURACION_SESION_MS,
    path: '/'
  });
}

function crearSesion(db, usuarioId) {
  const token = generarToken();
  const expiraEn = new Date(Date.now() + DURACION_SESION_MS).toISOString();
  db.prepare('INSERT INTO sesiones (token_hash, usuario_id, expira_en) VALUES (?, ?, ?)').run(
    hashToken(token),
    usuarioId,
    expiraEn
  );
  return token;
}

function crearTokenCorreo(db, usuarioId, tipo) {
  const token = generarToken();
  const vigencia = tipo === 'verificacion' ? VIGENCIA_VERIFICACION_MS : VIGENCIA_RESTABLECER_MS;
  db.prepare('DELETE FROM tokens_correo WHERE usuario_id = ? AND tipo = ?').run(usuarioId, tipo);
  db.prepare('INSERT INTO tokens_correo (token_hash, usuario_id, tipo, expira_en) VALUES (?, ?, ?, ?)').run(
    hashToken(token),
    usuarioId,
    tipo,
    new Date(Date.now() + vigencia).toISOString()
  );
  return token;
}

// Consume el token: solo funciona una vez y solo si no ha expirado.
function consumirTokenCorreo(db, token, tipo) {
  const fila = db
    .prepare('SELECT usuario_id, expira_en FROM tokens_correo WHERE token_hash = ? AND tipo = ?')
    .get(hashToken(token), tipo);
  if (!fila) return null;

  db.prepare('DELETE FROM tokens_correo WHERE token_hash = ?').run(hashToken(token));
  if (new Date(fila.expira_en) < new Date()) return null;
  return fila.usuario_id;
}

function crearMiddlewareSesion(db) {
  return function requiereSesion(req, res, next) {
    const token = leerCookie(req, NOMBRE_COOKIE);
    if (!token) {
      return res.status(401).json({ error: 'Debes iniciar sesión para continuar' });
    }

    const fila = db
      .prepare(
        `SELECT u.id, u.email, u.nombre_completo, u.email_verificado, s.expira_en
         FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
         WHERE s.token_hash = ?`
      )
      .get(hashToken(token));

    if (!fila || new Date(fila.expira_en) < new Date()) {
      if (fila) db.prepare('DELETE FROM sesiones WHERE token_hash = ?').run(hashToken(token));
      return res.status(401).json({ error: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
    }

    req.usuario = {
      id: fila.id,
      email: fila.email,
      nombre: fila.nombre_completo,
      verificado: !!fila.email_verificado
    };
    next();
  };
}

// Las escrituras exigen correo verificado (FR-004a); las lecturas siguen disponibles.
function soloVerificadosParaEscribir(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  if (!req.usuario || !req.usuario.verificado) {
    return res.status(403).json({ error: 'Debes verificar tu correo electrónico antes de continuar.' });
  }
  next();
}

module.exports = {
  NOMBRE_COOKIE,
  hashPassword,
  verificarPassword,
  leerCookie,
  hashToken,
  emitirCookieSesion,
  crearSesion,
  crearTokenCorreo,
  consumirTokenCorreo,
  crearMiddlewareSesion,
  soloVerificadosParaEscribir
};
