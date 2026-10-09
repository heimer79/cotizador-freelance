const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { db } = require('../../db');

const CLAVE_CIFRADO = process.env.CONFIG_ENCRYPTION_KEY || 'presupuestospro-default-key-32ch';
if (!process.env.CONFIG_ENCRYPTION_KEY) {
  console.warn('[SEGURIDAD] CONFIG_ENCRYPTION_KEY no está definida. Se usa clave por defecto — configúrala en producción.');
}
const RUTA_ADS_CONFIG = path.join(__dirname, '..', 'config', 'ads-config.json');

// Un espacio publicitario necesita Slot ID de AdSense si lo usa directamente o como fallback (FR-008).
function clavesSlotsAdsense() {
  try {
    const { espacios } = JSON.parse(fs.readFileSync(RUTA_ADS_CONFIG, 'utf8'));
    return espacios
      .filter((espacio) => espacio.tipo === 'adsense' || espacio.fallback === 'adsense')
      .map((espacio) => `adsense_slot__${espacio.id}`);
  } catch {
    return [];
  }
}

function cifrar(texto) {
  const clave = Buffer.from(CLAVE_CIFRADO.padEnd(32).slice(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', clave, iv);
  const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + cifrado.toString('hex');
}

function descifrar(texto) {
  try {
    const [ivHex, cifradoHex] = texto.split(':');
    const clave = Buffer.from(CLAVE_CIFRADO.padEnd(32).slice(0, 32));
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', clave, iv);
    return Buffer.concat([decipher.update(Buffer.from(cifradoHex, 'hex')), decipher.final()]).toString('utf8');
  } catch {
    return texto;
  }
}

async function obtener(clave) {
  const fila = await db.get('SELECT valor, sensible FROM configuracion_plataforma WHERE clave = ?', [clave]);
  if (!fila) return null;
  if (fila.sensible && fila.valor) return descifrar(fila.valor);
  return fila.valor;
}

async function establecer(clave, valor, sensible = false) {
  const valorGuardar = sensible && valor ? cifrar(valor) : valor;
  await db.run(
    `INSERT INTO configuracion_plataforma (clave, valor, sensible) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE valor = VALUES(valor), sensible = VALUES(sensible)`,
    [clave, valorGuardar, sensible ? 1 : 0]
  );
}

async function obtenerSeccion(seccion) {
  const prefijos = {
    adsense: ['adsense_id', ...clavesSlotsAdsense()],
    pasarelas: ['mercadopago_enlace_donacion', 'paypal_enlace_donacion', 'mercadopago_access_token'],
    auth_social: ['google_oauth_client_id', 'google_oauth_client_secret'],
    correo: ['gmail_client_id', 'gmail_client_secret', 'gmail_refresh_token', 'gmail_correo_remitente']
  };
  const claves = prefijos[seccion] || [];
  const resultado = {};
  for (const clave of claves) {
    resultado[clave] = await obtener(clave);
  }
  return resultado;
}

async function establecerSeccion(seccion, valores) {
  const sensibles = new Set([
    'mercadopago_access_token', 'google_oauth_client_secret',
    'gmail_client_secret', 'gmail_refresh_token'
  ]);
  for (const [clave, valor] of Object.entries(valores)) {
    await establecer(clave, valor, sensibles.has(clave));
  }
}

module.exports = { obtener, establecer, obtenerSeccion, establecerSeccion, cifrar, descifrar };
