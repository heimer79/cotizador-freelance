# Tasks: Roles, Cuentas Premium y Marco Legal

**Input**: Design documents from `/specs/005-roles-cuentas-legal/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Tests are NOT included in this task list. The plan.md lists test files (auth-social.test.js, suscripcion.test.js, admin.test.js, legal.test.js) but TDD was not explicitly requested. Add test tasks separately if needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `app/backend/` (existing Express API)
- **Frontend**: `app/frontend/src/` (existing Vue 3 SPA)
- **New backend modules**: `app/backend/src/api/`, `app/backend/src/models/`, `app/backend/src/services/`
- **Tests**: `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, new directories, and dependencies

- [X] T001 Create new directory structure: `app/backend/src/api/`, `app/backend/src/models/`, `app/backend/datos/pdfs-temporales/`, `app/frontend/src/components/admin/`, `app/frontend/src/components/legal/`, `app/frontend/src/components/premium/`, `app/frontend/src/composables/`
- [X] T002 [P] Install backend dependencies in `app/package.json`: passport, passport-google-oauth20, passport-facebook, googleapis, mercadopago, uuid
- [X] T003 [P] Update `app/backend/.env.example` with new environment variables: ADMIN_EMAIL, MERCADOPAGO_ACCESS_TOKEN, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, FACEBOOK_OAUTH_APP_ID, FACEBOOK_OAUTH_APP_SECRET

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, core models, authorization middlewares, and shared UI components that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Extend database schema in `app/backend/db.js` — add columns to `usuarios` table (rol TEXT DEFAULT 'normal', tipo_cuenta TEXT DEFAULT 'gratuita', estado TEXT DEFAULT 'activo'), make password_hash nullable, create 10 new tables (auth_proveedores, suscripciones, grupos_clientes, clientes_grupos, documentos_legales, aceptaciones_legales, configuracion_plataforma, notificaciones_admin, enlaces_temporales, historial_actividad) with all constraints, indexes, and foreign keys per `data-model.md`
- [X] T005 Add database seed logic in `app/backend/db.js` — insert 5 initial legal documents (privacidad, sarlaft, donaciones, terminos_uso, terminos_premium) with full content from spec.md "Textos Legales" section, create auth_proveedores 'email' entry for each existing user, assign rol='admin' to user matching ADMIN_EMAIL env var
- [X] T006 [P] Create `app/backend/src/models/configuracion-plataforma.js` — obtener(clave), establecer(clave, valor, sensible), obtenerSeccion(seccion) with encryption for fields where sensible=1
- [X] T007 [P] Create `app/backend/src/models/notificacion.js` — registrarNotificacion({tipo, titulo, descripcion}), listar(pagina, limite), contarNoLeidas(), marcarLeida(id)
- [X] T008 [P] Create `app/backend/src/models/documento-legal.js` — obtenerActivos(), obtenerPorTipo(tipo), verificarAceptacion(usuarioId), registrarAceptacion(usuarioId, documentoIds)
- [X] T009 [P] Create `app/backend/src/models/historial-actividad.js` — registrar({usuarioId, tipo, detalle}), obtenerRecientes(usuarioId) with 20-entry retention limit per user
- [X] T010 [P] Create `app/backend/src/models/enlace-temporal.js` — crear({usuarioId, rutaPdf}), verificar(token), limpiarExpirados() with UUID token and 7-day expiration
- [X] T011 [P] Create `app/backend/src/models/suscripcion.js` — crear({usuarioId, modalidad, pasarela, referencia}), obtenerEstado(usuarioId), verificarVigencia(), cancelarRenovacion(), state transitions (activa→vencida→gracia→retencion→delete) per `data-model.md`
- [X] T012 Add authorization middlewares in `app/backend/auth.js` — soloAdmin() rejects non-admin with 403, requiereAceptacionLegal() returns 403 with pending docs list, verificarPremium() rejects non-premium with 403 and enlacePlanes, verificarEstado() blocks suspended users with message
- [X] T013 Extend GET /api/auth/yo in `app/backend/rutas/auth.js` — include rol, tipoCuenta, estado, proveedores array in response per `contracts/api.md`
- [X] T014 [P] Create `app/frontend/src/components/ToastNotification.vue` — success messages auto-close 5s, error messages persist until manual close, loading indicators auto-close 5s, ARIA live region for screen reader announcements per FR-047, FR-048, FR-042

