# API Contracts: Roles, Cuentas Premium y Marco Legal

**Feature**: 005-roles-cuentas-legal | **Date**: 2026-10-07

Todos los endpoints responden en JSON. Las rutas protegidas requieren cookie de sesión (`sesion`). Los errores siguen el formato `{ "error": "Mensaje descriptivo" }`.

---

## Autenticación Social

### GET /api/auth/google

Inicia el flujo OAuth2 con Google. Redirige al usuario a la página de consentimiento de Google.

**Auth**: Pública  
**Response**: Redirect 302 → Google OAuth consent

---

### GET /api/auth/google/callback

Callback de Google OAuth2. Crea o vincula la cuenta y establece la cookie de sesión.

**Auth**: Pública (llamado por Google)  
**Query params**: `code` (authorization code de Google)  
**Response**: Redirect 302 → `/` (éxito) o `/login?error=google_failed` (fallo)  
**Side effects**: Crea usuario si no existe, vincula proveedor, crea sesión, registra login en historial_actividad.

---

### GET /api/auth/facebook

Inicia el flujo OAuth2 con Facebook.

**Auth**: Pública  
**Response**: Redirect 302 → Facebook OAuth consent

---

### GET /api/auth/facebook/callback

Callback de Facebook OAuth2.

**Auth**: Pública (llamado por Facebook)  
**Query params**: `code` (authorization code de Facebook)  
**Response**: Redirect 302 → `/` o `/login?error=facebook_failed`  
**Side effects**: Igual que Google callback.

---

### POST /api/auth/establecer-password

Permite a un usuario con solo login social establecer una contraseña para habilitar login con correo/contraseña.

**Auth**: Sesión requerida  
**Body**:
```json
{
  "password": "string (min 8 caracteres)"
}
```
**Response 200**:
```json
{
  "mensaje": "Contraseña establecida correctamente"
}
```
**Response 400**: Password no cumple requisitos.  
**Response 409**: El usuario ya tiene contraseña.

---

### GET /api/auth/yo

Extiende el endpoint existente para incluir rol, tipo_cuenta y estado.

**Auth**: Sesión requerida  
**Response 200**:
```json
{
  "id": 1,
  "email": "user@example.com",
  "nombre": "María López",
  "verificado": true,
  "rol": "normal",
  "tipoCuenta": "gratuita",
  "estado": "activo",
  "proveedores": ["email", "google"]
}
```

---

## Suscripción Premium

### POST /api/suscripcion/crear

Crea una preferencia de pago en MercadoPago para suscripción premium.

**Auth**: Sesión requerida  
**Body**:
```json
{
  "modalidad": "automatica" | "manual"
}
```
**Preconditions**: Usuario con tipo_cuenta = 'gratuita' o suscripción vencida. Ha aceptado términos de suscripción premium.  
**Response 200**:
```json
{
  "url_pago": "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=..."
}
```
**Response 400**: Ya tiene suscripción activa.  
**Response 403**: No aceptó términos de suscripción premium.

---

### POST /api/suscripcion/webhook

Webhook de MercadoPago para confirmar pagos de suscripción.

**Auth**: Pública (verifica firma HMAC de MercadoPago)  
**Body**: Payload de notificación de MercadoPago  
**Response 200**: `{ "ok": true }`  
**Side effects**: Actualiza suscripción a 'activa', actualiza tipo_cuenta del usuario a 'premium', registra en historial_actividad.

---

### POST /api/suscripcion/cancelar

Cancela la renovación automática de la suscripción premium.

**Auth**: Sesión requerida  
**Preconditions**: Suscripción activa con modalidad 'automatica'.  
**Response 200**:
```json
{
  "mensaje": "Renovación automática cancelada. Tu suscripción seguirá activa hasta {fecha_vencimiento}."
}
```

---

### GET /api/suscripcion/estado

Consulta el estado actual de la suscripción del usuario.

