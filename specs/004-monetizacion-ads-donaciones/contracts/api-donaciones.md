# API Contract: Donaciones

**Base path**: `/api/donaciones`

## POST /api/donaciones

Crea una nueva donación e inicia el flujo de pago con la pasarela.

**Autenticación**: Requiere profesional autenticado (sesión activa).

### Request

```json
{
  "monto": 10000
}
```

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `monto` | integer | Sí | >= 2000 AND <= 500000 (COP) |

### Responses

**201 Created** — Donación creada, pendiente de pago.

```json
{
  "donacion_id": 42,
  "monto": 10000,
  "estado": "pendiente",
  "checkout_url": "https://checkout.wompi.co/p/?id=...",
  "fecha_creacion": "2026-10-05T14:30:00.000Z"
}
```

**400 Bad Request** — Monto fuera de rango.

```json
{
  "error": "El monto debe estar entre $2.000 y $500.000 COP."
}
```

**429 Too Many Requests** — Límite diario alcanzado.

```json
{
  "error": "Has alcanzado el límite de donaciones por hoy. Podrás donar nuevamente mañana."
}
```

Posibles causas: más de 3 donaciones en estado `pendiente` o `exitosa` en el día (America/Bogota), o acumulado superior a 200.000 COP en donaciones `pendiente` o `exitosa` en el día.

**401 Unauthorized** — Sin sesión activa.

---

## GET /api/donaciones

Lista el historial de donaciones del profesional autenticado.

**Autenticación**: Requiere profesional autenticado.

### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `pagina` | integer | 1 | Número de página |
| `por_pagina` | integer | 20 | Resultados por página (max 50) |

### Response

**200 OK**

```json
{
  "donaciones": [
    {
      "id": 42,
      "monto": 10000,
      "estado": "exitosa",
      "referencia_pasarela": "TXN-ABC123",
      "fecha_creacion": "2026-10-05T14:30:00.000Z",
      "fecha_confirmacion": "2026-10-05T14:32:15.000Z"
    },
    {
      "id": 41,
      "monto": 5000,
      "estado": "fallida",
      "referencia_pasarela": null,
      "fecha_creacion": "2026-10-04T10:00:00.000Z",
      "fecha_confirmacion": null
    }
  ],
  "total": 15,
  "pagina": 1,
  "por_pagina": 20
}
```

---

## POST /api/donaciones/webhook

Endpoint para recibir notificaciones de la pasarela de pago (Wompi). No requiere autenticación de usuario; se valida la firma del webhook.

### Request

Cuerpo enviado por Wompi (formato de la pasarela). Incluye:
- `event`: tipo de evento (e.g., `transaction.updated`)
- `data.transaction.id`: referencia de la transacción
- `data.transaction.status`: estado (`APPROVED`, `DECLINED`, `ERROR`, `VOIDED`)
- `signature.checksum`: firma para validación de integridad

### Responses

**200 OK** — Webhook procesado correctamente.

```json
{ "ok": true }
```

**400 Bad Request** — Firma inválida o payload no reconocido.

### Comportamiento

1. Validar firma del webhook contra el secreto de integridad (`WOMPI_INTEGRITY_SECRET`)
2. Buscar donación por `referencia_pasarela`
3. Actualizar `estado`:
   - `APPROVED` → `exitosa` + enviar email de confirmación
   - `DECLINED` / `ERROR` → `fallida`
   - `VOIDED` → `cancelada`
4. Registrar `fecha_confirmacion`
5. Si el estado ya es final (no `pendiente`), ignorar el webhook (idempotencia)
