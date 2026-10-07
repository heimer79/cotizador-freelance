# Data Model: Roles, Cuentas Premium y Marco Legal

**Feature**: 005-roles-cuentas-legal | **Date**: 2026-10-07

## Entities

### Existing — Modified

#### usuarios (tabla existente)

Columnas nuevas añadidas a la tabla existente.

| Campo | Tipo | Constraints | Default | Descripción |
|-------|------|-------------|---------|-------------|
| rol | TEXT | NOT NULL, CHECK (IN 'normal','admin') | 'normal' | Rol del usuario (FR-001) |
| tipo_cuenta | TEXT | NOT NULL, CHECK (IN 'gratuita','premium') | 'gratuita' | Tipo de cuenta activa (FR-013) |
| estado | TEXT | NOT NULL, CHECK (IN 'activo','suspendido') | 'activo' | Estado de la cuenta (FR-006b) |
| password_hash | TEXT | NOT NULL → nullable | — | Ahora nullable: usuarios con solo login social no tienen contraseña (FR-012b) |

**Cambio en constraint**: `password_hash TEXT` pasa de `NOT NULL` a nullable para permitir registro exclusivo por proveedor social.

**Relaciones**:
- 1:N → auth_proveedores (un usuario puede tener múltiples proveedores de auth)
- 1:N → suscripciones (historial de suscripciones premium)
- 1:N → aceptaciones_legales (registro de aceptación de documentos legales)
- 1:N → cotizaciones (existente)
- 1:N → clientes (existente)
- 1:N → grupos_clientes (nuevo, solo premium)
- 1:N → donacion (existente)
- 1:N → historial_actividad (registro de actividad del usuario)

---

### New Entities

#### auth_proveedores

Proveedores de autenticación vinculados a un usuario. Permite múltiples métodos de login (email, Google, Facebook) para la misma cuenta.

| Campo | Tipo | Constraints | Default | Descripción |
|-------|------|-------------|---------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Identificador único |
| usuario_id | INTEGER | NOT NULL, FK → usuarios(id) ON DELETE CASCADE | — | Usuario vinculado |
| proveedor | TEXT | NOT NULL, CHECK (IN 'email','google','facebook') | — | Tipo de proveedor |
| proveedor_id | TEXT | — | — | ID externo del proveedor (sub de Google, ID de Facebook). NULL para 'email' |
| fecha_vinculacion | TEXT | NOT NULL | datetime('now') | Fecha de vinculación del proveedor |

**Constraints de tabla**: UNIQUE (usuario_id, proveedor)

**Validations**:
- Un usuario puede tener como máximo un registro por proveedor.
- Al registrarse con proveedor social, si ya existe un usuario con ese email, se vincula el proveedor a la cuenta existente (FR-011).

---

#### suscripciones

Historial de suscripciones premium de un usuario. Controla la vigencia, el período de gracia y la retención de datos.

| Campo | Tipo | Constraints | Default | Descripción |
|-------|------|-------------|---------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Identificador único |
| usuario_id | INTEGER | NOT NULL, FK → usuarios(id) ON DELETE CASCADE | — | Usuario suscrito |
| fecha_inicio | TEXT | NOT NULL | — | Fecha de inicio de la suscripción |
| fecha_vencimiento | TEXT | NOT NULL | — | Fecha de vencimiento (1 año desde inicio) |
| estado | TEXT | NOT NULL, CHECK (IN 'activa','vencida','cancelada','gracia','retencion') | 'activa' | Estado actual |
| modalidad | TEXT | NOT NULL, CHECK (IN 'automatica','manual') | — | Renovación automática o pago manual (FR-019) |
| referencia_pasarela | TEXT | — | — | Referencia de la transacción de pago |
| pasarela | TEXT | NOT NULL, CHECK (IN 'mercadopago') | 'mercadopago' | Pasarela usada para el pago (solo MercadoPago para suscripciones) |
| fecha_creacion | TEXT | NOT NULL | strftime('%Y-%m-%dT%H:%M:%fZ', 'now') | Timestamp de creación del registro |

**State transitions**:
```
activa → vencida       (fecha_vencimiento alcanzada sin renovación)
vencida → gracia       (automático: 30 días de gracia, datos en solo lectura)
gracia → retencion     (no renovó en 30 días: 90 días de retención antes de eliminar datos)
retencion → (eliminación de datos de cotizaciones, clientes, grupos)
activa → cancelada     (usuario cancela renovación automática)
cancelada → activa     (usuario renueva manualmente)
vencida → activa       (usuario renueva)
gracia → activa        (usuario renueva durante gracia)
retencion → activa     (usuario renueva durante retención, datos se recuperan)
```