**Checkpoint**: Foundation ready — all tables, models, middlewares and utility components are in place. User story implementation can begin.

---

## Phase 3: User Story 1 — Registro e inicio de sesión con Google y Facebook (Priority: P1) 🎯 MVP

**Goal**: Users can register and log in with Google, Facebook, or email/password. Social accounts are linked by email.

**Independent Test**: Click "Iniciar sesión con Google" → complete Google auth → verify user is authenticated with name and email from Google. Repeat with Facebook. Verify account linking when same email is used with different providers.

### Implementation for User Story 1

- [X] T015 [US1] Configure Passport.js in `app/backend/auth.js` — initialize passport with session serialization, add GoogleStrategy and FacebookStrategy reading credentials from configuracion_plataforma table with .env fallback, implement account linking by email (FR-011): if user with same email exists, link provider; otherwise create new user. Handle strategy failures gracefully (EC6): on provider error, redirect to /login?error={provider}_failed so user sees alternative login methods
- [X] T016 [US1] Create OAuth and password routes in `app/backend/rutas/auth.js` — GET /api/auth/google (redirect to Google consent), GET /api/auth/google/callback (create/link account, set session cookie, redirect to / or /login?error=google_failed), GET /api/auth/facebook, GET /api/auth/facebook/callback, POST /api/auth/establecer-password (allow social-only users to set password, FR-012b) per `contracts/api.md`
- [X] T017 [US1] Register Passport middleware (passport.initialize, passport.session), verificarEstado() (block suspended users on all authenticated routes, FR-006b) and requiereAceptacionLegal() (enforce pending terms acceptance on all authenticated non-legal routes, FR-033/FR-035) as global middlewares, and social auth routes in `app/backend/server.js`
- [X] T018 [P] [US1] Create `app/frontend/src/composables/useAuth.js` — reactive auth state (user, isAdmin, isPremium, proveedores), login/logout methods, social login redirect methods, error state handling
- [X] T019 [US1] Extend `app/frontend/src/components/LoginModal.vue` — add "Iniciar sesión con Google" and "Iniciar sesión con Facebook" buttons linking to /api/auth/google and /api/auth/facebook, add password visibility toggle icon (FR-010b), handle redirect error query params
- [X] T020 [US1] Update `app/frontend/src/App.vue` — handle auth callback error query params (/login?error=google_failed, /login?error=facebook_failed), integrate useAuth composable for global auth state
- [X] T021 [US1] Add password setup section in `app/frontend/src/vistas/PerfilView.vue` — form to establish password for social-only users (shown only when user has no 'email' provider), calls POST /api/auth/establecer-password (FR-012b)

**Checkpoint**: Users can register and log in with Google, Facebook, or email/password. Social accounts linked by email. Password can be set from profile.

---

## Phase 4: User Story 5 — Aceptación de términos legales obligatoria (Priority: P1)

**Goal**: Registration requires explicit acceptance of privacy policy and terms of use. Updated terms trigger re-acceptance. Legal documents accessible from any page footer.

**Independent Test**: Register as new user → verify checkbox for terms is required before account creation. Update a legal document version → log in as existing user → verify re-acceptance modal appears.

### Implementation for User Story 5

