const mysql = require('mysql2/promise');

let pool;

const db = {
  async get(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  },
  async all(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
  async run(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    return { insertId: result.insertId, affectedRows: result.affectedRows };
  },
  async transaction(fn) {
    const conn = await pool.getConnection();
    const tx = {
      async get(sql, params = []) { const [rows] = await conn.execute(sql, params); return rows[0] || null; },
      async all(sql, params = []) { const [rows] = await conn.execute(sql, params); return rows; },
      async run(sql, params = []) { const [result] = await conn.execute(sql, params); return { insertId: result.insertId, affectedRows: result.affectedRows }; }
    };
    try {
      await conn.beginTransaction();
      const result = await fn(tx);
      await conn.commit();
      return result;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
};

async function crearEsquema() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_completo VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        tipo_documento VARCHAR(20) NOT NULL,
        numero_documento VARCHAR(50) NOT NULL,
        password_hash VARCHAR(255),
        email_verificado TINYINT(1) NOT NULL DEFAULT 0,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS sesiones (
        token_hash VARCHAR(64) PRIMARY KEY,
        usuario_id INT NOT NULL,
        expira_en DATETIME NOT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS tokens_correo (
        token_hash VARCHAR(64) PRIMARY KEY,
        usuario_id INT NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        expira_en DATETIME NOT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS perfil (
        usuario_id INT PRIMARY KEY,
        nombre VARCHAR(255),
        nit VARCHAR(50),
        contacto VARCHAR(500),
        logo_base64 LONGTEXT,
        regimen VARCHAR(30),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        documento VARCHAR(50),
        contacto VARCHAR(500),
        tipo VARCHAR(30) NOT NULL,
        agente_retenedor TINYINT(1) NOT NULL DEFAULT 0,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS catalogo (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        precio_defecto INT NOT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS cotizaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        numero VARCHAR(20) NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'borrador',
        fecha_emision VARCHAR(10) NOT NULL,
        fecha_vigencia VARCHAR(10) NOT NULL,
        cliente_id INT,
        cliente_nombre VARCHAR(255) NOT NULL,
        cliente_documento VARCHAR(50),
        cliente_contacto VARCHAR(500),
        cliente_tipo VARCHAR(30) NOT NULL,
        cliente_agente_retenedor TINYINT(1) NOT NULL DEFAULT 0,
        emisor_nombre VARCHAR(255),
        emisor_documento VARCHAR(50),
        emisor_contacto VARCHAR(500),
        emisor_regimen VARCHAR(30),
        emisor_logo_base64 LONGTEXT,
        iva_tarifa INT NOT NULL DEFAULT 19,
        retencion_activada TINYINT(1) NOT NULL DEFAULT 0,
        retencion_concepto VARCHAR(100),
        retencion_porcentaje DECIMAL(5,2),
        UNIQUE KEY uq_usuario_numero (usuario_id, numero),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS lineas_cotizacion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cotizacion_id INT NOT NULL,
        descripcion VARCHAR(500) NOT NULL,
        cantidad INT NOT NULL,
        precio_unitario INT NOT NULL,
        origen VARCHAR(20) NOT NULL,
        servicio_id INT,
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS contador_cotizaciones (
        usuario_id INT NOT NULL,
        anio VARCHAR(4) NOT NULL,
        ultimo_numero INT NOT NULL,
        PRIMARY KEY (usuario_id, anio),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS donacion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        profesional_id INT NOT NULL,
        monto INT NOT NULL,
        estado VARCHAR(20) NOT NULL,
        referencia_pasarela VARCHAR(100) UNIQUE,
        pasarela VARCHAR(30) NOT NULL,
        fecha_creacion DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        fecha_confirmacion DATETIME(3),
        email_enviado TINYINT(1) NOT NULL DEFAULT 0,
        FOREIGN KEY (profesional_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [indexes] = await conn.query(`SHOW INDEX FROM donacion WHERE Key_name = 'idx_donacion_profesional_fecha'`);
    if (indexes.length === 0) {
      await conn.query(`CREATE INDEX idx_donacion_profesional_fecha ON donacion (profesional_id, fecha_creacion)`);
    }
    const [indexes2] = await conn.query(`SHOW INDEX FROM donacion WHERE Key_name = 'idx_donacion_referencia'`);
    if (indexes2.length === 0) {
      await conn.query(`CREATE INDEX idx_donacion_referencia ON donacion (referencia_pasarela)`);
    }
  } finally {
    conn.release();
  }
}

async function abrirBaseDatos() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'presupuestospro',
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4'
  });

  await crearEsquema();
  return db;
}

module.exports = { abrirBaseDatos, db };