**Indexes**: `idx_suscripcion_usuario (usuario_id)`, `idx_suscripcion_estado (estado)`

---

#### grupos_clientes

Agrupaciones lógicas de clientes para usuarios premium. Máximo 50 grupos por usuario (FR-023).

| Campo | Tipo | Constraints | Default | Descripción |
|-------|------|-------------|---------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Identificador único |
| usuario_id | INTEGER | NOT NULL, FK → usuarios(id) ON DELETE CASCADE | — | Usuario propietario |
| nombre | TEXT | NOT NULL | — | Nombre del grupo |
| fecha_creacion | TEXT | NOT NULL | datetime('now') | Fecha de creación |

**Constraints de tabla**: UNIQUE (usuario_id, nombre)

---

#### clientes_grupos (tabla pivote)

Asignación de clientes a grupos. Un cliente puede pertenecer a múltiples grupos (FR-023).

| Campo | Tipo | Constraints | Default | Descripción |
|-------|------|-------------|---------|-------------|
| cliente_id | INTEGER | NOT NULL, FK → clientes(id) ON DELETE CASCADE | — | Cliente asignado |
| grupo_id | INTEGER | NOT NULL, FK → grupos_clientes(id) ON DELETE CASCADE | — | Grupo de destino |

**Constraints de tabla**: PRIMARY KEY (cliente_id, grupo_id)

---

#### documentos_legales

Documentos legales versionados de la plataforma. Insertados por seed; no editables por admin.

| Campo | Tipo | Constraints | Default | Descripción |
|-------|------|-------------|---------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Identificador único |
| tipo | TEXT | NOT NULL, CHECK (IN 'privacidad','sarlaft','donaciones','terminos_uso','terminos_premium') | — | Tipo de documento |
| version | TEXT | NOT NULL | — | Versión semántica (e.g. '1.0.0') |
| titulo | TEXT | NOT NULL | — | Título legible del documento |
| contenido | TEXT | NOT NULL | — | Contenido completo del documento (HTML o Markdown) |
| fecha_publicacion | TEXT | NOT NULL | datetime('now') | Fecha de publicación |
| activo | INTEGER | NOT NULL | 1 | 1 = versión vigente, 0 = versión anterior |

**Constraints de tabla**: UNIQUE (tipo, version)

**Validations**:
- Solo una versión por tipo puede tener `activo = 1`. Al publicar una nueva versión, la anterior se marca con `activo = 0`.

---

#### aceptaciones_legales

Registro de aceptación de documentos legales por parte de usuarios. Requerido por Ley 1581 de 2012.

| Campo | Tipo | Constraints | Default | Descripción |
|-------|------|-------------|---------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Identificador único |
| usuario_id | INTEGER | NOT NULL, FK → usuarios(id) ON DELETE CASCADE | — | Usuario que acepta |
| documento_id | INTEGER | NOT NULL, FK → documentos_legales(id) | — | Documento aceptado |
| fecha_aceptacion | TEXT | NOT NULL | datetime('now') | Fecha y hora de la aceptación |

**Constraints de tabla**: UNIQUE (usuario_id, documento_id)

**Validations**:
- Al publicar una nueva versión de un documento legal, las aceptaciones anteriores de ese tipo quedan inválidas. El middleware `requiereAceptacionLegal` compara la versión aceptada con la versión activa.

---

#### configuracion_plataforma

Configuración operativa de la plataforma, editable por el administrador.

| Campo | Tipo | Constraints | Default | Descripción |
|-------|------|-------------|---------|-------------|
| clave | TEXT | PRIMARY KEY | — | Clave de configuración |
| valor | TEXT | — | — | Valor de la configuración (puede ser JSON para configuraciones complejas) |
| sensible | INTEGER | NOT NULL | 0 | 1 = valor encriptado (credenciales API) |
| fecha_actualizacion | TEXT | NOT NULL | datetime('now') | Última actualización |

**Claves predefinidas**:
- `adsense_id` — Identificador de Google AdSense (FR-028)
- `mercadopago_enlace_donacion` — Enlace de MercadoPago para donaciones (FR-026)
- `paypal_enlace_donacion` — Enlace de PayPal para donaciones (FR-027)
- `mercadopago_access_token` — Access Token de MercadoPago para suscripciones (sensible)
- `google_oauth_client_id` — Client ID de Google OAuth (FR-012)
- `google_oauth_client_secret` — Client Secret de Google OAuth (sensible)
- `facebook_oauth_app_id` — App ID de Facebook OAuth (FR-012)
- `facebook_oauth_app_secret` — App Secret de Facebook OAuth (sensible)
- `gmail_client_id` — Client ID de Gmail API (FR-038)
- `gmail_client_secret` — Client Secret de Gmail API (sensible)
- `gmail_refresh_token` — Refresh Token de Gmail API (sensible)
- `gmail_correo_remitente` — Dirección de correo remitente autorizada (FR-038)