- [X] T022 [US5] Create `app/backend/src/api/legal.js` — GET /api/legal/documentos (list active docs), GET /api/legal/documentos/:tipo (full content by type), POST /api/legal/aceptar (register acceptance of document IDs), GET /api/legal/estado (check pending acceptances) per `contracts/api.md`
- [X] T023 [US5] Register legal routes in `app/backend/server.js` — GET endpoints are public, POST /aceptar and GET /estado require session
- [X] T024 [P] [US5] Create `app/frontend/src/vistas/LegalView.vue` — display full legal document content by type (privacidad, sarlaft, donaciones, terminos_uso, terminos_premium), loaded via GET /api/legal/documentos/:tipo
- [X] T025 [P] [US5] Create `app/frontend/src/components/legal/AceptacionTerminosModal.vue` — modal listing pending legal documents with checkboxes and links to full text, "Aceptar" button calls POST /api/legal/aceptar, blocks app navigation until all accepted
- [X] T026 [US5] Extend `app/frontend/src/components/LoginModal.vue` — add mandatory terms acceptance checkbox with links to privacy policy and terms of use during registration (FR-033), prevent account creation if not checked
- [X] T027 [US5] Add re-acceptance logic in `app/frontend/src/App.vue` — on authenticated route load, call GET /api/legal/estado; if pendientes exist, show AceptacionTerminosModal before allowing navigation (FR-035)
- [X] T028 [US5] Add legal document links in footer area of `app/frontend/src/App.vue` — persistent links to Política de Privacidad, SARLAFT, Donaciones, Términos de Uso accessible from every page in max 2 clicks (FR-036, SC-006)

**Checkpoint**: Registration requires terms acceptance. Updated terms trigger re-acceptance on login. Legal docs accessible from footer on all pages.

---

## Phase 5: User Story 2 — Rol de administrador: gestión de configuración y usuarios (Priority: P1)

**Goal**: Admin can configure AdSense, payment gateways, social auth credentials, Gmail API, manage users (suspend/reactivate, assign admin), view notifications, and browse DB tables.

**Independent Test**: Log in as admin → access admin panel → change AdSense ID → verify change reflected. View user list → suspend a user → verify they can't log in. View notification count badge.

### Implementation for User Story 2

- [X] T029 [US2] Create `app/backend/src/api/admin.js` — config CRUD endpoints: GET/PUT /api/admin/config/:seccion (adsense, pasarelas, auth_social, correo) reading/writing configuracion_plataforma, user management: GET /api/admin/usuarios (paginated, searchable), PATCH /api/admin/usuarios/:id/suspender, PATCH /api/admin/usuarios/:id/rol with EC4 last-admin protection per `contracts/api.md`
- [X] T030 [US2] Extend `app/backend/src/api/admin.js` — notification endpoints: GET /api/admin/notificaciones (paginated), GET /api/admin/notificaciones/conteo, PATCH /api/admin/notificaciones/:id (mark read), DB viewer: GET /api/admin/bd/:tabla with authorized whitelist (usuarios, suscripciones, configuracion_plataforma, documentos_legales, aceptaciones_legales, notificaciones_admin, donacion, auth_proveedores, historial_actividad), excludes cotizaciones/clientes per FR-007, FR-052-054
- [X] T031 [US2] Register admin routes with soloAdmin middleware in `app/backend/server.js`
- [X] T032 [P] [US2] Create `app/backend/src/services/gmail-service.js` — Gmail API with OAuth2 via googleapis package, enviar({para, asunto, texto, html}) method matching email-service.js interface, uses Refresh Token from configuracion_plataforma
- [X] T033 [US2] Extend `app/backend/src/services/email-service.js` — add service selection logic: if Gmail credentials configured and valid in configuracion_plataforma, use GmailService; otherwise fallback to Resend. On send failure, call registrarNotificacion() and retry up to 3 times (FR-040)
- [X] T034 [P] [US2] Create `app/frontend/src/vistas/AdminView.vue` — admin panel layout with tab/section navigation for 7 sections: AdSense, Pasarelas, Auth Social, Correo, Notificaciones, Usuarios, Visor BD
- [X] T035 [P] [US2] Create `app/frontend/src/components/admin/AdminConfigAdsense.vue` — form to view and edit AdSense identifier, save via PUT /api/admin/config/adsense
- [X] T036 [P] [US2] Create `app/frontend/src/components/admin/AdminConfigPasarelas.vue` — forms for MercadoPago donation link, PayPal donation link, and MercadoPago access token para suscripciones (campo sensible, FR-029), save via PUT /api/admin/config/pasarelas
- [X] T037 [P] [US2] Create `app/frontend/src/components/admin/AdminConfigAuth.vue` — forms for Google OAuth (Client ID, Client Secret) and Facebook OAuth (App ID, App Secret) credentials, save via PUT /api/admin/config/auth_social, show _configurado status
- [X] T038 [P] [US2] Create `app/frontend/src/components/admin/AdminConfigCorreo.vue` — form for Gmail API credentials (Client ID, Client Secret) and sender email address, save via PUT /api/admin/config/correo
- [X] T039 [P] [US2] Create `app/frontend/src/components/admin/AdminUsuarios.vue` — paginated user list (nombre, correo, tipoCuenta, rol, fechaRegistro, estado) with search, suspend/reactivate buttons, assign/revoke admin role buttons
- [X] T040 [P] [US2] Create `app/frontend/src/components/admin/AdminNotificaciones.vue` — notification list showing tipo, titulo, descripcion, fecha, leida status with mark-as-read action, unread count badge
- [X] T041 [P] [US2] Create `app/frontend/src/components/admin/AdminVisorBD.vue` — read-only table browser with dropdown to select authorized tables, paginated rows display, text search across TEXT columns
- [X] T042 [US2] Extend `app/frontend/src/components/NavBar.vue` — add "Administración" link visible only when user.rol === 'admin', add notification badge with unread count fetched from GET /api/admin/notificaciones/conteo

