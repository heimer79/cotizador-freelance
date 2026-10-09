# Data Model: Cotización UX, Impuestos y Mejoras Generales

**Feature**: 006-cotizacion-ux-impuestos | **Date**: 2026-10-08

## Existing Tables — Modifications

### `perfil` — Agregar campo de tipo de emisor

| Columna | Tipo | Cambio | FR |
|---------|------|--------|-----|
| `tipo_emisor` | `VARCHAR(30) DEFAULT 'persona_natural'` | ADD | FR-007 |

> Valores: `persona_natural`, `persona_juridica`. Indica el tipo por defecto del usuario. Los emisores individuales heredan o sobreescriben este valor.

### `clientes` — Agregar campos de contacto expandidos

| Columna | Tipo | Cambio | FR |
|---------|------|--------|-----|
| `email` | `VARCHAR(255)` | ADD | FR-002 |
| `telefono` | `VARCHAR(50)` | ADD | FR-002 |

> Actualmente `contacto` es un campo VARCHAR(500) libre. Se agregan `email` y `telefono` como campos separados para el formulario expandido. `contacto` se mantiene para compatibilidad.

### `catalogo` — Agregar descripción y cantidad predeterminada

| Columna | Tipo | Cambio | FR |
|---------|------|--------|-----|
| `descripcion` | `VARCHAR(500)` | ADD | FR-014 |
| `cantidad_defecto` | `INT NOT NULL DEFAULT 1` | ADD | FR-015 |

> `nombre` ya existe. Se agrega `descripcion` para el detalle largo del servicio y `cantidad_defecto` para prellenar en la cotización.

### `cotizaciones` — Ampliar impuestos y emisor

| Columna | Tipo | Cambio | FR |
|---------|------|--------|-----|
| `emisor_id` | `INT` | ADD | FR-020 |
| `emisor_tipo` | `VARCHAR(30)` | ADD | FR-008 |
| `iva_responsable` | `TINYINT(1) NOT NULL DEFAULT 1` | ADD | FR-009 |
| `reteiva_activada` | `TINYINT(1) NOT NULL DEFAULT 0` | ADD | FR-011 |
| `reteiva_porcentaje` | `DECIMAL(5,2) DEFAULT 15.00` | ADD | FR-011 |
| `reteica_activada` | `TINYINT(1) NOT NULL DEFAULT 0` | ADD | FR-011 |
| `reteica_porcentaje` | `DECIMAL(5,2)` | ADD | FR-011 |
| `compensar_retencion` | `TINYINT(1) NOT NULL DEFAULT 0` | ADD | FR-012 |
| `cliente_email` | `VARCHAR(255)` | ADD | FR-005 (snapshot) |
| `cliente_telefono` | `VARCHAR(50)` | ADD | FR-005 (snapshot) |
| `cliente_logo_base64` | `LONGTEXT` | ADD | FR-004 (snapshot) |
| `plantilla_pdf` | `VARCHAR(30) DEFAULT 'profesional'` | ADD | FR-024 |
| `colores_pdf` | `TEXT` | ADD | FR-025 (JSON) |

> El snapshot del cliente se amplía con email, teléfono y logo para que el PDF y el historial sean completos incluso si se elimina el cliente (EC-10).

### `usuarios` — Agregar preferencias 2FA y PDF

| Columna | Tipo | Cambio | FR |
|---------|------|--------|-----|
| `totp_activo` | `TINYINT(1) NOT NULL DEFAULT 0` | ADD | FR-034 |
| `plantilla_pdf_preferida` | `VARCHAR(30) DEFAULT 'profesional'` | ADD | FR-026 |
| `colores_pdf_preferidos` | `TEXT` | ADD | FR-026 (JSON) |

## New Tables

### `emisores`

Perfiles de emisor (1:N con usuario). FR-018, FR-019, FR-020.

