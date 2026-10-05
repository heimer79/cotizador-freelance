# Data Model: Sistema de Monetización — Publicidad y Donaciones

**Feature**: 004-monetizacion-ads-donaciones | **Date**: 2026-10-05

## Entities

### 1. Donacion

Registro de cada intento de donación de un profesional.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, autoincrement | Identificador único |
| `profesional_id` | INTEGER | FK → profesional.id, NOT NULL | Profesional que dona |
| `monto` | INTEGER | NOT NULL, CHECK(monto >= 2000 AND monto <= 500000) | Monto en COP (enteros, sin decimales) |
| `estado` | TEXT | NOT NULL, CHECK(estado IN ('pendiente','exitosa','fallida','cancelada')) | Estado de la transacción |
| `referencia_pasarela` | TEXT | UNIQUE cuando no es NULL | Referencia de transacción de la pasarela de pago |
| `pasarela` | TEXT | NOT NULL | Identificador de la pasarela usada (e.g., 'wompi') |
| `fecha_creacion` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Fecha/hora de inicio del intento (ISO 8601) |
| `fecha_confirmacion` | TEXT | NULL | Fecha/hora de confirmación definitiva de la pasarela |
| `email_enviado` | INTEGER | NOT NULL, DEFAULT 0 | 1 si se envió el correo de confirmación |

**Índices**:
- `idx_donacion_profesional_fecha` ON (profesional_id, fecha_creacion) — para historial y verificación de límites diarios
- `idx_donacion_referencia` ON (referencia_pasarela) — para reconciliación con la pasarela

**Reglas de negocio**:
- Máximo 3 donaciones en estado `pendiente` o `exitosa` por profesional por día natural en zona horaria America/Bogota (FR-015)
- Acumulado máximo 200.000 COP en donaciones `pendiente` o `exitosa` por profesional por día natural en zona horaria America/Bogota (FR-015)
- El estado inicia como `pendiente` y solo cambia a `exitosa` cuando la pasarela confirma definitivamente (EC4)
- No se cobra dos veces: si la confirmación tarda, se mantiene `pendiente` hasta confirmación o timeout

**Transiciones de estado**:

```
pendiente → exitosa    (confirmación de la pasarela)
pendiente → fallida    (error reportado por la pasarela)
pendiente → cancelada  (profesional cancela en la pasarela)
```

### 2. EspacioPublicitario

Configuración de cada espacio publicitario en la interfaz. Se carga desde un fichero JSON de configuración (`ads-config.json`) o variables de entorno para permitir actualización sin redespliegue (FR-008).

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | TEXT | PK | Identificador del espacio (e.g., 'banner-superior', 'lateral-cotizaciones') |
| `tipo` | TEXT | NOT NULL, CHECK(tipo IN ('adsense','pauta_directa')) | Tipo de publicidad |
| `ubicacion` | TEXT | NOT NULL | Pantalla donde se muestra (e.g., 'lista-cotizaciones', 'editor', 'catalogo') |
| `posicion` | TEXT | NOT NULL | Posición en la pantalla (e.g., 'superior', 'lateral', 'entre-contenido') |
| `activo` | BOOLEAN | NOT NULL, DEFAULT true | Si el espacio está habilitado |
| `anunciante_imagen_url` | TEXT | NULL | URL de la imagen del anunciante (solo para pauta_directa) |
| `anunciante_enlace_url` | TEXT | NULL | URL de destino al hacer clic (solo para pauta_directa) |
| `anunciante_alt` | TEXT | NULL | Texto alternativo de la imagen (solo para pauta_directa) |
| `fallback` | TEXT | NOT NULL, DEFAULT 'adsense' | Qué mostrar si no hay anunciante: 'adsense' u 'oculto' |

**Nota**: Esta entidad NO vive en SQLite. Se almacena como fichero JSON de configuración (`ads-config.json` en el directorio de configuración del backend) que el servidor lee al arrancar y puede recargar sin reinicio. Esto cumple FR-008 sin necesidad de una tabla de base de datos ni un panel de administración.

### 3. PreferenciaCookies

Preferencia de consentimiento de cookies del usuario. Se almacena en `localStorage` del navegador (lado cliente), no en la base de datos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `cookies_publicidad` | boolean | `true` si aceptó cookies de publicidad, `false` si rechazó |
| `fecha_consentimiento` | string | Fecha ISO 8601 del último consentimiento |

**Comportamiento**:
- Si no hay preferencia guardada → mostrar banner de consentimiento (FR-020)
- Si `cookies_publicidad === true` → cargar AdSense (FR-021)
- Si `cookies_publicidad === false` → NO cargar AdSense; la pauta directa sí se muestra porque no usa cookies de terceros (FR-021)
- El usuario puede cambiar su preferencia desde configuración de privacidad (FR-022)

## Relationships

```
profesional 1 ──── * donacion
  (Un profesional puede tener múltiples donaciones)

espacio_publicitario ── standalone (configuración, sin FK)
  (Configuración independiente, no ligada a usuarios)

preferencia_cookies ── client-side only (localStorage)
  (Sin relación con entidades de base de datos)
```

## Validation Rules Summary

| Regla | Entidad | Campos | Referencia |
|-------|---------|--------|------------|
| Monto mínimo 2.000 COP | Donacion | monto | FR-010, EC2 |
| Monto máximo 500.000 COP | Donacion | monto | FR-010 |
| Máximo 3 donaciones exitosas/día/usuario | Donacion | profesional_id, fecha_creacion, estado | FR-015 |
| Acumulado máximo 200.000 COP/día/usuario | Donacion | profesional_id, monto, fecha_creacion, estado | FR-015 |
| Estado válido | Donacion | estado | Dominio cerrado |
| Referencia de pasarela única | Donacion | referencia_pasarela | Integridad transaccional |
| Cookie consent antes de AdSense | PreferenciaCookies | cookies_publicidad | FR-020, FR-021 |

## Migration Notes

- Se añade la tabla `donacion` al esquema SQLite existente
- No se crea tabla para espacios publicitarios (viven en fichero JSON de configuración)
- No se crea tabla para preferencias de cookies (viven en localStorage del navegador)
- La migración es aditiva: no modifica tablas existentes
