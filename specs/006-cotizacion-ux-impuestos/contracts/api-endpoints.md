# API Contracts: Cotización UX, Impuestos y Mejoras Generales

**Feature**: 006-cotizacion-ux-impuestos | **Date**: 2026-10-08

All endpoints require session cookie (`sesion`) unless marked PUBLIC.

## Existing Endpoints — Modifications

### `GET /api/clientes` — Agregar búsqueda y filtro

**Changes**: Accept query param `?q=texto` for search by name/document.

**Response** (unchanged shape, filtered):
```json
[
  {
    "id": 1,
    "nombre": "Empresa ABC",
    "documento": "900123456-7",
    "contacto": "Juan Pérez",
    "email": "juan@empresa.com",
    "telefono": "3001234567",
    "tipo": "persona_juridica",
    "agenteRetenedor": true,
    "logoBase64": "data:image/png;base64,..."
  }
]
```

**FR**: FR-001, FR-005

---

### `POST /api/clientes` — Agregar logo, email y teléfono

**Request body** (extended):
```json
{
  "nombre": "Empresa ABC",
  "documento": "900123456-7",
  "contacto": "Juan Pérez",
  "email": "juan@empresa.com",
  "telefono": "3001234567",
  "tipo": "persona_juridica",
  "agenteRetenedor": true,
  "logoBase64": "data:image/png;base64,..."
}
```

**Validation**:
- `logoBase64`: optional, must be JPG/PNG data URI, max 2 MB decoded size
- Enforce storage limit: 10 clients (free), 200 (premium)

**Response**: `201 { "id": 1 }` | `400 { "error": "..." }` | `403 { "error": "Límite de clientes alcanzado" }`

**FR**: FR-003, FR-004, EC-1, EC-3

---

### `POST /api/cotizaciones` — Ampliar con impuestos y emisor

**Request body** (extended fields):
```json
{
  "clienteId": 1,
  "emisorId": 2,
  "lineas": [
    { "descripcion": "Diseño web", "cantidad": 1, "precioUnitario": 5000000, "origen": "catalogo", "servicioId": 3 }
  ],
  "ivaTarifa": 19,
  "ivaResponsable": true,
  "retencion": {
    "activada": true,
    "concepto": "servicios",
    "porcentaje": 6
  },
  "reteiva": {
    "activada": true,
    "porcentaje": 15
  },
  "reteica": {
    "activada": true,
    "porcentaje": 0.966
  },
  "compensarRetencion": false,
  "plantillaPdf": "profesional",
  "coloresPdf": {
    "encabezado": "#1a56db",
    "acento": "#3b82f6",
    "texto": "#1f2937"
  }
}
```

**Response**: `201` with full quote object including `totales`:
```json
{
  "totales": {
    "baseGravable": 5000000,
    "iva": 950000,
    "retencion": 300000,
    "reteiva": 142500,
    "reteica": 48300,
    "totalNeto": 5459200
  }
}
```

**FR**: FR-008 to FR-013, FR-022, FR-027

---

### `DELETE /api/cotizaciones/:id` — NEW

**Response**: `200 { "ok": true }` | `404 { "error": "Cotización no encontrada" }`

**Validation**: Only owner can delete. Confirmation handled in frontend.

**FR**: FR-046, FR-047

---

### `PUT /api/cotizaciones/:id` — Autoguardado

**Request body**: Same as POST (partial update supported).

**Response**: `200` with updated quote object.

**Behavior**: Idempotent. Supports partial updates for autosave (only changed fields).

**FR**: FR-027, FR-028, FR-029

### Catálogo de servicios

#### `GET /api/catalogo`

List all catalog services for the current user.

**Response**:
```json
[
  {
    "id": 1,
    "nombre": "Diseño de logo",
    "descripcion": "Diseño de logotipo profesional con 3 propuestas y 2 rondas de revisión",
    "precio": 1500000,
    "cantidadDefecto": 1
  }
]
```

**FR**: FR-014

---

#### `POST /api/catalogo`