**Auth**: Sesión requerida  
**Response 200**:
```json
{
  "tipoCuenta": "premium",
  "suscripcion": {
    "estado": "activa",
    "modalidad": "automatica",
    "fechaInicio": "2026-10-07",
    "fechaVencimiento": "2027-10-07",
    "diasRestantes": 365
  }
}
```
**Response 200** (sin suscripción):
```json
{
  "tipoCuenta": "gratuita",
  "suscripcion": null
}
```

---

## Administración

### GET /api/admin/config/:seccion

Obtiene la configuración de una sección del panel admin.

**Auth**: Sesión requerida + rol admin  
**Params**: `seccion` ∈ { `adsense`, `pasarelas`, `auth_social`, `correo` }  
**Response 200** (ejemplo `adsense`):
```json
{
  "adsense_id": "ca-pub-1234567890"
}
```
**Response 200** (ejemplo `auth_social`):
```json
{
  "google_oauth_client_id": "123...apps.googleusercontent.com",
  "google_oauth_configurado": true,
  "facebook_oauth_app_id": "456...",
  "facebook_oauth_configurado": true
}
```
**Nota**: Los campos sensibles (secrets, tokens) NUNCA se devuelven. Solo se devuelve un flag `_configurado: true/false`.  
**Response 403**: Usuario sin rol admin.

---

### PUT /api/admin/config/:seccion

Actualiza la configuración de una sección.

**Auth**: Sesión requerida + rol admin  
**Body**: Objeto con los pares clave-valor de la sección.  
**Response 200**:
```json
{
  "mensaje": "Configuración actualizada"
}
```
**Response 400**: Validación fallida (claves no reconocidas, formatos inválidos).  
**Response 403**: Sin rol admin.  
**Side effects**: Almacena campos sensibles encriptados en configuracion_plataforma.

---

### GET /api/admin/usuarios

Lista de usuarios registrados (paginada).

**Auth**: Sesión requerida + rol admin  
**Query params**: `pagina` (default 1), `limite` (default 20, max 100), `busqueda` (opcional, busca en nombre/email)  
**Response 200**:
```json
{
  "usuarios": [
    {
      "id": 1,
      "nombre": "María López",
      "email": "maria@example.com",
      "tipoCuenta": "premium",
      "rol": "normal",
      "fechaRegistro": "2026-09-15",
      "estado": "activo"
    }
  ],
  "total": 45,
  "pagina": 1,
  "totalPaginas": 3
}
```

---

### PATCH /api/admin/usuarios/:id/suspender

Suspende o reactiva un usuario.

**Auth**: Sesión requerida + rol admin  
**Body**:
```json
{
  "accion": "suspender" | "reactivar"
}
```
**Response 200**:
```json
{
  "mensaje": "Usuario suspendido correctamente"
}
```
**Response 400**: El admin intenta suspenderse a sí mismo.  
**Response 403**: Sin rol admin.

---

### PATCH /api/admin/usuarios/:id/rol

Asigna o revoca el rol de administrador.

**Auth**: Sesión requerida + rol admin  
**Body**:
```json
{
  "rol": "admin" | "normal"
}
```
**Response 200**:
```json
{
  "mensaje": "Rol actualizado"
}
```
**Response 400**: Intenta revocar su propio rol y es el único admin (EC4).  
**Response 403**: Sin rol admin.

---

### GET /api/admin/notificaciones

Notificaciones del sistema (paginadas).

**Auth**: Sesión requerida + rol admin  
**Query params**: `pagina` (default 1), `limite` (default 20)  
**Response 200**:
```json
{
  "notificaciones": [
    {
      "id": 1,
      "tipo": "correo_fallido",
      "titulo": "Error al enviar correo de verificación",
      "descripcion": "Gmail API: cuota diaria agotada",
      "fecha": "2026-10-07T14:30:00.000Z",
      "leida": false
    }
  ],
  "total": 12,
  "noLeidas": 3
}
```

