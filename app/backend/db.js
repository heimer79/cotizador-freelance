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
        logo_base64 LONGTEXT,
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

    // Nuevas columnas en usuarios
    const [cols] = await conn.query(`SHOW COLUMNS FROM usuarios LIKE 'rol'`);
    if (cols.length === 0) {
      await conn.query(`ALTER TABLE usuarios ADD COLUMN rol VARCHAR(20) NOT NULL DEFAULT 'normal'`);
      await conn.query(`ALTER TABLE usuarios ADD COLUMN tipo_cuenta VARCHAR(20) NOT NULL DEFAULT 'gratuita'`);
      await conn.query(`ALTER TABLE usuarios ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'activo'`);
      await conn.query(`ALTER TABLE usuarios MODIFY COLUMN password_hash VARCHAR(255) NULL`);
    }

    // Logo del cliente
    const [colsLogoCliente] = await conn.query(`SHOW COLUMNS FROM clientes LIKE 'logo_base64'`);
    if (colsLogoCliente.length === 0) {
      await conn.query(`ALTER TABLE clientes ADD COLUMN logo_base64 LONGTEXT`);
    }

    // Columna temporal para cotizaciones
    const [colsTemp] = await conn.query(`SHOW COLUMNS FROM cotizaciones LIKE 'temporal'`);
    if (colsTemp.length === 0) {
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN temporal TINYINT(1) NOT NULL DEFAULT 0`);
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN ultima_actividad DATETIME DEFAULT CURRENT_TIMESTAMP`);
    }

    // T001: clientes - email y telefono
    const [colsClienteEmail] = await conn.query(`SHOW COLUMNS FROM clientes LIKE 'email'`);
    if (colsClienteEmail.length === 0) {
      await conn.query(`ALTER TABLE clientes ADD COLUMN email VARCHAR(255) DEFAULT NULL`);
      await conn.query(`ALTER TABLE clientes ADD COLUMN telefono VARCHAR(50) DEFAULT NULL`);
    }

    // T002: cotizaciones - campos de impuestos ampliados, emisor y cliente snapshot
    const [colsCotEmisorId] = await conn.query(`SHOW COLUMNS FROM cotizaciones LIKE 'emisor_id'`);
    if (colsCotEmisorId.length === 0) {
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN emisor_id INT DEFAULT NULL`);
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN emisor_tipo VARCHAR(30) DEFAULT NULL`);
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN iva_responsable TINYINT(1) NOT NULL DEFAULT 1`);
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN reteiva_activada TINYINT(1) NOT NULL DEFAULT 0`);
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN reteiva_porcentaje DECIMAL(5,2) DEFAULT 15.00`);
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN reteica_activada TINYINT(1) NOT NULL DEFAULT 0`);
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN reteica_porcentaje DECIMAL(5,2) DEFAULT NULL`);
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN compensar_retencion TINYINT(1) NOT NULL DEFAULT 0`);
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN cliente_email VARCHAR(255) DEFAULT NULL`);
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN cliente_telefono VARCHAR(50) DEFAULT NULL`);
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN cliente_logo_base64 LONGTEXT`);
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN plantilla_pdf VARCHAR(30) DEFAULT 'profesional'`);
      await conn.query(`ALTER TABLE cotizaciones ADD COLUMN colores_pdf TEXT DEFAULT NULL`);
    }

    // T025 prereq: catalogo - descripcion y cantidad_defecto
    const [colsCatDesc] = await conn.query(`SHOW COLUMNS FROM catalogo LIKE 'descripcion'`);
    if (colsCatDesc.length === 0) {
      await conn.query(`ALTER TABLE catalogo ADD COLUMN descripcion VARCHAR(500) DEFAULT NULL`);
      await conn.query(`ALTER TABLE catalogo ADD COLUMN cantidad_defecto INT NOT NULL DEFAULT 1`);
    }

    // T003: perfil - tipo_emisor
    const [colsPerfilTipo] = await conn.query(`SHOW COLUMNS FROM perfil LIKE 'tipo_emisor'`);
    if (colsPerfilTipo.length === 0) {
      await conn.query(`ALTER TABLE perfil ADD COLUMN tipo_emisor VARCHAR(30) NOT NULL DEFAULT 'persona_natural'`);
    }

    // T004: usuarios - totp_activo, plantilla_pdf_preferida, colores_pdf_preferidos
    const [colsUsuariosTotp] = await conn.query(`SHOW COLUMNS FROM usuarios LIKE 'totp_activo'`);
    if (colsUsuariosTotp.length === 0) {
      await conn.query(`ALTER TABLE usuarios ADD COLUMN totp_activo TINYINT(1) NOT NULL DEFAULT 0`);
      await conn.query(`ALTER TABLE usuarios ADD COLUMN plantilla_pdf_preferida VARCHAR(30) DEFAULT 'profesional'`);
      await conn.query(`ALTER TABLE usuarios ADD COLUMN colores_pdf_preferidos TEXT DEFAULT NULL`);
    }

    // T005: tabla emisores
    await conn.query(`
      CREATE TABLE IF NOT EXISTS emisores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        es_principal TINYINT(1) NOT NULL DEFAULT 0,
        nombre VARCHAR(255) NOT NULL,
        documento VARCHAR(50) DEFAULT NULL,
        email VARCHAR(255) DEFAULT NULL,
        telefono VARCHAR(50) DEFAULT NULL,
        logo_base64 LONGTEXT,
        tipo_emisor VARCHAR(30) NOT NULL DEFAULT 'persona_natural',
        iva_responsable TINYINT(1) NOT NULL DEFAULT 0,
        iva_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 19.00,
        retencion_porcentaje DECIMAL(5,2) DEFAULT NULL,
        retencion_concepto VARCHAR(100) DEFAULT NULL,
        reteiva_porcentaje DECIMAL(5,2) DEFAULT 15.00,
        reteica_porcentaje DECIMAL(5,2) DEFAULT NULL,
        reteica_municipio VARCHAR(100) DEFAULT NULL,
        compensar_retencion TINYINT(1) NOT NULL DEFAULT 0,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY idx_emisor_usuario (usuario_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // T006: tabla totp_2fa
    await conn.query(`
      CREATE TABLE IF NOT EXISTS totp_2fa (
        usuario_id INT PRIMARY KEY,
        secreto_cifrado VARCHAR(255) NOT NULL,
        metodo VARCHAR(20) NOT NULL DEFAULT 'totp',
        fecha_activacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // T007: tabla codigos_recuperacion
    await conn.query(`
      CREATE TABLE IF NOT EXISTS codigos_recuperacion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        codigo_hash VARCHAR(64) NOT NULL,
        usado TINYINT(1) NOT NULL DEFAULT 0,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY idx_recuperacion_usuario (usuario_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // T008: tabla plantillas_pdf
    await conn.query(`
      CREATE TABLE IF NOT EXISTS plantillas_pdf (
        id VARCHAR(30) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion VARCHAR(500) DEFAULT NULL,
        solo_premium TINYINT(1) NOT NULL DEFAULT 0,
        color_encabezado VARCHAR(7) NOT NULL,
        color_acento VARCHAR(7) NOT NULL,
        color_texto VARCHAR(7) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // T080: tabla enlaces_descarga
    await conn.query(`
      CREATE TABLE IF NOT EXISTS enlaces_descarga (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cotizacion_id INT NOT NULL,
        uuid VARCHAR(36) NOT NULL,
        fecha_expiracion DATETIME NOT NULL,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY idx_enlace_uuid (uuid),
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS auth_proveedores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        proveedor VARCHAR(20) NOT NULL,
        proveedor_id VARCHAR(255) DEFAULT NULL,
        fecha_vinculacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_usuario_proveedor (usuario_id, proveedor),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS suscripciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        fecha_inicio DATETIME NOT NULL,
        fecha_vencimiento DATETIME NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'activa',
        modalidad VARCHAR(20) NOT NULL,
        referencia_pasarela VARCHAR(255) DEFAULT NULL,
        pasarela VARCHAR(30) NOT NULL DEFAULT 'mercadopago',
        fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        KEY idx_suscripcion_usuario (usuario_id),
        KEY idx_suscripcion_estado (estado),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS grupos_clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_usuario_nombre_grupo (usuario_id, nombre),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS clientes_grupos (
        cliente_id INT NOT NULL,
        grupo_id INT NOT NULL,
        PRIMARY KEY (cliente_id, grupo_id),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
        FOREIGN KEY (grupo_id) REFERENCES grupos_clientes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS documentos_legales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tipo VARCHAR(30) NOT NULL,
        version VARCHAR(20) NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        contenido LONGTEXT NOT NULL,
        fecha_publicacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        UNIQUE KEY uq_tipo_version (tipo, version)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS aceptaciones_legales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        documento_id INT NOT NULL,
        fecha_aceptacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_usuario_documento (usuario_id, documento_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (documento_id) REFERENCES documentos_legales(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS configuracion_plataforma (
        clave VARCHAR(100) PRIMARY KEY,
        valor TEXT DEFAULT NULL,
        sensible TINYINT(1) NOT NULL DEFAULT 0,
        fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS notificaciones_admin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tipo VARCHAR(30) NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT NOT NULL,
        fecha DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        leida TINYINT(1) NOT NULL DEFAULT 0,
        KEY idx_notificacion_leida (leida),
        KEY idx_notificacion_fecha (fecha)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS enlaces_temporales (
        token VARCHAR(36) PRIMARY KEY,
        ruta_pdf TEXT NOT NULL,
        usuario_id INT NOT NULL,
        fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        fecha_expiracion DATETIME NOT NULL,
        KEY idx_enlace_expiracion (fecha_expiracion),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS historial_actividad (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        tipo VARCHAR(30) NOT NULL,
        detalle VARCHAR(255) DEFAULT NULL,
        fecha DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        KEY idx_actividad_usuario_fecha (usuario_id, fecha),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } finally {
    conn.release();
  }
}

async function sembrarDatos() {
  const conn = await pool.getConnection();
  try {
    // T008: Seed plantillas_pdf
    const [plantillasExistentes] = await conn.query(`SELECT COUNT(*) AS cnt FROM plantillas_pdf`);
    if (plantillasExistentes[0].cnt === 0) {
      await conn.query(`
        INSERT INTO plantillas_pdf (id, nombre, descripcion, solo_premium, color_encabezado, color_acento, color_texto) VALUES
        ('profesional', 'Profesional', 'Diseño limpio y corporativo', 0, '#1a56db', '#3b82f6', '#1f2937'),
        ('moderna', 'Moderna', 'Layout columnar con colores vivos', 1, '#059669', '#10b981', '#111827'),
        ('ejecutiva', 'Ejecutiva', 'Diseño sobrio con tonos oscuros', 1, '#1e293b', '#475569', '#f8fafc')
      `);
    }

    // T009: Poblar emisores iniciales desde perfil para usuarios sin emisor
    await conn.query(`
      INSERT IGNORE INTO emisores (usuario_id, es_principal, nombre, documento, tipo_emisor)
      SELECT p.usuario_id, 1, COALESCE(p.nombre, 'Mi perfil'), p.nit, 'persona_natural'
      FROM perfil p
      WHERE NOT EXISTS (SELECT 1 FROM emisores e WHERE e.usuario_id = p.usuario_id AND e.es_principal = 1)
    `);

    const [docs] = await conn.query(`SELECT COUNT(*) AS cnt FROM documentos_legales`);
    if (docs[0].cnt > 0) return;

    const documentos = [
      {
        tipo: 'privacidad',
        version: '1.0.0',
        titulo: 'Política de Privacidad y Tratamiento de Datos Personales',
        contenido: `<h1>Política de Privacidad y Tratamiento de Datos Personales</h1>
<p><strong>Quotizador</strong> (en adelante "la Plataforma"), desarrollada por Digital Pyme Solutions, recopila y trata los datos personales de sus usuarios de conformidad con la Ley 1581 de 2012 y el Decreto 1377 de 2013 de la República de Colombia.</p>
<h2>1. Responsable del Tratamiento</h2>
<p>Digital Pyme Solutions, contacto: contacto@digitalpymesolutions.dev</p>
<h2>2. Datos Recopilados</h2>
<p>Recopilamos: nombre completo, correo electrónico, tipo y número de documento de identidad, información de perfil profesional, cotizaciones y datos de clientes creados en la plataforma.</p>
<h2>3. Finalidad del Tratamiento</h2>
<p>Los datos se utilizan para: prestación del servicio, envío de comunicaciones relacionadas con la cuenta, soporte técnico, y cumplimiento de obligaciones legales.</p>
<h2>4. Derechos del Titular</h2>
<p>Como titular de los datos, tiene derecho a conocer, actualizar, rectificar y suprimir su información personal. Para ejercer estos derechos, escríbanos a contacto@digitalpymesolutions.dev.</p>
<h2>5. Seguridad</h2>
<p>Implementamos medidas técnicas y organizativas para proteger sus datos contra acceso no autorizado, pérdida o destrucción.</p>
<h2>6. Vigencia</h2>
<p>Esta política está vigente desde el 1 de octubre de 2026.</p>`
      },
      {
        tipo: 'sarlaft',
        version: '1.0.0',
        titulo: 'Declaración SARLAFT – Sistema de Administración del Riesgo de LA/FT',
        contenido: `<h1>Declaración SARLAFT</h1>
<p>En cumplimiento de la normativa colombiana sobre prevención del lavado de activos y financiación del terrorismo (LA/FT), <strong>Quotizador</strong> declara lo siguiente:</p>
<h2>1. Compromiso</h2>
<p>La Plataforma se compromete a no facilitar, directa ni indirectamente, operaciones relacionadas con el lavado de activos o la financiación del terrorismo.</p>
<h2>2. Uso Permitido</h2>
<p>La Plataforma está diseñada exclusivamente para la generación de cotizaciones y presupuestos de servicios profesionales lícitos. Queda prohibido su uso para fines ilegales.</p>
<h2>3. Obligación del Usuario</h2>
<p>Al usar la Plataforma, el usuario declara que los recursos utilizados para adquirir servicios premium provienen de actividades lícitas y que no está vinculado a listas de control de autoridades nacionales o internacionales.</p>
<h2>4. Reporte</h2>
<p>Cualquier operación sospechosa será reportada a las autoridades competentes conforme a la ley colombiana.</p>`
      },
      {
        tipo: 'donaciones',
        version: '1.0.0',
        titulo: 'Términos de Donaciones Voluntarias',
        contenido: `<h1>Términos de Donaciones Voluntarias</h1>
<p>Las donaciones realizadas a través de <strong>Quotizador</strong> son completamente voluntarias y no reembolsables.</p>
<h2>1. Carácter Voluntario</h2>
<p>Ninguna donación es requerida para acceder a las funcionalidades gratuitas de la Plataforma. Las donaciones son un apoyo voluntario al mantenimiento y desarrollo de la herramienta.</p>
<h2>2. No Reembolso</h2>
<p>Las donaciones no son reembolsables bajo ninguna circunstancia, salvo error técnico comprobable en el cobro.</p>
<h2>3. Procesamiento</h2>
<p>Las donaciones son procesadas por pasarelas de pago externas (MercadoPago, PayPal). Digital Pyme Solutions no almacena datos de tarjetas de crédito.</p>
<h2>4. Uso de los Fondos</h2>
<p>Los fondos recibidos se destinan exclusivamente al mantenimiento de servidores, desarrollo de nuevas funcionalidades y soporte de la Plataforma.</p>`
      },
      {
        tipo: 'terminos_uso',
        version: '1.0.0',
        titulo: 'Términos y Condiciones de Uso',
        contenido: `<h1>Términos y Condiciones de Uso</h1>
<p>Al registrarse y utilizar <strong>Quotizador</strong>, el usuario acepta los presentes Términos y Condiciones.</p>
<h2>1. Descripción del Servicio</h2>
<p>Quotizador es una herramienta en línea para la creación de cotizaciones y presupuestos profesionales, disponible en modalidad gratuita y premium.</p>
<h2>2. Cuenta de Usuario</h2>
<p>El usuario es responsable de mantener la confidencialidad de sus credenciales y de todas las actividades realizadas bajo su cuenta.</p>
<h2>3. Uso Aceptable</h2>
<p>Queda prohibido: usar la Plataforma para fines ilegales, intentar vulnerar la seguridad del sistema, suplantar identidades o distribuir contenido malicioso.</p>
<h2>4. Cuenta Gratuita</h2>
<p>La cuenta gratuita permite crear cotizaciones durante la sesión activa. Los datos no se conservan entre sesiones.</p>
<h2>5. Modificaciones</h2>
<p>Digital Pyme Solutions se reserva el derecho de modificar estos términos. Los cambios serán notificados y requerirán nueva aceptación.</p>
<h2>6. Ley Aplicable</h2>
<p>Estos términos se rigen por las leyes de la República de Colombia.</p>`
      },
      {
        tipo: 'terminos_premium',
        version: '1.0.0',
        titulo: 'Términos y Condiciones de la Cuenta Premium',
        contenido: `<h1>Términos y Condiciones de la Cuenta Premium</h1>
<p>La suscripción Premium de <strong>Quotizador</strong> ofrece funcionalidades adicionales mediante pago anual.</p>
<h2>1. Precio y Facturación</h2>
<p>El precio de la suscripción Premium es de USD $20 por año (menos de USD $2 al mes). El cobro se realiza a través de MercadoPago.</p>
<h2>2. Funcionalidades Premium</h2>
<ul>
<li>Sin publicidad en la Plataforma</li>
<li>Guardado permanente de hasta 500 cotizaciones</li>
<li>Guardado permanente de hasta 200 clientes</li>
<li>Creación de hasta 50 grupos de clientes</li>
</ul>
<h2>3. Renovación</h2>
<p>La suscripción puede configurarse para renovación automática anual. El usuario puede cancelar la renovación automática en cualquier momento desde su perfil.</p>
<h2>4. Vencimiento y Período de Gracia</h2>
<p>Al vencer la suscripción sin renovación, el usuario entra en un período de gracia de 30 días con acceso de solo lectura. Transcurridos 90 días adicionales sin renovación, los datos de cotizaciones, clientes y grupos serán eliminados.</p>
<h2>5. No Reembolso</h2>
<p>Los pagos de suscripción no son reembolsables salvo error técnico comprobable.</p>`
      },
      // T048: Documento unificado para registro simplificado (FR-035)
      {
        tipo: 'unificado',
        version: '1.0.0',
        titulo: 'Términos de Uso y Política de Privacidad — PresupuestosPro',
        contenido: `<h1>Términos de Uso y Política de Privacidad — PresupuestosPro</h1>
<p>Al registrarte en PresupuestosPro aceptas los presentes Términos de Uso y la Política de Privacidad de forma conjunta.</p>
<h2>1. Sobre el Servicio</h2>
<p>PresupuestosPro es una plataforma colombiana para la generación de cotizaciones profesionales. El uso del servicio está sujeto al cumplimiento de este documento.</p>
<h2>2. Datos Personales</h2>
<p>Recopilamos únicamente los datos necesarios para prestar el servicio: nombre, correo electrónico y documento de identidad. Los datos se utilizan exclusivamente para la prestación del servicio y nunca se venden a terceros.</p>
<h2>3. Uso Permitido</h2>
<p>La plataforma está diseñada para la generación de cotizaciones de servicios profesionales lícitos. Queda prohibido su uso para fines ilegales o fraudulentos.</p>
<h2>4. Limitación de Responsabilidad</h2>
<p>PresupuestosPro no valida la exactitud de los datos ingresados por el usuario. La plataforma se provee "tal cual" y no garantiza resultados específicos.</p>
<h2>5. Modificaciones</h2>
<p>Podemos actualizar estos términos. Si los cambios son significativos, te notificaremos y solicitaremos nueva aceptación.</p>
<h2>6. Contacto</h2>
<p>Consultas o solicitudes de eliminación de datos: soporte@presupuestospro.co</p>`
      }
    ];

    for (const doc of documentos) {
      await conn.query(
        `INSERT IGNORE INTO documentos_legales (tipo, version, titulo, contenido) VALUES (?, ?, ?, ?)`,
        [doc.tipo, doc.version, doc.titulo, doc.contenido]
      );
    }

    // Vincular proveedor 'email' para usuarios existentes sin proveedor
    await conn.query(`
      INSERT IGNORE INTO auth_proveedores (usuario_id, proveedor)
      SELECT id, 'email' FROM usuarios
    `);

    // Asignar rol admin al usuario con ADMIN_EMAIL
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await conn.query(
        `UPDATE usuarios SET rol = 'admin' WHERE email = ?`,
        [adminEmail.trim().toLowerCase()]
      );
    }
  } finally {
    conn.release();
  }
}

async function sincronizarAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  await db.run(
    `UPDATE usuarios SET rol = 'admin' WHERE email = ?`,
    [adminEmail.trim().toLowerCase()]
  );
}

async function abrirBaseDatos() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Quotizador',
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4'
  });

  await crearEsquema();
  await sembrarDatos();
  await sincronizarAdmin();
  return db;
}

module.exports = { abrirBaseDatos, db };