| Columna | Tipo | Constraint | Descripción |
|---------|------|-----------|-------------|
| `id` | `INT AUTO_INCREMENT` | PK | |
| `usuario_id` | `INT NOT NULL` | FK → usuarios(id) ON DELETE CASCADE | |
| `es_principal` | `TINYINT(1) NOT NULL DEFAULT 0` | | Emisor por defecto del usuario |
| `nombre` | `VARCHAR(255) NOT NULL` | | Razón social o nombre |
| `documento` | `VARCHAR(50)` | | NIT o cédula |
| `email` | `VARCHAR(255)` | | Correo de contacto del emisor |
| `telefono` | `VARCHAR(50)` | | Teléfono del emisor |
| `logo_base64` | `LONGTEXT` | | Logo del emisor |
| `tipo_emisor` | `VARCHAR(30) NOT NULL DEFAULT 'persona_natural'` | | `persona_natural` o `persona_juridica` |
| `iva_responsable` | `TINYINT(1) NOT NULL DEFAULT 0` | | Responsable de IVA |
| `iva_porcentaje` | `DECIMAL(5,2) NOT NULL DEFAULT 19.00` | | Tarifa de IVA |
| `retencion_porcentaje` | `DECIMAL(5,2)` | | Retención en la fuente preferida |
| `retencion_concepto` | `VARCHAR(100)` | | Concepto de retención (honorarios, servicios, etc.) |
| `reteiva_porcentaje` | `DECIMAL(5,2) DEFAULT 15.00` | | Retención de IVA (% sobre IVA) |
| `reteica_porcentaje` | `DECIMAL(5,2)` | | Retención de ICA (configurable por municipio) |
| `reteica_municipio` | `VARCHAR(100)` | | Municipio para ICA |
| `compensar_retencion` | `TINYINT(1) NOT NULL DEFAULT 0` | | Compensar retención en precio |
| `fecha_creacion` | `DATETIME DEFAULT CURRENT_TIMESTAMP` | | |

**Índice**: `KEY idx_emisor_usuario (usuario_id)`

**Validación**: Un usuario gratuito solo puede tener 1 emisor (`es_principal = 1`). Un usuario premium puede tener hasta 5.

### `totp_2fa`

Configuración TOTP por usuario. FR-034, FR-035.

| Columna | Tipo | Constraint | Descripción |
|---------|------|-----------|-------------|
| `usuario_id` | `INT` | PK, FK → usuarios(id) ON DELETE CASCADE | |
| `secreto_cifrado` | `VARCHAR(255) NOT NULL` | | Secreto TOTP cifrado con clave del servidor |
| `metodo` | `VARCHAR(20) NOT NULL DEFAULT 'totp'` | | `totp` o `email` |
| `fecha_activacion` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | | |

### `codigos_recuperacion`

Códigos de respaldo para 2FA. FR-036.

| Columna | Tipo | Constraint | Descripción |
|---------|------|-----------|-------------|
| `id` | `INT AUTO_INCREMENT` | PK | |
| `usuario_id` | `INT NOT NULL` | FK → usuarios(id) ON DELETE CASCADE | |
| `codigo_hash` | `VARCHAR(64) NOT NULL` | | SHA-256 del código |
| `usado` | `TINYINT(1) NOT NULL DEFAULT 0` | | Si ya fue utilizado |
| `fecha_creacion` | `DATETIME DEFAULT CURRENT_TIMESTAMP` | | |

**Índice**: `KEY idx_recuperacion_usuario (usuario_id)`

### `plantillas_pdf`

Catálogo de plantillas disponibles (seed data). FR-024.

| Columna | Tipo | Constraint | Descripción |
|---------|------|-----------|-------------|
| `id` | `VARCHAR(30)` | PK | Ej: `profesional`, `moderna`, `ejecutiva` |
| `nombre` | `VARCHAR(100) NOT NULL` | | Nombre visible |
| `descripcion` | `VARCHAR(500)` | | Descripción de la plantilla |
| `solo_premium` | `TINYINT(1) NOT NULL DEFAULT 0` | | Si requiere cuenta premium |
| `color_encabezado` | `VARCHAR(7) NOT NULL` | | Color hex por defecto |
| `color_acento` | `VARCHAR(7) NOT NULL` | | Color hex por defecto |
| `color_texto` | `VARCHAR(7) NOT NULL` | | Color hex por defecto |

