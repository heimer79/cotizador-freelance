# Implementation Plan: Cotización UX, Impuestos y Mejoras Generales

**Branch**: `006-cotizacion-ux-impuestos` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-cotizacion-ux-impuestos/spec.md`

## Summary

Ampliar la plataforma PresupuestosPro con gestión de clientes guardados con logo, catálogo de servicios reutilizables, distinción empresa/independiente con impuestos colombianos configurables (IVA, retención en la fuente, retención de IVA, ICA), emisores múltiples (premium), plantillas de PDF personalizables (premium), borrador con preview dinámico y autoguardado, WhatsApp con PDF adjunto, unificación de textos legales, 2FA, SEO/metadatos/Core Web Vitals, eliminación de cotizaciones y actualización de planes.

El enfoque técnico extiende la arquitectura existente Express + Vue 3 + MySQL, añadiendo nuevas tablas y columnas al esquema, nuevos endpoints REST, componentes Vue y lógica de cálculo fiscal ampliada.

## Technical Context

**Language/Version**: Node.js (CommonJS backend), JavaScript ES Modules (frontend)

**Primary Dependencies**: Express 4.x, Vue 3.4, Vite 5.x, jsPDF 2.5, mysql2, Passport.js (Google/Facebook OAuth), nodemailer/resend, MercadoPago SDK

**Storage**: MySQL (mysql2/promise pool), esquema imperativo en `db.js` con `CREATE TABLE IF NOT EXISTS` y migraciones incrementales vía `ALTER TABLE`

**Testing**: `node --test` (test runner nativo de Node.js), archivos en `tests/` y `app/backend/tests/`

**Target Platform**: Web (SPA Vue 3 servida desde Express), desplegada en Hostinger

**Project Type**: Web application (SPA + API REST monolítica)

**Performance Goals**: Core Web Vitals zona verde (LCP < 2.5s, INP < 200ms, CLS < 0.1), vista previa actualizada en < 3s

**Constraints**: Hosting compartido Hostinger, logos en base64 (LONGTEXT MySQL), PDFs generados en cliente con jsPDF, sin ORM

**Scale/Scope**: Freelancers colombianos, cuentas gratuita/premium, ~13 user stories, ~51 functional requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Veredicto | Justificación |
|-----------|-----------|---------------|
| I. Simplicidad ante todo | PASA | Cada funcionalidad está solicitada explícitamente en la spec. No se introducen abstracciones innecesarias. Se extiende el esquema existente en lugar de reescribirlo. |
| II. Idioma y mercado | PASA | Todo en español de Colombia, COP. Los impuestos son los del Estatuto Tributario colombiano. |
| III. Cero alcance fantasma | PASA | Las 13 user stories y 51 FR están definidas en la spec. No se implementa nada fuera de ellas. |
| IV. Verificable por persona no técnica | PASA | Todos los criterios de éxito (SC-001 a SC-012) se verifican usando la app: creando cotizaciones, descargando PDFs, activando 2FA, revisando la página. |
| V. Datos del usuario con respeto | PASA | Solo se piden datos necesarios para cotizar (emisor, cliente, servicios, impuestos). Secretos en variables de entorno. 2FA con códigos de recuperación, no datos biométricos. |

**Resultado**: Sin violaciones. Se procede a Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/006-cotizacion-ux-impuestos/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-endpoints.md
└── tasks.md             # Phase 2 output (NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── backend/
│   ├── server.js            # Entry point, mounts routes
│   ├── db.js                # MySQL pool + schema creation
│   ├── auth.js              # Session/token auth, Passport strategies
│   ├── calculo.js           # Tax calculation logic (to extend)
│   ├── numeracion.js        # Quote numbering
│   ├── rutas/
│   │   ├── auth.js          # Registration, login, password reset
│   │   ├── clientes.js      # CRUD clientes (to extend: logo, search)
│   │   ├── catalogo.js      # CRUD servicios catálogo
│   │   ├── cotizaciones.js  # CRUD cotizaciones (to extend: delete, taxes, autosave)
│   │   ├── perfil.js        # Perfil emisor (to extend: multi-emitter, tax config)
│   │   └── grupos.js        # Grupos de clientes (premium)
│   ├── src/
│   │   ├── api/             # Admin, legal, donations, ads, sharing endpoints
│   │   ├── models/          # Domain models (notifications, subscriptions, etc.)
│   │   └── services/        # Email services (Gmail API, SMTP)
│   ├── datos/               # SQLite (legacy), PDFs temporales
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── App.vue          # Main SPA with router-like state
│   │   ├── api.js           # HTTP client wrapper
│   │   ├── pdf.js           # jsPDF generation (to extend: templates, full tax breakdown)
│   │   ├── main.js          # Vue app mount
│   │   ├── estilos.css      # Global styles
│   │   ├── components/      # Reusable UI components
│   │   ├── composables/     # Vue composables (auth, subscription, etc.)
│   │   └── vistas/          # Page-level views
│   └── dist/                # Built output served by Express
└── tests/                   # Integration/E2E tests
```