**Checkpoint**: Admin panel fully functional. Admin can configure platform settings, manage users, view system notifications, and browse DB tables (read-only).

---

## Phase 6: User Story 3 — Cuenta premium sin publicidad con almacenamiento (Priority: P2)

**Goal**: Users can subscribe to premium ($20 USD/year via MercadoPago), remove ads, persist quotations (max 500), clients (max 200), and create client groups (max 50). Free users have session-only data. Expired subscriptions enter grace → retention → deletion.

**Independent Test**: Log in as free user → verify ads visible, data not persisted on logout. Subscribe to premium → verify ads gone, quotations and clients persist. Create client groups. Expire subscription → verify read-only mode.

### Implementation for User Story 3

- [X] T043 [US3] Create `app/backend/src/api/suscripcion.js` — POST /api/suscripcion/crear (create MercadoPago payment preference with back_urls and notification_url, requires accepted premium terms; on MercadoPago API failure return descriptive error per EC3: "Servicio de pago temporalmente no disponible"), POST /api/suscripcion/webhook (verify MercadoPago HMAC signature, update subscription to 'activa', set tipo_cuenta='premium', send confirmation email via email-service per FR-039c), POST /api/suscripcion/cancelar (cancel auto-renewal), GET /api/suscripcion/estado per `contracts/api.md`
- [X] T044 [US3] Register subscription routes in `app/backend/server.js` — POST webhook is public (HMAC verified), others require session
- [X] T045 [US3] [FR-026] Implement MercadoPago for donations in `app/backend/src/services/donacion-service.js` — payment preference creation via MercadoPago Checkout Pro, webhook verification (HMAC), read MercadoPago credentials from configuracion_plataforma with .env fallback. PayPal donation link as alternativa (enlace directo configurado por admin, FR-027)
- [X] T046 [US3] Add premium storage enforcement in `app/backend/rutas/cotizaciones.js` — free users: cotizaciones marked temporal, deleted on logout or after 24h inactivity (FR-015); premium users: persist up to 500 cotizaciones (FR-021, EC7); reject save for free users with premium upsell message
- [X] T047 [US3] Add client storage restrictions in `app/backend/rutas/clientes.js` — free users: reject client save with premium upsell and enlacePlanes (FR-016); premium users: persist up to 200 clients (FR-022, EC7)
- [X] T048 [US3] Add subscription lifecycle management in `app/backend/server.js` — on startup AND setInterval every 6 hours, check suscripciones for state transitions: activa past fecha_vencimiento → vencida, vencida past 30 days → gracia (read-only), gracia past 90 days → retencion (delete user data: cotizaciones, clientes, grupos), update tipo_cuenta accordingly per `data-model.md`
- [X] T049 [P] [US3] Create `app/frontend/src/composables/useSuscripcion.js` — reactive subscription state (tipoCuenta, suscripcion, diasRestantes), isPremium computed, showPremiumUpsell method, subscription status check
- [X] T050 [US3] Update `app/frontend/src/App.vue` — integrate useSuscripcion, conditionally show/hide AdSense ads based on tipoCuenta (FR-020), show premium upsell ToastNotification when free user hits restrictions (FR-015, FR-016, FR-017)
- [X] T051 [US3] Add subscription management UI in `app/frontend/src/vistas/PerfilView.vue` — display subscription estado/modalidad/fechaVencimiento/diasRestantes, "Cancelar renovación automática" button, "Renovar" button for expired, premium terms acceptance before payment redirect (FR-034), renewal warning for vencida/gracia states (FR-024)
- [X] T052 [P] [US3] Create `app/backend/rutas/grupos.js` — GET /api/grupos (list user groups with client count), POST /api/grupos (create, max 50 per FR-023), PUT /api/grupos/:id (rename), DELETE /api/grupos/:id (remove group, keep clients), POST /api/grupos/:id/clientes (assign clients), DELETE /api/grupos/:id/clientes/:clienteId (unassign) — all with verificarPremium middleware per `contracts/api.md`
- [X] T053 [US3] Register groups routes in `app/backend/server.js`
- [X] T054 [P] [US3] Create `app/frontend/src/components/premium/GruposClientes.vue` — list groups with client counts, create/rename/delete groups, assign/unassign clients via drag or select, 50-group limit indicator