**Seed data**: 3 plantillas iniciales:
- `profesional`: Limpio, azul corporativo (#1a56db, #3b82f6, #1f2937). Disponible para todos.
- `moderna`: Layout columnar, verde (#059669, #10b981, #111827). Solo premium.
- `ejecutiva`: Sobria, tonos oscuros (#1e293b, #475569, #f8fafc). Solo premium.

### `enlaces_descarga`

Enlaces temporales públicos para descarga de PDF vía WhatsApp. FR-031.

| Columna | Tipo | Constraint | Descripción |
|---------|------|-----------|-------------|
| `id` | `INT AUTO_INCREMENT` | PK | |
| `cotizacion_id` | `INT NOT NULL` | FK → cotizaciones(id) ON DELETE CASCADE | |
| `uuid` | `VARCHAR(36) NOT NULL` | UNIQUE | Identificador público del enlace |
| `fecha_expiracion` | `DATETIME NOT NULL` | | 7 días desde creación |
| `fecha_creacion` | `DATETIME DEFAULT CURRENT_TIMESTAMP` | | |

**Índice**: `UNIQUE KEY idx_enlace_uuid (uuid)`

**Validación**: El enlace es público (no requiere autenticación). Expiración fija a 7 días. El PDF se genera al momento de la descarga desde los datos de la cotización.

## Entity Relationships

```
usuarios 1──N emisores (usuario_id FK)
usuarios 1──1 perfil (usuario_id PK/FK)
usuarios 1──N clientes (usuario_id FK)
usuarios 1──N catalogo (usuario_id FK)
usuarios 1──N cotizaciones (usuario_id FK)
usuarios 1──1 totp_2fa (usuario_id PK/FK)
usuarios 1──N codigos_recuperacion (usuario_id FK)

emisores 1──N cotizaciones (emisor_id FK, nullable for legacy)
clientes 1──N cotizaciones (cliente_id FK, nullable — snapshot preservado)
cotizaciones 1──N lineas_cotizacion (cotizacion_id FK)
plantillas_pdf — reference table, no FK from cotizaciones (string match)
```

## State Transitions

### Cotización

Las cotizaciones NO tienen transiciones de estado bloqueantes (clarificación en spec). Siempre son editables:

```
[crear] → borrador → [editar] → borrador (sin cambio de estado)
                   → [compartir/descargar PDF] → borrador (sin cambio de estado)
                   → [eliminar] → eliminada (borrado permanente)
```

### 2FA

```
[sin 2FA] → [activar] → configurando → [verificar código] → activo
activo → [desactivar] → sin 2FA
activo → [perder acceso] → [usar código recuperación] → activo (reconfigurable)
```

### Suscripción (existente, sin cambios)

```
activa → [vencer sin renovar] → gracia (30 días, solo lectura)
gracia → [renovar] → activa
gracia → [90 días más] → expirada (datos eliminados)
```

> Al bajar de premium a gratuita: emisores adicionales pasan a modo lectura, solo el principal se usa para nuevas cotizaciones (EC-7).

## Validation Rules

| Entidad | Campo | Regla | FR |
|---------|-------|-------|-----|
| Cliente | logo | JPG/PNG, máx 2 MB | FR-004, EC-1 |
| Cliente | límite gratuita | Máx 10 clientes | EC-3 |
| Cliente | límite premium | Máx 200 clientes | spec assumptions |
| Catálogo | límite gratuita | Máx 20 servicios | spec assumptions |
| Catálogo | límite premium | Máx 200 servicios | spec assumptions |
| Emisor | límite premium | Máx 5 emisores | spec assumptions |
| Emisor | límite gratuita | 1 emisor (principal) | FR-021 |
| Retención fuente | porcentaje | 4%, 6%, 10%, 11% o personalizado | FR-009, EC-2 |
| IVA | porcentaje | 0% o 19% (según responsabilidad) | FR-009, FR-010 |
| ReteIVA | porcentaje | 15% sobre IVA facturado | FR-009 |
| ReteICA | porcentaje | Configurable por municipio | FR-009 |
| PDF colores | formato | Hex color válido (#RRGGBB) | FR-025 |
| 2FA códigos | cantidad | Mínimo 8 códigos de un solo uso | FR-036 |
| Enlace temporal PDF | expiración | 7 días | FR-031 |
