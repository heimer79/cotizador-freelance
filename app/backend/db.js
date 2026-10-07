const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { crearEsquemaDonaciones } = require('./src/models/donacion');

const TABLAS_V0 = ['perfil', 'clientes', 'catalogo', 'presupuestos', 'lineas_presupuesto', 'contador_presupuestos'];

function tablaExiste(db, nombre) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(nombre);
}

// El esquema v0 (un único espacio de datos, sin usuarios) no es compatible con la spec 003.
// Sus tablas se renombran con sufijo _v0 para conservar los datos sin mezclarlos con los nuevos.
function apartarEsquemaV0(db) {
  if (!tablaExiste(db, 'clientes')) return;
  const columnas = db.prepare('PRAGMA table_info(clientes)').all();
  if (columnas.some((c) => c.name === 'usuario_id')) return;

  for (const tabla of TABLAS_V0) {
    if (tablaExiste(db, tabla)) {
      db.exec(`ALTER TABLE ${tabla} RENAME TO ${tabla}_v0`);
    }
  }
}

function abrirBaseDatos(ruta = path.join(__dirname, 'datos', 'presupuestospro.sqlite')) {
  if (ruta !== ':memory:') {
    const directorio = path.dirname(ruta);
    fs.mkdirSync(directorio, { recursive: true });
  }

  const db = new Database(ruta);
  db.pragma('foreign_keys = ON');

  apartarEsquemaV0(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_completo TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('CC', 'NIT', 'CE', 'pasaporte')),
      numero_documento TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      email_verificado INTEGER NOT NULL DEFAULT 0,
      fecha_registro TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sesiones (
      token_hash TEXT PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      expira_en TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tokens_correo (
      token_hash TEXT PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL CHECK (tipo IN ('verificacion', 'restablecer')),
      expira_en TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS perfil (
      usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      nombre TEXT,
      nit TEXT,
      contacto TEXT,
      logo_base64 TEXT,
      regimen TEXT CHECK (regimen IS NULL OR regimen IN ('ordinario', 'simple', 'no_responsable_iva'))
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      documento TEXT,
      contacto TEXT,
      tipo TEXT NOT NULL CHECK (tipo IN ('persona_natural', 'persona_juridica')),
      agente_retenedor INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS catalogo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      precio_defecto INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cotizaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      numero TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'emitida')),
      fecha_emision TEXT NOT NULL,
      fecha_vigencia TEXT NOT NULL,
      cliente_id INTEGER,
      cliente_nombre TEXT NOT NULL,
      cliente_documento TEXT,
      cliente_contacto TEXT,
      cliente_tipo TEXT NOT NULL,
      cliente_agente_retenedor INTEGER NOT NULL DEFAULT 0,
      emisor_nombre TEXT,
      emisor_documento TEXT,
      emisor_contacto TEXT,
      emisor_regimen TEXT,
      emisor_logo_base64 TEXT,
      iva_tarifa INTEGER NOT NULL DEFAULT 19 CHECK (iva_tarifa IN (19, 5, 0)),
      retencion_activada INTEGER NOT NULL DEFAULT 0,
      retencion_concepto TEXT,
      retencion_porcentaje REAL,
      UNIQUE (usuario_id, numero)
    );

    CREATE TABLE IF NOT EXISTS lineas_cotizacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cotizacion_id INTEGER NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
      descripcion TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario INTEGER NOT NULL,
      origen TEXT NOT NULL CHECK (origen IN ('catalogo', 'manual')),
      servicio_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS contador_cotizaciones (
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      anio TEXT NOT NULL,
      ultimo_numero INTEGER NOT NULL,
      PRIMARY KEY (usuario_id, anio)
    );
  `);

  crearEsquemaDonaciones(db);

  return db;
}

module.exports = { abrirBaseDatos };