- [X] T067 [P] [US3] Add subscription renewal reminder emails in `app/backend/server.js` — periodic check (alongside T048 lifecycle check, every 6h) for subscriptions expiring in 10 days or 1 day: send reminder email via email-service (FR-039b) with link to renewal page. Track sent reminders in historial_actividad to avoid duplicate sends

**Checkpoint**: Premium subscription flow works end-to-end. Free users have session-only data with upsell prompts. Client groups functional for premium users.

---

## Phase 7: User Story 4 — Cuadro comparativo de cuentas (Priority: P2)

**Goal**: Clear side-by-side comparison table showing free vs premium features, with price highlighted and accessible from multiple navigation points.

**Independent Test**: Navigate to plans page → verify side-by-side comparison shows all feature differences, price $20 USD/year is highlighted with monthly equivalent and COP estimate. Verify accessible from at least 3 points in the platform.

### Implementation for User Story 4

- [X] T055 [US4] Create `app/frontend/src/vistas/PlanesView.vue` — side-by-side comparison table: publicidad (gratuita: sí / premium: no), guardar cotizaciones (no / sí, hasta 500), guardar clientes (no / sí, hasta 200), grupos de clientes (no / sí, hasta 50), common features. Price $20 USD/año visually highlighted with "Menos de $2 USD al mes" and approximate COP equivalent. "Obtener Premium" CTA button linking to subscription flow (FR-025, SC-007)
- [X] T056 [US4] Add navigation links to PlanesView from at least 3 points: "Planes" item in `app/frontend/src/components/NavBar.vue`, premium restriction toast messages (link in upsell text), and footer area in `app/frontend/src/App.vue` (SC-007)

**Checkpoint**: Comparison table visible and accessible from 3+ navigation points. Price highlighted with monthly and COP equivalents.

---

## Phase 8: Compartir cotización por WhatsApp

