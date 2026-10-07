# Research: Roles, Cuentas Premium y Marco Legal

**Feature**: 005-roles-cuentas-legal | **Date**: 2026-10-07

## R1. Autenticación OAuth con Google y Facebook en Express

**Context**: La plataforma usa Express + sesiones basadas en cookies (token hash en SQLite). Se necesita añadir login social sin romper el flujo actual de correo/contraseña.

**Decision**: Passport.js con strategies `passport-google-oauth20` y `passport-facebook`.

**Rationale**:
- Passport.js es el estándar de facto para autenticación en Express, con estrategias maduras para Google y Facebook.
- Se integra como middleware sin reemplazar el sistema de sesiones existente. El callback de OAuth crea o vincula la cuenta y emite la misma cookie de sesión que el login actual.
- No requiere cambiar la arquitectura de sesiones (sigue usando `crearSesion` de `auth.js`).

**Alternatives considered**:
- **OAuth manual (fetch directo)**: Más ligero pero propenso a errores de seguridad (validación de tokens, CSRF, nonce). Rechazado por complejidad de implementación segura.
- **Auth0 / Firebase Auth**: Servicios externos que simplifican OAuth pero añaden dependencia de terceros, latencia extra y costos. Viola Principio I (simplicidad) al introducir un servicio externo cuando Passport resuelve lo mismo localmente.

**Implementation notes**:
- Añadir columna `proveedor_auth` a tabla `usuarios` o crear tabla `auth_proveedores` para vincular múltiples proveedores por usuario (Google, Facebook, email) usando email como identificador de vinculación (FR-011).
- El callback de Google/Facebook: buscar usuario por email → si existe, vincular proveedor → si no existe, crear cuenta nueva → emitir cookie sesión.
- Las credenciales OAuth (Client ID/Secret) se almacenan en tabla `configuracion_plataforma`, editable por admin (FR-012). En desarrollo, se leen de `.env` como fallback.

---

## R2. Pasarela de pago MercadoPago para suscripciones premium

**Context**: La spec cambia la pasarela de donaciones de Wompi a MercadoPago (y añade PayPal). La suscripción premium ($20 USD/año) también usa MercadoPago. La plataforma actualmente usa Wompi para donaciones.

**Decision**: MercadoPago Checkout Pro (redirect) para suscripciones premium y donaciones.

**Rationale**:
- Checkout Pro no requiere PCI compliance de la plataforma: el usuario se redirige a MercadoPago para pagar y regresa con la referencia de la transacción.
- MercadoPago soporta pagos recurrentes (suscripciones) y pagos únicos (donaciones) con la misma integración.
- El SDK de Node.js (`mercadopago`) simplifica la creación de preferencias de pago y la verificación de webhooks.

**Alternatives considered**:
- **MercadoPago Checkout Bricks** (checkout embebido): Más complejo, requiere manejar tokenización en frontend. Innecesario para v1 donde redirect es suficiente.
- **Stripe**: No está en la spec. MercadoPago es más apropiado para el mercado colombiano.
- **PayPal Checkout**: Se usa para donaciones según spec, pero no como pasarela primaria para suscripciones. Se integra como enlace externo configurable por admin.

**Implementation notes**:
- Crear preferencia de pago con `back_urls` (éxito, fallo, pendiente) y `notification_url` para webhook.
- Al recibir webhook de pago exitoso: actualizar `suscripcion.estado` a `activa`, registrar `referencia_pasarela`.
- Las credenciales de MercadoPago (Access Token) las configura el admin desde el panel (nueva sección).
- Para donaciones: se migra de Wompi a MercadoPago, reutilizando la tabla `donacion` existente con ajustes mínimos.

---

## R3. Gmail API como servicio de correo transaccional

**Context**: FR-038 requiere que el admin configure Gmail API desde el panel. La plataforma ya usa Resend como servicio de correo.

**Decision**: Implementar `GmailService` como alternativa a `EmailService` (Resend), seleccionable por configuración del admin.