Create a new catalog service.

**Request body**:
```json
{
  "nombre": "Diseño de logo",
  "descripcion": "Diseño de logotipo profesional con 3 propuestas y 2 rondas de revisión",
  "precio": 1500000,
  "cantidadDefecto": 1
}
```

**Validation**:
- `nombre`: required, max 255 characters
- `descripcion`: optional, max 500 characters
- `precio`: required, numeric, > 0
- `cantidadDefecto`: optional, integer ≥ 1, default 1
- Enforce storage limit: 20 services (free), 200 (premium)

**Response**: `201 { "id": 1 }` | `400 { "error": "..." }` | `403 { "error": "Límite de servicios del catálogo alcanzado" }`

**FR**: FR-017

---

#### `PUT /api/catalogo/:id`

Update an existing catalog service.

**Request body**: Same as POST (partial update supported).

**Response**: `200 { "ok": true }` | `404 { "error": "Servicio no encontrado" }`

**FR**: FR-017

---

#### `DELETE /api/catalogo/:id`

Delete a catalog service. Owner-only.

**Response**: `200 { "ok": true }` | `404 { "error": "Servicio no encontrado" }`

---

## New Endpoints

### Emisores

#### `GET /api/emisores`

List all emitters for the current user.

**Response**:
```json
[
  {
    "id": 1,
    "esPrincipal": true,
    "nombre": "Juan García",
    "documento": "1234567890",
    "email": "juan@email.com",
    "telefono": "3001234567",
    "logoBase64": "...",
    "tipoEmisor": "persona_natural",
    "ivaResponsable": false,
    "ivaPorcentaje": 0,
    "retencionPorcentaje": 11,
    "retencionConcepto": "servicios",
    "reteivaPorcentaje": 15,
    "reteicaPorcentaje": null,
    "reteicaMunicipio": null,
    "compensarRetencion": false
  }
]
```

**FR**: FR-018, FR-019, FR-020

---

#### `POST /api/emisores`

Create a new emitter (premium only).

**Request body**:
```json
{
  "nombre": "Mi Empresa SAS",
  "documento": "900111222-3",
  "email": "info@miempresa.com",
  "telefono": "6011234567",
  "logoBase64": "...",
  "tipoEmisor": "persona_juridica",
  "ivaResponsable": true,
  "ivaPorcentaje": 19,
  "retencionPorcentaje": null,
  "retencionConcepto": null,
  "reteivaPorcentaje": 15,
  "reteicaPorcentaje": 9.66,
  "reteicaMunicipio": "Bogotá",
  "compensarRetencion": false
}
```

**Response**: `201 { "id": 2 }` | `403 { "error": "Solo cuentas premium pueden crear emisores adicionales" }` | `403 { "error": "Límite de 5 emisores alcanzado" }`

**FR**: FR-019

---

#### `PUT /api/emisores/:id`

Update an emitter.

**Response**: `200 { "ok": true }` | `404`

**FR**: FR-019

---

#### `DELETE /api/emisores/:id`

Delete a non-primary emitter (premium only). Cannot delete the primary emitter.

**Response**: `200 { "ok": true }` | `400 { "error": "No se puede eliminar el emisor principal" }`

**FR**: FR-019

---

### 2FA

#### `POST /api/auth/2fa/activar`

Activate 2FA. Returns TOTP secret URI and recovery codes.

**Request body**:
```json
{
  "metodo": "totp"
}
```

**Response**:
```json
{
  "secretUri": "otpauth://totp/PresupuestosPro:user@email.com?secret=BASE32SECRET&issuer=PresupuestosPro",
  "qrDataUrl": "data:image/png;base64,...",
  "codigosRecuperacion": ["ABCD-1234", "EFGH-5678", "..."]
}
```

**Note**: Activation is not complete until verified with `POST /api/auth/2fa/verificar`.

**FR**: FR-034, FR-035, FR-036

---

#### `POST /api/auth/2fa/verificar`

Verify a TOTP code to confirm 2FA activation or to complete login.