**Purpose**: Generate server-side PDF, create temporary public download link, share via WhatsApp wa.me URL. Available to all users (free and premium).

- [X] T057 Create `app/backend/src/api/compartir.js` — POST /api/cotizaciones/compartir (receive cotizacionId for premium or datosCotizacion for free users, generate PDF server-side, save to `app/backend/datos/pdfs-temporales/`, create enlace_temporal with 7-day expiry, return enlace and enlaceWhatsApp wa.me URL), GET /compartir/:token (serve PDF file if not expired, return 410 with expiry message if expired) per `contracts/api.md`
- [X] T058 Register share routes in `app/backend/server.js` — GET /compartir/:token is public (no auth), POST /api/cotizaciones/compartir requires session
- [X] T059 Add WhatsApp share button in the cotización view component in `app/frontend/src/` — button calls POST /api/cotizaciones/compartir, on success opens returned enlaceWhatsApp URL (wa.me link), available for all users gratuitos and premium (FR-050, FR-051)
- [X] T060 [P] Add expired link error page — when GET /compartir/:token returns 410, display message "Este enlace de descarga ha expirado. Solicita un nuevo enlace al remitente." (FR-056)

**Checkpoint**: WhatsApp sharing works for all users. Temporary PDF links created and served publicly. Expired links show clear message.

---

## Phase 9: User Story 6 — Créditos "Powered by Digital Pyme Solutions" (Priority: P3)

**Goal**: Attribution text visible in footer of all pages with functional link.

**Independent Test**: Navigate to any page → scroll to footer → verify "Creado por: Digital Pyme Solutions (DPS)" text with working link to https://digitalpymesolutions.dev/. Verify legible at 360px mobile width.

### Implementation for User Story 6

- [X] T061 [US6] Add "Creado por: Digital Pyme Solutions (DPS)" text with functional link to https://digitalpymesolutions.dev/ in footer of `app/frontend/src/App.vue`, verify legibility and tap target at 360px viewport width (FR-037, SC-008)

**Checkpoint**: Attribution visible on every page, functional link, responsive at mobile widths.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Activity history, accessibility, cleanup jobs, and end-to-end validation

- [X] T062 [P] Add user activity history endpoint in `app/backend/rutas/perfil.js` — GET /api/perfil/actividad returning últimos 5 logins (fecha, proveedor) and cambios recientes (tipo, detalle, fecha) per `contracts/api.md` (FR-049)
- [X] T063 [P] Add activity history display in `app/frontend/src/vistas/PerfilView.vue` — section showing últimos 5 logins with date/time/provider and recent account changes (cambio_tipo_cuenta, aceptacion_terminos) (FR-049)
- [X] T064 [P] Add WCAG 2.1 AA accessibility across all new frontend components — contrast ratio verification (4.5:1 normal, 3:1 large text), keyboard navigation (Tab/Enter/Escape), accessible labels on interactive elements, alt text on functional images, alt="" on decorative images (FR-041, FR-042, FR-043)
- [X] T065 [P] Add expired PDF cleanup in `app/backend/server.js` — periodic cleanup (on startup + setInterval 24h) calling enlace-temporal.limpiarExpirados() and deleting expired files from `app/backend/datos/pdfs-temporales/`
- [X] T066 Run quickstart.md validation scenarios VS-1 through VS-20 and verify all success criteria SC-001 through SC-011
- [X] T068 [P] Add temporal cotizaciones cleanup in `app/backend/server.js` — periodic job (on startup + setInterval every 6 hours, alongside T048/T065) deleting cotizaciones where temporal=1 and last activity > 24 hours of inactivity (FR-015)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T003) — BLOCKS all user stories
- **US1 Auth Social (Phase 3)**: Depends on Foundational (Phase 2)
- **US5 Terms (Phase 4)**: Depends on Foundational (Phase 2), can run in parallel with US1
- **US2 Admin (Phase 5)**: Depends on Foundational (Phase 2), can run in parallel with US1/US5
- **US3 Premium (Phase 6)**: Depends on Foundational (Phase 2), benefits from US1 (auth) and US5 (terms acceptance for premium)
- **US4 Comparison (Phase 7)**: Depends on US3 (Premium) for CTA integration
- **WhatsApp (Phase 8)**: Depends on Foundational (Phase 2)
- **US6 Credits (Phase 9)**: Depends on Setup only — no other dependencies
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1) Auth Social**: Can start after Foundational — No dependencies on other stories
- **US5 (P1) Terms**: Can start after Foundational — No dependencies on other stories
- **US2 (P1) Admin**: Can start after Foundational — Benefits from US1 for testing social auth config
- **US3 (P2) Premium**: Can start after Foundational — Integrates with US5 (terms acceptance for premium subscription)
- **US4 (P2) Comparison**: Depends on US3 for subscription CTA flow
- **US6 (P3) Credits**: Independent — only needs App.vue footer area