**Rationale**:
- Gmail API permite enviar correos desde la dirección propia del negocio (configurada por el admin) sin costo adicional para volúmenes bajos (< 500 correos/día).
- Resend se mantiene como fallback por defecto para desarrollo y para casos donde el admin no ha configurado Gmail.
- Ambos servicios implementan la misma interfaz (`enviar({ para, asunto, texto, html })`).

**Alternatives considered**:
- **Solo Resend**: Más simple, pero la spec exige explícitamente que el admin pueda configurar Gmail API (FR-038).
- **Solo Gmail API**: Requeriría configuración obligatoria antes de poder enviar correos, complicando el setup inicial.
- **SMTP genérico**: Más flexible pero menos seguro (contraseñas SMTP vs tokens OAuth2 de Gmail).

**Implementation notes**:
- `GmailService` usa el paquete `googleapis` con credenciales OAuth2 (Client ID + Client Secret + Refresh Token).
- El admin configura: Client ID, Client Secret, correo remitente. El Refresh Token se obtiene mediante flujo OAuth2 one-time que se guarda en tabla `configuracion_plataforma`.
- La selección entre Resend y Gmail se hace en `server.js` al arrancar: si hay credenciales Gmail configuradas y válidas, se usa Gmail; si no, Resend.

---

## R4. Sistema de roles y permisos

**Context**: La plataforma actual no tiene roles. Todo usuario registrado es equivalente. Se necesitan dos roles: `normal` y `admin`.

**Decision**: Añadir columna `rol` a tabla `usuarios` con CHECK constraint (`normal`, `admin`). Default `normal`.

**Rationale**:
- Un campo en la tabla existente es la solución más simple para dos roles fijos.
- No se necesita tabla separada de roles ni sistema RBAC complejo (Principio I).
- El middleware de autorización verifica `req.usuario.rol === 'admin'` para rutas protegidas.

**Alternatives considered**:
- **Tabla separada `roles` + tabla pivote `usuario_roles`**: Over-engineering para dos roles fijos. Se rechaza por Principio I.
- **Bitfield de permisos**: Innecesario. Solo hay dos niveles de acceso.

**Implementation notes**:
- `ALTER TABLE usuarios ADD COLUMN rol TEXT NOT NULL DEFAULT 'normal' CHECK (rol IN ('normal', 'admin'))`.
- Nuevo middleware `soloAdmin(req, res, next)` que verifica rol.
- El primer admin se crea mediante seed: variable de entorno `ADMIN_EMAIL` al iniciar la app; si el usuario con ese email existe, se le asigna `rol = 'admin'`.
- La función `datosPublicos()` en `rutas/auth.js` se extiende para incluir `rol` y `tipoCuenta`.

---

## R5. Tipos de cuenta (gratuita / premium) y lógica de restricciones

**Context**: Usuarios normales tienen cuenta gratuita (default) o premium ($20 USD/año). Las diferencias son: publicidad, almacenamiento persistente de cotizaciones/clientes/grupos, y límites de almacenamiento.

**Decision**: Añadir columna `tipo_cuenta` a tabla `usuarios` + tabla `suscripciones` para rastrear pagos y vigencia.

**Rationale**:
- `tipo_cuenta` en `usuarios` permite consultas rápidas sin JOIN para verificar acceso en cada request.
- `suscripciones` lleva el historial de pagos y controla la lógica de vencimiento, gracia (30 días) y retención (90 días).
- La restricción de almacenamiento para gratuitos se aplica en middleware: las escrituras de cotizaciones/clientes verifican `tipo_cuenta`.

**Alternatives considered**:
- **Solo tabla `suscripciones` sin campo en `usuarios`**: Requiere JOIN en cada request para verificar si el usuario es premium. Más lento y complejo.
- **Feature flags por funcionalidad**: Over-engineering. Solo hay dos niveles (free/premium) con diferencias claras.

**Implementation notes**:
- Cuando una suscripción vence: marcar `tipo_cuenta = 'gratuita'` pero NO eliminar datos inmediatamente. Los datos quedan en modo lectura.
- Cron job (o verificación lazy al hacer login) para: (a) marcar suscripciones vencidas después de 30 días de gracia, (b) eliminar datos después de 90 días adicionales.
- Para usuarios gratuitos, cotizaciones se crean en memoria en el frontend (no se guardan en backend). El backend rechaza `POST /api/cotizaciones` si `tipo_cuenta === 'gratuita'`.