**Request body**:
```json
{
  "codigo": "123456"
}
```

**Response**: `200 { "verificado": true }` | `401 { "error": "Código inválido" }`

**FR**: FR-037

---

#### `POST /api/auth/2fa/recuperar`

Use a recovery code when 2FA device is unavailable.

**Request body**:
```json
{
  "codigo": "ABCD-1234"
}
```

**Response**: `200 { "verificado": true, "codigosRestantes": 7 }` | `401 { "error": "Código de recuperación inválido o ya usado" }`

**FR**: FR-037 (acceptance scenario 4)

---

#### `DELETE /api/auth/2fa`

Deactivate 2FA. Requires current session.

**Response**: `200 { "ok": true }`

---

### Plantillas PDF

#### `GET /api/plantillas-pdf`

List available PDF templates.

**Response**:
```json
[
  {
    "id": "profesional",
    "nombre": "Profesional",
    "descripcion": "Diseño limpio y corporativo",
    "soloPremium": false,
    "colores": { "encabezado": "#1a56db", "acento": "#3b82f6", "texto": "#1f2937" }
  },
  {
    "id": "moderna",
    "nombre": "Moderna",
    "descripcion": "Layout columnar con colores vivos",
    "soloPremium": true,
    "colores": { "encabezado": "#059669", "acento": "#10b981", "texto": "#111827" }
  }
]
```

**FR**: FR-024

---

### Preferencias PDF del usuario

#### `PUT /api/perfil/preferencias-pdf`

Save user's preferred PDF template and colors.

**Request body**:
```json
{
  "plantilla": "moderna",
  "colores": {
    "encabezado": "#059669",
    "acento": "#10b981",
    "texto": "#111827"
  }
}
```

**Validation**: Template must exist. If `soloPremium`, user must be premium. Colors must be valid hex.

**Response**: `200 { "ok": true }` | `403 { "error": "Esta plantilla requiere cuenta premium" }`

**FR**: FR-025, FR-026

---

### Compartir PDF (existing, extended)

#### `POST /api/cotizaciones/:id/compartir` — Extended

**Existing behavior preserved**. New optional field:

**Request body**:
```json
{
  "canal": "whatsapp",
  "generarEnlace": true
}
```

**Response** (when `generarEnlace: true`):
```json
{
  "enlace": "https://presupuestospro.com/api/compartir/descargar/UUID",
  "expira": "2026-10-15T00:00:00.000Z"
}
```

**FR**: FR-030, FR-031

---

### Legal (existing, extended)

#### `GET /api/auth/legal/unificado` — PUBLIC

Returns the unified legal document.

**Response**:
```json
{
  "id": 6,
  "tipo": "terminos_unificados",
  "version": "2.0.0",
  "titulo": "Términos y Condiciones, Política de Privacidad y SARLAFT",
  "contenido": "<h1>...</h1>..."
}
```

**FR**: FR-032

## Calculation Contract

The tax calculation function (`calculo.js`) is the single source of truth for all totals shown in the UI and the PDF.

**Input**:
```javascript
{
  lineas: [{ cantidad, precioUnitario }],
  ivaTarifa: 19,          // 0 if not IVA-responsible
  ivaResponsable: true,
  retencionActivada: true,
  retencionPorcentaje: 6,
  reteivaActivada: true,
  reteivaPorcentaje: 15,  // % over IVA amount
  reteicaActivada: true,
  reteicaPorcentaje: 0.966,
  compensarRetencion: false
}
```

**Output**:
```javascript
{
  baseGravable: 5000000,
  iva: 950000,
  retencion: 300000,
  reteiva: 142500,     // 15% of 950000
  reteica: 48300,      // 0.966% of 5000000
  compensacion: 0,     // 0 when disabled
  totalNeto: 5459200   // base + iva - retencion - reteiva - reteica
}
```

When `compensarRetencion: true`, each line's `precioUnitario` is adjusted by `precio / (1 - retencionPorcentaje/100)` and `compensacion` shows the total difference.

**FR**: FR-011, FR-012
