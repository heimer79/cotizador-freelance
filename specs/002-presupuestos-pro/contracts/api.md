# Contrato: API HTTP del backend (Express)

El frontend (Vue 3 + Vite) habla con el backend exclusivamente por esta
API. No hay autenticación (una instalación = un freelancer, sin cuentas de
usuario, según la spec) ni versión de API (`v1` implícito, no se expone en
la URL porque no hay necesidad de convivir con una versión anterior).

Todas las rutas devuelven y reciben JSON. Los montos son siempre enteros en
pesos colombianos (COP).

## Perfil

```
GET  /api/perfil         → 200 PerfilFreelancer | 200 {} si nunca se ha guardado
PUT  /api/perfil         body: PerfilFreelancer  → 200 PerfilFreelancer guardado
```

## Clientes

```
GET    /api/clientes           → 200 Cliente[]
POST   /api/clientes           body: { nombre, contacto?, tipo }        → 201 Cliente creado
PUT    /api/clientes/:id       body: { nombre, contacto?, tipo }        → 200 Cliente actualizado
DELETE /api/clientes/:id       → 204 (no afecta presupuestos existentes, ver data-model.md)
```

`tipo` debe ser `"empresa"` o `"particular"`; cualquier otro valor → `400`.

## Catálogo de servicios

```
GET    /api/catalogo           → 200 Servicio[]
POST   /api/catalogo           body: { nombre, precioDefecto }         → 201 Servicio creado
PUT    /api/catalogo/:id       body: { nombre, precioDefecto }         → 200 Servicio actualizado
DELETE /api/catalogo/:id       → 204 (no afecta líneas ya creadas, ver data-model.md)
```

`precioDefecto` debe ser un entero > 0 → si no, `400`.

## Presupuestos

```
GET    /api/presupuestos               → 200 Presupuesto[] (resumen: numero, fecha, cliente, total calculado)
GET    /api/presupuestos/:id           → 200 Presupuesto completo (con lineas[] y totales calculados)
POST   /api/presupuestos               body: NuevoPresupuesto           → 201 Presupuesto creado (con numero ya asignado)
PUT    /api/presupuestos/:id           body: PresupuestoEditable        → 200 Presupuesto actualizado (recalcula totales)

PresupuestoEditable: { clienteTipo?, retencionActivada?, retencionPorcentaje? }
  - clienteTipo: "empresa" o "particular" (actualiza la copia congelada del tipo de cliente en el presupuesto; permite corregir el tipo sin crear uno nuevo — Historia 1, escenario 3)
  - retencionActivada: true/false
  - retencionPorcentaje: 11 o 10
POST   /api/presupuestos/:id/lineas    body: { descripcion, cantidad, precioUnitario, origen, servicioId? } → 201 línea creada + totales recalculados
PUT    /api/presupuestos/:id/lineas/:lineaId   body: idem                → 200 línea actualizada + totales recalculados
DELETE /api/presupuestos/:id/lineas/:lineaId   → 204 + totales recalculados
```

**`NuevoPresupuesto`** (body de `POST /api/presupuestos`):
```json
{
  "clienteId": 1,
  "retencionActivada": true,
  "retencionPorcentaje": 11
}
```
El backend busca el cliente por `clienteId`, copia sus datos en
`cliente_nombre/contacto/tipo` (FR-003), asigna `numero` con
`backend/numeracion.js` (FR-007) y calcula `fechaEmision`/`fechaValidez`
(FR-008). El presupuesto se crea **sin líneas**; estas se añaden después
con `POST /.../lineas` (FR-009 permite crear y editar líneas en cualquier
momento).

**Validación de líneas** (FR-004): `cantidad` entero ≥ 1 y
`precioUnitario` entero > 0; si no, `400` con un mensaje en español
explicando el motivo (Principio IV: el freelancer debe entender el error
sin ayuda técnica).

**Respuesta de un presupuesto completo** (`GET /api/presupuestos/:id`)
incluye siempre los totales ya calculados por `backend/calculo.js`, nunca
guardados como columnas (ver data-model.md):
```json
{
  "id": 5,
  "numero": "2026-001",
  "fechaEmision": "2026-10-02",
  "fechaValidez": "2026-11-01",
  "cliente": { "nombre": "Acme SAS", "contacto": "...", "tipo": "empresa" },
  "retencionActivada": true,
  "retencionPorcentaje": 11,
  "lineas": [ { "id": 1, "descripcion": "...", "cantidad": 1, "precioUnitario": 1500000, "origen": "manual" } ],
  "totales": { "baseImponible": 2000000, "iva": 380000, "retencion": 220000, "total": 2160000 }
}
```

## Generación de PDF (FR-010, FR-011)

El PDF **no** lo genera el backend: el frontend pide
`GET /api/presupuestos/:id`, y con esos datos (más el perfil vía
`GET /api/perfil`) construye el PDF en el propio navegador con jsPDF (ver
decisión de negocio 3 en plan.md). La API no tiene una ruta
`/pdf`.

El frontend, antes de llamar a `jsPDF`, comprueba que `lineas.length > 0`;
si no, muestra el aviso de FR-011 sin llamar siquiera a la API — esta
validación de UI es la misma tanto si el backend tiene 0 líneas como si la
petición aún no ha vuelto, por eso vive en el frontend.

## Errores

Todas las rutas devuelven, en caso de error, `{ "error": "mensaje en español" }`
con el código HTTP correspondiente (`400` validación, `404` no encontrado,
`500` fallo inesperado del servidor/base de datos). No se exponen detalles
internos (stack traces, SQL) en la respuesta — esto es tanto buena práctica
de seguridad como el Principio IV (el freelancer debe poder entender
cualquier mensaje que vea).

## Reglas del contrato

- Ninguna ruta requiere cabecera de autenticación: no hay cuentas de
  usuario en esta versión (coherente con spec.md y Principio V).
- `DELETE` sobre `clientes` o `catalogo` nunca toca `presupuestos` ni
  `lineas_presupuesto`: son tablas independientes una vez copiados los
  datos (ver data-model.md).
- El `numero` de un presupuesto nunca se acepta en el body de `POST`: lo
  asigna siempre el servidor (FR-014, inmutable y no editable manualmente).