---

## R6. Textos legales: versionado y aceptación obligatoria

**Context**: FR-030 a FR-036 requieren textos legales (privacidad, SARLAFT, donaciones, términos de uso) versionados, con aceptación obligatoria durante registro y suscripción.

**Decision**: Tabla `documentos_legales` (contenido versionado) + tabla `aceptaciones_legales` (registro por usuario). Los textos se pre-cargan con seed inicial.

**Rationale**:
- El versionado permite que al actualizar un texto legal, los usuarios existentes deban re-aceptar (FR-035).
- Los textos son contenido estático desplegado con la aplicación (assumption de spec), no editados por admin.
- La aceptación se registra con fecha, versión y usuario, cumpliendo Ley 1581 de 2012.

**Alternatives considered**:
- **Textos legales como archivos markdown servidos estáticamente**: No permite versionado fácil ni registro de aceptación.
- **CMS externo para textos legales**: Viola Principio I. No se necesita un CMS para 4 documentos estáticos.

**Implementation notes**:
- Middleware `requiereAceptacionLegal` que verifica si el usuario tiene aceptaciones vigentes para la última versión de cada documento obligatorio. Si no, responde con `403` y la lista de documentos pendientes.
- En el frontend: si el middleware devuelve documentos pendientes, se muestra un modal de aceptación antes de continuar.
- Los documentos se insertan con `INSERT OR IGNORE` en el setup de la BD, con versión semántica.

---

## R7. Compartir cotización por WhatsApp con enlace temporal

**Context**: FR-050, FR-051, FR-055, FR-056 requieren botón de WhatsApp en la vista de cotización que genera un enlace público temporal para descargar el PDF.

**Decision**: Generar PDF en backend, almacenarlo temporalmente, crear enlace con token UUID que expira en 7 días.

**Rationale**:
- El PDF se genera actualmente en el frontend con jsPDF. Para compartir con enlace público, el PDF debe estar disponible en el servidor.
- Un token UUID en la URL (no adivinable) es suficiente para proteger el acceso sin requerir autenticación.
- La expiración de 7 días se controla en la tabla `enlaces_temporales` y se verifica en cada descarga.

**Alternatives considered**:
- **PDF en blob storage externo (S3, Cloudflare R2)**: Más robusto pero viola Principio I. Para v1 con < 1000 usuarios, almacenar PDFs en el filesystem local es suficiente.
- **PDF generado on-demand desde datos guardados**: No funciona para usuarios gratuitos que no guardan cotizaciones.
- **Solo frontend (base64 en URL)**: Los PDFs son demasiado grandes para URLs de WhatsApp.

**Implementation notes**:
- Nuevo directorio `app/backend/datos/pdfs-temporales/` para almacenar PDFs compartidos.
- Tabla `enlaces_temporales` con: `token TEXT PRIMARY KEY`, `ruta_pdf TEXT`, `fecha_creacion TEXT`, `fecha_expiracion TEXT`.
- Ruta pública `GET /compartir/:token` que sirve el PDF si no ha expirado.
- El frontend envía los datos de la cotización al backend → el backend genera el PDF (jsPDF server-side o recibe el PDF como base64) → crea el enlace → retorna la URL para wa.me.
- Limpieza: job periódico o lazy cleanup que elimina PDFs expirados.

---

## R8. Panel de administración

**Context**: FR-004 requiere un panel con secciones para: AdSense, pasarelas donación, auth social, Gmail API, notificaciones, gestión usuarios, visor BD.

**Decision**: Nueva vista `AdminView.vue` con navegación por tabs/secciones internas. Cada sección es un componente independiente bajo `components/admin/`.

**Rationale**:
- El panel es una vista más de la SPA existente, protegida por verificación de rol.
- Las secciones comparten layout pero tienen lógica independiente: componentes separados permiten cargar y desarrollar cada sección de forma aislada.
- La configuración se almacena en tabla `configuracion_plataforma` con pares clave-valor.