**Structure Decision**: Se mantiene la estructura monorepo existente `app/backend` + `app/frontend`. Los nuevos archivos se ubican siguiendo los patrones existentes: rutas en `rutas/`, modelos en `src/models/`, servicios en `src/services/`, vistas en `vistas/`, componentes en `components/`.

## Complexity Tracking

> No hay violaciones de la Constitution que justificar. La tabla queda vacía.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Constitution Re-Check (Post Phase 1 Design)

| Principio | Veredicto | Notas |
|-----------|-----------|-------|
| I. Simplicidad | PASA | El data model extiende tablas existentes con columnas nuevas; las tablas nuevas (emisores, plantillas_pdf, totp_2fa, codigos_recuperacion) son necesarias para FR explícitos. |
| II. Idioma y mercado | PASA | Todos los campos, mensajes y cálculos en COP/español colombiano. |
| III. Cero alcance fantasma | PASA | Cada tabla/endpoint mapea a un FR numerado. |
| IV. Verificable | PASA | quickstart.md documenta escenarios verificables por clic. |
| V. Datos con respeto | **FALLA** | El secreto TOTP se almacena como Base32 plano (`auth.js:156`), no cifrado. La clave de cifrado tiene valor por defecto hardcodeado en código fuente (`configuracion-plataforma.js:6`). Ver sección Security. |

---

## Security

> Derivado de la revisión de código realizada el 2026-10-09. Método: Sommerville ch. 13 — risk-driven security requirements.

### Política de seguridad

| Actor | Puede hacer | No puede hacer |
|---|---|---|
| Anónimo | Registrarse, iniciar sesión, acceder a enlace público de descarga con token válido | Leer o escribir datos de otros usuarios |
| Usuario gratuito | CRUD de sus propias cotizaciones/clientes/catálogo (hasta límite), descargar PDF | Acceder a datos de otros, usar plantillas premium |
| Usuario premium | Todo lo anterior, emisores múltiples, plantillas premium, grupos | Acceder a datos de otros, panel admin |
| Admin | Todo lo anterior sin límites, panel de gestión de usuarios y configuración | Leer datos de sesión/passwords de otros usuarios |
| Sistema (webhook) | Actualizar estado de donación/suscripción con firma válida | Ejecutar operaciones sin verificación de integridad |

### Tabla de riesgos

| Asset | Valor | Amenaza (C/I/A) | Exposición | Control actual | Req. id | Test id |
|---|---|---|---|---|---|---|
| Password hashes | Alto | C — exfiltración de BD | Alto | scrypt + sal aleatoria (✓) | SEC-01 | T-SEC-01 |
| Secretos TOTP | **Crítico** | C — exfiltración de BD | **Crítico** | **Ninguno: almacenados como Base32 plano** | **SEC-02** | **T-SEC-02** |
| Clave de cifrado AES | **Crítico** | C — lectura del código fuente | **Crítico** | **Default hardcodeado en fuente** | **SEC-03** | **T-SEC-03** |
| Archivos PDF en disco | Medio | I/C — path traversal | **Alto** | Magic bytes `%PDF` (insuficiente) | **SEC-04** | **T-SEC-04** |
| Sesiones activas | Alto | C — robo de cookie | Medio | `httpOnly`, `sameSite: lax`, expira 30 días | SEC-05 | T-SEC-05 |
| Datos de clientes (Ley 1581) | Alto | C — acceso no autorizado | Bajo | Middleware sesión + `usuario_id` en todas las queries (✓) | SEC-06 | T-SEC-06 |
| Credenciales de servicio (SMTP, MercadoPago) | Alto | C — fuente comprometida | Bajo | `.env` gitignoreado (✓) | SEC-07 | — |
| Endpoint de autenticación | Disponibilidad | A — brute force | **Alto** | **Sin rate limiting** | **SEC-08** | **T-SEC-08** |
| Logos base64 | Medio | I — SVG con scripts | Bajo | Valida `startsWith('data:image/')` (insuficiente para SVG) | SEC-09 | T-SEC-09 |