---

### GET /api/admin/notificaciones/conteo

Conteo de notificaciones no leídas (para el badge).

**Auth**: Sesión requerida + rol admin  
**Response 200**:
```json
{
  "noLeidas": 3
}
```

---

### PATCH /api/admin/notificaciones/:id

Marca una notificación como leída.

**Auth**: Sesión requerida + rol admin  
**Body**:
```json
{
  "leida": true
}
```
**Response 200**: `{ "ok": true }`

---

### GET /api/admin/bd/:tabla

Visor de base de datos (solo lectura). Solo tablas operativas autorizadas (FR-052–054).

**Auth**: Sesión requerida + rol admin  
**Params**: `tabla` ∈ { `usuarios`, `suscripciones`, `configuracion_plataforma`, `documentos_legales`, `aceptaciones_legales`, `notificaciones_admin`, `donacion`, `auth_proveedores`, `historial_actividad` }  
**Query params**: `pagina` (default 1), `limite` (default 50, max 200), `busqueda` (opcional, busca en todos los campos TEXT)  
**Response 200**:
```json
{
  "tabla": "usuarios",
  "columnas": ["id", "nombre_completo", "email", "rol", "tipo_cuenta", "estado", "fecha_registro"],
  "filas": [ ... ],
  "total": 150,
  "pagina": 1,
  "totalPaginas": 3
}
```
**Response 400**: Tabla no autorizada.  
**Response 403**: Sin rol admin.  
**Nota**: Tablas excluidas (FR-007): `cotizaciones`, `lineas_cotizacion`, `clientes`, `grupos_clientes`, `clientes_grupos`, `catalogo`, `perfil`, `enlaces_temporales`.

---

## Documentos Legales

### GET /api/legal/documentos

Lista los documentos legales vigentes (versión activa de cada tipo).

**Auth**: Pública  
**Response 200**:
```json
{
  "documentos": [
    {
      "id": 1,
      "tipo": "privacidad",
      "titulo": "Política de Privacidad",
      "version": "1.0.0",
      "fechaPublicacion": "2026-10-07"
    }
  ]
}
```

---

### GET /api/legal/documentos/:tipo

Obtiene el contenido completo de un documento legal por tipo.

**Auth**: Pública  
**Params**: `tipo` ∈ { `privacidad`, `sarlaft`, `donaciones`, `terminos_uso`, `terminos_premium` }  
**Response 200**:
```json
{
  "id": 1,
  "tipo": "privacidad",
  "titulo": "Política de Privacidad",
  "version": "1.0.0",
  "contenido": "<html del documento>",
  "fechaPublicacion": "2026-10-07"
}
```

---

### POST /api/legal/aceptar

Registra la aceptación de uno o más documentos legales por el usuario.

**Auth**: Sesión requerida  
**Body**:
```json
{
  "documentos": [1, 2, 3]
}
```
**Preconditions**: Los IDs deben corresponder a documentos activos (versión vigente).  
**Response 200**:
```json
{
  "mensaje": "Términos aceptados",
  "documentosAceptados": 3
}
```

---

### GET /api/legal/estado

Verifica si el usuario tiene aceptaciones pendientes.

**Auth**: Sesión requerida  
**Response 200** (todo aceptado):
```json
{
  "pendientes": [],
  "alDia": true
}
```
**Response 200** (aceptación requerida):
```json
{
  "pendientes": [
    {
      "id": 4,
      "tipo": "privacidad",
      "titulo": "Política de Privacidad (actualizada)",
      "version": "1.1.0"
    }
  ],
  "alDia": false
}
```

---

## Compartir por WhatsApp

### POST /api/cotizaciones/compartir

Genera un PDF en el servidor y crea un enlace temporal para compartir por WhatsApp.