### Within Each User Story

- Models before services
- Services before API routes
- API routes registered in server.js before frontend can consume them
- Backend endpoints before frontend components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational models (T006–T011) can run in parallel (different files)
- T014 (ToastNotification) can run in parallel with models
- Once Foundational completes, P1 stories (US1, US5, US2) can start in parallel (note: server.js modifications within each story are sequential)
- All admin frontend components (T035–T041) can run in parallel (different files)
- US6 (Credits) can run in parallel with any other story

---

## Parallel Example: User Story 2 (Admin)

```bash
# After admin backend routes created (T029-T031), launch all admin frontend components in parallel:
Task: T035 "AdminConfigAdsense.vue"
Task: T036 "AdminConfigPasarelas.vue"
Task: T037 "AdminConfigAuth.vue"
Task: T038 "AdminConfigCorreo.vue"
Task: T039 "AdminUsuarios.vue"
Task: T040 "AdminNotificaciones.vue"
Task: T041 "AdminVisorBD.vue"

# These 7 components are independent files — no dependencies between them
```

## Parallel Example: Foundational Models

```bash
# After schema migration (T004-T005), launch all models in parallel:
Task: T006 "configuracion-plataforma.js"
Task: T007 "notificacion.js"
Task: T008 "documento-legal.js"
Task: T009 "historial-actividad.js"
Task: T010 "enlace-temporal.js"
Task: T011 "suscripcion.js"
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 — Auth Social → **Test**: Login with Google/Facebook works
4. Complete Phase 4: US5 — Legal Terms → **Test**: Registration requires terms acceptance
5. Complete Phase 5: US2 — Admin Panel → **Test**: Admin can configure platform
6. **STOP and VALIDATE**: Test VS-1 through VS-6, VS-10 through VS-12, VS-17
7. Deploy/demo MVP with roles, auth social, admin, and legal compliance

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US5 + US2 → Test independently → Deploy (MVP: roles, auth, admin, legal)
3. Add US3 → Test independently → Deploy (Premium subscriptions, storage)
4. Add US4 → Test independently → Deploy (Comparison table, conversion)
5. Add WhatsApp → Test independently → Deploy (PDF sharing)
6. Add US6 → Test independently → Deploy (Credits)
7. Polish → Final validation → Release

### Parallel Team Strategy

With multiple developers after Foundational phase:

- **Developer A**: US1 (Auth Social) + US5 (Terms) — both P1, related to auth flow
- **Developer B**: US2 (Admin Panel) — P1, independent backend/frontend
- **Developer C**: US3 (Premium) + US4 (Comparison) — P2, closely related

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- server.js is modified by multiple phases — within each phase, server.js registration is the last step
- Constitution compliance: Principio I (no unnecessary abstractions), Principio II (all UI in Spanish Colombia, COP), Principio III (only spec'd features), Principio V (secrets in env/DB, not code)
- Principio II (v1.1.0): USD informativo permitido por constitución enmendada (FR-019, FR-025)