### Hallazgos críticos — requieren corrección antes de producción

#### SEC-02 — TOTP secrets en texto plano
**Archivo**: [app/backend/rutas/auth.js:156](../../app/backend/rutas/auth.js#L156) y línea 321  
**Descripción**: `secreto_cifrado` en tabla `totp_2fa` contiene el secreto TOTP como Base32 directo. A pesar del nombre de la columna, el código hace `Secret.fromBase32(totp2fa.secreto_cifrado)` sin ninguna capa de descifrado. Un volcado de la BD expone todos los secretos TOTP, permitiendo generar códigos OTP válidos para cualquier usuario con 2FA activo.  
**Corrección**: cifrar el secreto con AES-256-GCM usando `CONFIG_ENCRYPTION_KEY` antes de INSERT, descifrar antes de validar. Reusar `cifrar`/`descifrar` de `configuracion-plataforma.js` una vez corregido SEC-03.

#### SEC-03 — Clave de cifrado AES hardcodeada en código fuente
**Archivo**: [app/backend/src/models/configuracion-plataforma.js:6](../../app/backend/src/models/configuracion-plataforma.js#L6)  
**Descripción**: `const CLAVE_CIFRADO = process.env.CONFIG_ENCRYPTION_KEY || 'presupuestospro-default-key-32ch'`. La clave de respaldo `'presupuestospro-default-key-32ch'` está en el repositorio. Cualquier despliegue que omita `CONFIG_ENCRYPTION_KEY` usa esta clave conocida, haciendo la "encriptación" completamente transparente.  
**Corrección**: eliminar el valor por defecto. Si `CONFIG_ENCRYPTION_KEY` no está definida, lanzar error al arrancar (`throw new Error('CONFIG_ENCRYPTION_KEY no configurada')`).

#### SEC-04 — Path traversal en nombre de archivo PDF
**Archivo**: [app/backend/src/api/compartir.js:25-35](../../app/backend/src/api/compartir.js#L25)  
**Descripción**: `nombre` proviene de `req.body` y se incorpora en la ruta del archivo mediante `path.join('datos/pdfs-temporales', `${Date.now()}-${nombre}`)`. Como `path.join` resuelve segmentos `..`, un `nombre` con suficientes secuencias `../` puede escapar del directorio `datos/pdfs-temporales/`. El archivo resultante se guarda en la BD como `ruta_pdf` y es servido directamente en la ruta pública `/compartir/:token`. Un atacante podría escribir un archivo con cabecera `%PDF` en una ruta arbitraria del servidor y luego leerlo vía el enlace público.  
**Escenario**: `nombre = "../../../../../server.js"` → `ruta_pdf = "../../server.js"` → `rutaAbsoluta` apunta fuera de `app/backend/`.  
**Corrección**: sanitizar `nombre` antes de usarlo: `const nombreSeguro = path.basename(nombre || `cotizacion-${cotizacion.numero}.pdf`)`. `path.basename` extrae solo el componente final, eliminando cualquier traversal.

#### SEC-08 — Sin rate limiting en endpoints de autenticación
**Archivo**: [app/backend/rutas/auth.js](../../app/backend/rutas/auth.js) y [app/backend/server.js](../../app/backend/server.js)  
**Descripción**: Los endpoints `POST /api/auth/login`, `POST /api/auth/registro` y `POST /api/auth/solicitar-restablecer` no tienen rate limiting ni lockout. Un atacante puede intentar contraseñas indefinidamente.  
**Corrección**: añadir `express-rate-limit` con ventana de 15 minutos y máximo ~5-10 intentos para login y solicitar-restablecer. Para registro, ~10 solicitudes por IP por hora.

### Hallazgos medios — corregir antes de lanzamiento

#### SEC-09 — SVG admitido como logo
**Archivo**: [app/backend/rutas/perfil.js:32](../../app/backend/rutas/perfil.js#L32)  
**Descripción**: `data:image/svg+xml` pasa la validación `startsWith('data:image/')`. SVG es un formato activo que puede contener `<script>` y referencias externas. Si el logo se renderiza como `<img src="...">` en el navegador (no en PDF), los browsers modernos suprimen scripts en SVG embebido en `<img>`, pero la validación debería ser explícita.  
**Corrección**: validar contra lista blanca de MIME types seguros: `['data:image/png;', 'data:image/jpeg;', 'data:image/gif;', 'data:image/webp;']`.

### Controles confirmados (no requieren acción)

- **Inyección SQL**: todas las queries usan `pool.execute(sql, params)` con parámetros separados (mysql2 parameterized). ✓  
- **XSS en campos de texto**: `sanitizarTexto` en cotizaciones elimina etiquetas HTML. ✓  
- **HTTP security headers**: Helmet con CSP estricta, `frameSrc: none`, `objectSrc: none`. ✓  
- **CSRF**: cookies `httpOnly + sameSite: lax` bloquean POST/PUT/PATCH/DELETE cross-site. ✓  
- **Enumeración de usuarios en login**: mensaje unificado "Correo o contraseña incorrectos". ✓  
- **Tokens de correo**: almacenados como SHA-256 hash, consumo atómico (DELETE al validar). ✓  
- **Autorización a nivel de recurso**: todas las queries de datos incluyen `AND usuario_id = ?`. ✓  
- **`.env` no rastreado en git**: verificado en `.gitignore` y no aparece en `git log`. ✓  

### Límites de confianza

```
Internet → [Nginx/proxy] → Express (CSP, Helmet)
                              ├── /api/auth/*          ← validación de entrada, sin rate limit ⚠
                              ├── /api/* (protegido)   ← sesión verificada en BD, estado checked
                              ├── /api/admin/*         ← sesión + rol admin
                              ├── /compartir/:token    ← token UUID en BD, sin auth ← path traversal ⚠
                              └── /api/donaciones/webhook ← firma Wompi/MP pendiente de revisar
                            ↓
                         MySQL (queries parametrizadas)
                         datos/pdfs-temporales/ (archivos temporales 7 días)
```

### Gestión de secretos

| Secreto | Dónde vive | Rotación | Quién puede leerlo |
|---|---|---|---|
| `DB_PASSWORD` | `.env` (no en git) | Manual | Deployer |
| `SMTP_PASS` | `.env` (no en git) | Manual | Deployer |
| `MERCADOPAGO_ACCESS_TOKEN` | `.env` | Manual | Deployer |
| `CONFIG_ENCRYPTION_KEY` | `.env` — **debe definirse** | Manual | Deployer |
| Hashes de sesión | Tabla `sesiones` en BD | Auto-expira 30 días | Servidor |
| Secretos TOTP | Tabla `totp_2fa` — **texto plano** ⚠ | Manual (2FA reset) | Cualquier acceso a BD |

### Modelo de autenticación y autorización

- **Mecanismo**: cookie `sesion` `httpOnly` / `sameSite: lax` / `secure: true` en producción. Token aleatorio (32 bytes) almacenado como SHA-256. Lifetime: 30 días.  
- **Roles**: `normal` < `premium` < `admin`. Comprobado en middleware por rol, no en cliente.  
- **OAuth (Google)**: Passport.js. Cuenta vinculada por email; si el email ya existe, se asocia el proveedor.  
- **2FA**: TOTP (otpauth), ventana 1 (`window: 1` = ±30s). **Secreto actualmente en texto plano** — ver SEC-02.  
- **Reset de contraseña**: token SHA-256 en `tokens_correo`, vigencia 1 hora, consumo único.

### Registro y auditoría

- Tabla `historial_actividad`: registra login, tipo OAuth. No registra intentos fallidos de login ni cambios de rol.  
- **Brecha**: los intentos fallidos de login no se registran — no hay forma de detectar un ataque de fuerza bruta en curso. Corrección: insertar entrada en `historial_actividad` (o tabla separada `intentos_login`) en cada fallo de autenticación.

### Plan de validación de seguridad

| Método | Qué cubre | Cadencia | Responsable |
|---|---|---|---|
| SAST (eslint-plugin-security) | Patrones inseguros en JS | En cada PR | CI |
| Dependency audit (`npm audit`) | CVEs en dependencias | Semanal + en cada merge | CI |
| Revisión manual de inputs | Path traversal, validación de tipos | Antes de cada release | Dev |
| Pen test manual (autenticación) | Brute force, session fixation, IDOR | Antes del lanzamiento público | Dev/QA |

### Riesgo residual aceptado

| Riesgo | Justificación de aceptación |
|---|---|
| Logos SVG (SEC-09) | Los navegadores modernos bloquean scripts en SVG dentro de `<img>`. Riesgo bajo hasta añadir validación. |
| Sesiones de 30 días sin rotación | Usabilidad: usuarios en móvil esperan no re-autenticarse. Mitigado por `httpOnly` + HTTPS. |
| `/api/config/ads` sin auth | Datos no sensibles (IDs de AdSense ya públicos en el HTML). Aceptado explícitamente. |