**Auth**: Sesión requerida  
**Body**:
```json
{
  "cotizacionId": 42,
  "datosCotizacion": { ... }
}
```
**Nota**: Para usuarios premium, se usa `cotizacionId` para recuperar los datos del backend. Para usuarios gratuitos, se envía `datosCotizacion` con los datos completos de la cotización (ya que no se guardan en el servidor).  
**Response 200**:
```json
{
  "enlace": "https://presupuestospro.com/compartir/abc123-def456-...",
  "enlaceWhatsApp": "https://wa.me/?text=Te%20comparto%20mi%20cotizaci%C3%B3n%3A%20https%3A%2F%2Fpresupuestospro.com%2Fcompartir%2Fabc123...",
  "expira": "2026-10-14T14:30:00.000Z"
}
```

---

### GET /compartir/:token

Sirve el PDF para descarga pública (no requiere autenticación).

**Auth**: Pública  
**Response 200**: Archivo PDF (`Content-Type: application/pdf`)  
**Response 410**:
```json
{
  "error": "Este enlace de descarga ha expirado. Solicita un nuevo enlace al remitente."
}
```

---

## Perfil del Usuario

### GET /api/perfil/actividad

Historial de actividad reciente del usuario (FR-049).

**Auth**: Sesión requerida  
**Response 200**:
```json
{
  "ultimosLogins": [
    {
      "fecha": "2026-10-07T10:00:00.000Z",
      "proveedor": "google"
    }
  ],
  "cambiosRecientes": [
    {
      "tipo": "cambio_tipo_cuenta",
      "detalle": "gratuita → premium",
      "fecha": "2026-10-05T14:00:00.000Z"
    }
  ]
}
```

---

## Grupos de Clientes (Premium)

### GET /api/grupos

Lista los grupos de clientes del usuario.

**Auth**: Sesión requerida  
**Preconditions**: tipo_cuenta = 'premium'  
**Response 200**:
```json
{
  "grupos": [
    {
      "id": 1,
      "nombre": "Restaurantes",
      "cantidadClientes": 5,
      "fechaCreacion": "2026-10-01"
    }
  ]
}
```
**Response 403**: Cuenta gratuita → `{ "error": "Función disponible solo para cuentas premium", "enlacePlanes": "/planes" }`

---

### POST /api/grupos

Crea un nuevo grupo de clientes.

**Auth**: Sesión requerida  
**Preconditions**: tipo_cuenta = 'premium', menos de 50 grupos existentes.  
**Body**:
```json
{
  "nombre": "Oficinas"
}
```
**Response 201**: `{ "id": 2, "nombre": "Oficinas" }`  
**Response 400**: Nombre duplicado.  
**Response 403**: Cuenta gratuita.  
**Response 409**: Límite de 50 grupos alcanzado.

---

### PUT /api/grupos/:id

Actualiza el nombre de un grupo.

**Auth**: Sesión requerida  
**Preconditions**: tipo_cuenta = 'premium', grupo pertenece al usuario.  
**Body**:
```json
{
  "nombre": "Oficinas Centro"
}
```
**Response 200**: `{ "id": 2, "nombre": "Oficinas Centro" }`

---

### DELETE /api/grupos/:id

Elimina un grupo de clientes (no elimina los clientes, solo la agrupación).

**Auth**: Sesión requerida  
**Preconditions**: tipo_cuenta = 'premium', grupo pertenece al usuario.  
**Response 200**: `{ "mensaje": "Grupo eliminado" }`

---

### POST /api/grupos/:id/clientes

Asigna clientes a un grupo.

**Auth**: Sesión requerida  
**Body**:
```json
{
  "clienteIds": [1, 3, 7]
}
```
**Response 200**: `{ "asignados": 3 }`

---

### DELETE /api/grupos/:id/clientes/:clienteId

Desasigna un cliente de un grupo.

**Auth**: Sesión requerida  
**Response 200**: `{ "ok": true }`