**Alternatives considered**:
- **Aplicación admin separada**: Viola Principio I. No se necesita un frontend aparte para 7 secciones.
- **Admin en backend (HTML server-rendered)**: Inconsistente con el stack Vue 3 existente.

**Implementation notes**:
- Componentes: `AdminUsuarios.vue`, `AdminConfigAdsense.vue`, `AdminConfigPasarelas.vue`, `AdminConfigAuth.vue`, `AdminConfigCorreo.vue`, `AdminNotificaciones.vue`, `AdminVisorBD.vue`.
- API: `GET/PUT /api/admin/config/:seccion` (requiere rol admin), `GET /api/admin/usuarios` (paginado), `GET /api/admin/notificaciones`, `GET /api/admin/bd/:tabla` (solo lectura, paginado).
- El visor de BD (FR-052-054) solo expone tablas operativas: `usuarios`, `suscripciones`, `configuracion_plataforma`, `documentos_legales`, `aceptaciones_legales`, `notificaciones`, `donacion`. Excluye: `cotizaciones`, `lineas_cotizacion`, `clientes`, `catalogo`, `perfil`.

---

## R9. Migración de pasarela de donaciones (Wompi → MercadoPago)

**Context**: La spec 004 implementó donaciones con Wompi. La spec 005 requiere MercadoPago y PayPal para donaciones y suscripciones.

**Decision**: Reemplazar la integración Wompi por MercadoPago en backend. PayPal se integra como enlace de redirección configurable (sin SDK).

**Rationale**:
- La spec 005 es explícita: "MercadoPago (Checkout Pro o enlace de pago) para suscripciones premium y para donaciones".
- La tabla `donacion` existente se reutiliza, cambiando `pasarela` de `wompi` a `mercadopago`/`paypal`.
- El campo `referencia_pasarela` sigue siendo genérico (funciona con cualquier pasarela).
- PayPal para donaciones: el admin configura un enlace de PayPal.me; el botón de donación redirige a ese enlace. No se necesita SDK de PayPal.

**Alternatives considered**:
- **Mantener Wompi + añadir MercadoPago**: Más complejo. La spec no menciona Wompi; lo reemplaza por MercadoPago.
- **SDK de PayPal**: Over-engineering. Un enlace configurable cumple la spec.

**Implementation notes**:
- Eliminar dependencia de Wompi (variables de entorno `WOMPI_*`).
- Añadir `MERCADOPAGO_ACCESS_TOKEN` a `.env.example` (o leer de tabla config si el admin lo configuró).
- Actualizar `donacion-service.js` y `donaciones.js` para usar MercadoPago en lugar de Wompi.
- Actualizar `donaciones-webhook.js` para verificar webhooks de MercadoPago (firma HMAC).

---

## R10. Notificaciones del sistema al administrador

**Context**: FR-044 a FR-046 requieren un sistema de notificaciones internas para el admin: errores de API, correos fallidos, pagos fallidos.

**Decision**: Tabla `notificaciones_admin` con inserción desde cualquier servicio que detecte un error. Sin WebSocket; el panel admin hace polling o carga al entrar.

**Rationale**:
- Las notificaciones son informativas y no críticas en tiempo real. El admin las ve al entrar al panel.
- Insertar en tabla SQLite es simple y no requiere infraestructura adicional (ni Redis, ni cola de mensajes).
- El badge con conteo de no leídas se calcula con un `COUNT` simple.

**Alternatives considered**:
- **WebSocket para notificaciones en tiempo real**: Over-engineering para v1. El admin no necesita alertas push inmediatas.
- **Email al admin por cada error**: Puede generar spam de correos. Mejor centralizar en el panel.

**Implementation notes**:
- Tabla: `id`, `tipo` (error_api, correo_fallido, pago_fallido, config_error), `titulo`, `descripcion`, `fecha`, `leida` (0/1).
- Función utilitaria `registrarNotificacion(db, { tipo, titulo, descripcion })` usada por todos los servicios.
- API: `GET /api/admin/notificaciones` (paginado), `GET /api/admin/notificaciones/conteo` (no leídas), `PATCH /api/admin/notificaciones/:id` (marcar leída).