---

#### notificaciones_admin

Notificaciones del sistema para administradores (errores de API, correos fallidos, pagos fallidos).

| Campo | Tipo | Constraints | Default | Descripción |
|-------|------|-------------|---------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Identificador único |
| tipo | TEXT | NOT NULL, CHECK (IN 'error_api','correo_fallido','pago_fallido','config_error') | — | Categoría de la notificación |
| titulo | TEXT | NOT NULL | — | Título descriptivo |
| descripcion | TEXT | NOT NULL | — | Detalle del error o evento |
| fecha | TEXT | NOT NULL | strftime('%Y-%m-%dT%H:%M:%fZ', 'now') | Fecha y hora del evento |
| leida | INTEGER | NOT NULL | 0 | 0 = no leída, 1 = leída |

**Indexes**: `idx_notificacion_leida (leida)`, `idx_notificacion_fecha (fecha)`

---

#### enlaces_temporales

Enlaces públicos temporales para descargar PDFs de cotizaciones compartidas por WhatsApp.

| Campo | Tipo | Constraints | Default | Descripción |
|-------|------|-------------|---------|-------------|
| token | TEXT | PRIMARY KEY | — | Token UUID único (en la URL pública) |
| ruta_pdf | TEXT | NOT NULL | — | Ruta del archivo PDF en el filesystem |
| usuario_id | INTEGER | NOT NULL, FK → usuarios(id) ON DELETE CASCADE | — | Usuario que generó el enlace |
| fecha_creacion | TEXT | NOT NULL | strftime('%Y-%m-%dT%H:%M:%fZ', 'now') | Fecha de creación |
| fecha_expiracion | TEXT | NOT NULL | — | Fecha de expiración (creación + 7 días) |

**Indexes**: `idx_enlace_expiracion (fecha_expiracion)`

---

#### historial_actividad

Registro de actividad reciente del usuario normal (últimos logins y cambios de cuenta). FR-049.

| Campo | Tipo | Constraints | Default | Descripción |
|-------|------|-------------|---------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Identificador único |
| usuario_id | INTEGER | NOT NULL, FK → usuarios(id) ON DELETE CASCADE | — | Usuario asociado |
| tipo | TEXT | NOT NULL, CHECK (IN 'login','cambio_tipo_cuenta','aceptacion_terminos','cambio_password') | — | Tipo de actividad |
| detalle | TEXT | — | — | Detalle adicional (e.g. 'google', 'facebook', 'email' para logins) |
| fecha | TEXT | NOT NULL | strftime('%Y-%m-%dT%H:%M:%fZ', 'now') | Fecha y hora |

**Indexes**: `idx_actividad_usuario_fecha (usuario_id, fecha)`

**Data retention**: Se conservan solo las últimas 20 entradas por usuario. Las más antiguas se eliminan al insertar nuevas.

---

## Entity Relationship Diagram

```
usuarios 1──N auth_proveedores
usuarios 1──N suscripciones
usuarios 1──N aceptaciones_legales
usuarios 1──N cotizaciones (existente)
usuarios 1──N clientes (existente)
usuarios 1──N grupos_clientes
usuarios 1──N donacion (existente)
usuarios 1──N enlaces_temporales
usuarios 1──N historial_actividad

grupos_clientes N──M clientes (via clientes_grupos)
documentos_legales 1──N aceptaciones_legales
```

## Migration Strategy

Las nuevas tablas y columnas se crean con `CREATE TABLE IF NOT EXISTS` y `ALTER TABLE ... ADD COLUMN` en `db.js`, siguiendo el patrón existente. La migración es incremental y no destructiva:

1. Añadir columnas a `usuarios` (rol, tipo_cuenta, estado, hacer password_hash nullable).
2. Crear tablas nuevas en orden de dependencia de FK.
3. Insertar documentos legales iniciales con seed.
4. Crear registro en `auth_proveedores` con `proveedor = 'email'` para cada usuario existente.
5. Asignar rol admin al usuario con email definido en `ADMIN_EMAIL` (variable de entorno).

## Storage Limits (Premium)

| Entidad | Límite por usuario premium | FR |
|---------|---------------------------|-----|
| Cotizaciones activas | 500 | FR-021 |
| Clientes | 200 | FR-022 |
| Grupos de clientes | 50 | FR-023 |

Los límites se verifican en el middleware antes de insertar. Usuarios gratuitos: 0 cotizaciones/clientes/grupos persistentes (se crean temporales en sesión).
