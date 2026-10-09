# Tasks: Cotización UX, Impuestos y Mejoras Generales

**Input**: Design documents from `/specs/006-cotizacion-ux-impuestos/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No se solicitaron tests explícitamente en la spec. Las tareas de test se omiten. La validación se hace manualmente con quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `app/backend/`
- **Frontend**: `app/frontend/src/`
- **Routes**: `app/backend/rutas/`
- **Views**: `app/frontend/src/vistas/`
- **Components**: `app/frontend/src/components/`
- **Composables**: `app/frontend/src/composables/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema migrations, new tables, and shared configuration

- [X] T001 Add new columns to `clientes` table (`email`, `telefono`) in `app/backend/db.js`
- [X] T002 Add new columns to `cotizaciones` table (`emisor_id`, `emisor_tipo`, `iva_responsable`, `reteiva_activada`, `reteiva_porcentaje`, `reteica_activada`, `reteica_porcentaje`, `compensar_retencion`, `cliente_email`, `cliente_telefono`, `cliente_logo_base64`, `plantilla_pdf`, `colores_pdf`) in `app/backend/db.js`
- [X] T003 Add `tipo_emisor` column to `perfil` table in `app/backend/db.js`
- [X] T004 Add `totp_activo`, `plantilla_pdf_preferida`, `colores_pdf_preferidos` columns to `usuarios` table in `app/backend/db.js`
- [X] T005 Create `emisores` table with all columns per data-model.md in `app/backend/db.js`
- [X] T006 Create `totp_2fa` table per data-model.md in `app/backend/db.js`
- [X] T007 Create `codigos_recuperacion` table per data-model.md in `app/backend/db.js`
- [X] T008 Create `plantillas_pdf` table with seed data (profesional, moderna, ejecutiva) per data-model.md in `app/backend/db.js`
- [X] T009 Create migration logic to populate initial `emisores` row from existing `perfil` data for each user in `app/backend/db.js`
- [X] T080 Create `enlaces_descarga` table per data-model.md (id, cotizacion_id FK, uuid UNIQUE, fecha_expiracion, fecha_creacion) in `app/backend/db.js` (FR-031)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core calculation logic and shared backend infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T010 Extend `calcularTotales()` in `app/backend/calculo.js` to accept and compute IVA, retención en la fuente, reteIVA, reteICA, and compensación de retención per calculation contract in `contracts/api-endpoints.md`
- [X] T011 [P] Export `calcularTotales()` for frontend use: create `app/frontend/src/calculo.js` that mirrors the backend calculation logic (shared source of truth)
- [X] T012 [P] Create `app/frontend/src/composables/useAutoguardado.js` composable for dual autosave (localStorage + server debounce at 5s) per research.md R3

- [X] T078 [P] Create unit tests for `calcularTotales()` in `app/backend/tests/calculo.test.js` using `node --test`. Cases: solo IVA 19%, solo retención fuente (4%, 6%, 10%, 11%), IVA + retención combinados, reteIVA (15% sobre IVA), reteICA (porcentaje personalizado), compensación de retención activa, todos los impuestos simultáneos, líneas múltiples, valores en cero, IVA no responsable (0%). Verificar que cada resultado coincida con cálculo manual (FR-011, FR-012, SC-003)
- [X] T079 [P] Create unit tests for frontend `calculo.js` mirror in `app/frontend/tests/calculo.test.js` — mismos casos que T078, verificar que backend y frontend producen resultados idénticos para los mismos inputs (SC-003)

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 — Gestión de clientes guardados (Priority: P1) 🎯 MVP

**Goal**: Users with saved clients see a searchable list when creating a quote; selecting a client auto-fills and previews their data. New clients can be saved with logo.

**Independent Test**: Create a quote, verify empty form if no clients. Save a client with logo. Create another quote, verify client list appears with search. Select client, verify preview updates. (VS-1 in quickstart.md)

### Implementation for User Story 1

- [X] T013 [US1] Add search query param `?q=texto` to `GET /api/clientes` in `app/backend/rutas/clientes.js` (FR-001)
- [X] T014 [US1] Extend `POST /api/clientes` to accept `email`, `telefono`, `logoBase64` fields with validation (JPG/PNG, max 2 MB) and enforce storage limits (10 free / 200 premium) in `app/backend/rutas/clientes.js` (FR-003, FR-004, EC-1, EC-3)
- [X] T015 [US1] Extend `PUT /api/clientes/:id` to support updating `email`, `telefono`, `logoBase64` in `app/backend/rutas/clientes.js`
- [X] T016 [US1] Create `ClienteSelector.vue` component in `app/frontend/src/components/ClienteSelector.vue` — searchable client list with selection, preview of selected client data, and "Guardar cliente" button for new entries (FR-001, FR-002, FR-005, FR-006)
- [X] T017 [US1] Create `LogoUploader.vue` component in `app/frontend/src/components/LogoUploader.vue` — image upload (JPG/PNG, max 2 MB) with preview and base64 conversion (FR-004)
- [X] T018 [US1] Integrate `ClienteSelector.vue` into the quote creation/edit view, replacing the current manual client form. Wire reactive client selection to update preview in `app/frontend/src/vistas/` (the quote editor view) (FR-006)

**Checkpoint**: User Story 1 fully functional — client selection, search, logo upload, and preview update work independently

---

## Phase 4: User Story 2 — Distinción empresa/independiente e impuestos (Priority: P1)

**Goal**: Emitter type (persona natural/jurídica) determines available tax options. Tax calculation shows full breakdown (IVA, retención, reteIVA, reteICA) with compensation option.

**Independent Test**: Configure profile as independiente, create quote, verify tax options and calculations per VS-2, VS-3, VS-4 in quickstart.md.

### Implementation for User Story 2

- [X] T019 [US2] Add `tipo_emisor` selector ("Persona natural / Independiente" | "Persona jurídica / Empresa") to the profile section in `app/backend/rutas/perfil.js` (FR-007)
- [X] T020 [US2] Extend `POST /api/cotizaciones` and `PUT /api/cotizaciones/:id` to accept all tax fields (`ivaTarifa`, `ivaResponsable`, `retencion`, `reteiva`, `reteica`, `compensarRetencion`) and compute totals using `calcularTotales()` in `app/backend/rutas/cotizaciones.js` (FR-008 to FR-013)
- [X] T021 [US2] Extend `POST /api/cotizaciones` and `PUT /api/cotizaciones/:id` to snapshot client data (`cliente_email`, `cliente_telefono`, `cliente_logo_base64`) when saving in `app/backend/rutas/cotizaciones.js` (EC-10)
- [X] T022 [US2] Create `ConfiguracionImpuestos.vue` component in `app/frontend/src/components/ConfiguracionImpuestos.vue` — shows tax options dynamically based on emitter type: retención (4%, 6%, 10%, 11%, custom), IVA (0%/19%), reteIVA (15%), reteICA (custom), and compensation toggle (FR-009, FR-010, FR-012, EC-2)
- [X] T023 [US2] Create `DesgloseTotales.vue` component in `app/frontend/src/components/DesgloseTotales.vue` — displays subtotal, IVA, retención, reteIVA, reteICA, compensación and total neto using `calculo.js` (FR-011)
- [X] T024 [US2] Integrate `ConfiguracionImpuestos.vue` and `DesgloseTotales.vue` into the quote editor view. Wire emitter type from profile to determine default tax options in `app/frontend/src/vistas/` (FR-008, FR-013)

**Checkpoint**: User Story 2 fully functional — tax configuration and calculation work correctly for both emitter types

---

## Phase 5: User Story 3 — Catálogo de servicios reutilizables (Priority: P1)

**Goal**: Users see saved services as a list when adding services to a quote; one-click adds service with pre-filled data. Manual services can be saved to catalog.

**Independent Test**: Save services to catalog, create a quote, verify service list appears, add 5 services in < 30 seconds. (VS-5 in quickstart.md)

### Implementation for User Story 3

- [X] T025 [US3] Add `descripcion` and `cantidad_defecto` columns to catalog creation/update in `app/backend/rutas/catalogo.js` and enforce storage limits (20 free / 200 premium) (FR-014, FR-017)
- [X] T026 [US3] Create `ServicioCatalogoSelector.vue` component in `app/frontend/src/components/ServicioCatalogoSelector.vue` — catalog list with one-click add to quote, pre-fills description/quantity/price, editable per-quote without modifying catalog (FR-014, FR-015, FR-016)
- [X] T027 [US3] Add "Guardar al catálogo" button for manually entered services in the quote editor and wire to `POST /api/catalogo` in `app/frontend/src/vistas/` (FR-017)

**Checkpoint**: User Story 3 fully functional — catalog browsing, one-click add, and save-to-catalog work independently

---

## Phase 6: User Story 6 — Borrador con preview dinámico y autoguardado (Priority: P1)

**Goal**: Draft auto-saves on every change. Preview updates in real-time when client, emitter, services, or taxes change. Drafts restore exactly as left.

**Independent Test**: Create draft with all data, close tab, reopen, verify all data intact. Change client/services and verify preview updates. (VS-8 in quickstart.md)

### Implementation for User Story 6

- [X] T028 [US6] Integrate `useAutoguardado.js` composable into the quote editor view — observe all reactive fields (client, emitter, services, taxes) and trigger autosave on change in `app/frontend/src/vistas/` (FR-027)
- [X] T029 [US6] Implement draft restoration logic: compare localStorage vs server timestamps, use most recent, restore all fields exactly (client, emitter, services, quantities, prices, taxes) in `app/frontend/src/vistas/` (FR-029)
- [X] T030 [US6] Wire all data changes (client selection, emitter change, service add/edit/remove, tax config) to reactively update the preview section in the quote editor view in `app/frontend/src/vistas/` (FR-028)
- [X] T031 [US6] Add offline detection and retry logic: notify user on save failure, retry on reconnection, preserve data in localStorage (EC-9) in `app/frontend/src/composables/useAutoguardado.js`

**Checkpoint**: All P1 stories (US1, US2, US3, US6) complete — core quoting flow is fully functional as MVP

---

## Phase 7: User Story 4 — Perfil de emisor y emisores múltiples (Priority: P2)

**Goal**: Profile auto-fills "Tu información" in quotes. Premium users can create/manage multiple emitters and select one per quote.

**Independent Test**: Configure profile, create quote, verify auto-fill. As premium, create second emitter, switch between emitters in draft. (VS-6 in quickstart.md)

### Implementation for User Story 4

- [X] T032 [P] [US4] Implement `GET /api/emisores` endpoint — list all emitters for current user in `app/backend/rutas/perfil.js` (FR-018, FR-020)
- [X] T033 [P] [US4] Implement `POST /api/emisores` endpoint — create emitter (premium only, max 5) with full tax config in `app/backend/rutas/perfil.js` (FR-019)
- [X] T034 [P] [US4] Implement `PUT /api/emisores/:id` and `DELETE /api/emisores/:id` endpoints in `app/backend/rutas/perfil.js` (FR-019)
- [X] T035 [US4] Create `EmisorSelector.vue` component in `app/frontend/src/components/EmisorSelector.vue` — dropdown for premium users to pick emitter, hidden for free users. Emitter change updates preview (FR-020, FR-021, FR-022)
- [X] T036 [US4] Auto-fill "Tu información" section from primary emitter data when creating a new quote, and allow temporary per-quote edits (FR-018, US4 scenario 2) in `app/frontend/src/vistas/`
- [X] T037 [US4] Add emitter management UI (create/edit/delete) to the profile section in `app/frontend/src/vistas/` (FR-019)

**Checkpoint**: User Story 4 fully functional — emitter auto-fill, multiple emitters, and selector work

---

## Phase 8: User Story 5 — Plantillas de PDF personalizables (Priority: P2)

**Goal**: Free users get a professional standard PDF. Premium users choose from 3+ templates and customize colors.

**Independent Test**: Download PDF as free user (professional design). As premium, select templates, customize colors, verify PDF output. (VS-7 in quickstart.md)

### Implementation for User Story 5

- [X] T038 [P] [US5] Implement `GET /api/plantillas-pdf` endpoint to list available templates from `plantillas_pdf` table in `app/backend/rutas/cotizaciones.js` (FR-024)
- [X] T039 [P] [US5] Implement `PUT /api/perfil/preferencias-pdf` endpoint to save preferred template/colors in `app/backend/rutas/perfil.js` (FR-025, FR-026)
- [X] T040 [US5] Refactor `app/frontend/src/pdf.js` — extract current PDF generation as "Profesional" template function. Add full tax breakdown (subtotal, IVA, retención, reteIVA, reteICA, total neto) to PDF output. Accept color parameters (FR-023)
- [X] T041 [US5] Add "Moderna" template function (columnar layout, green tones) to `app/frontend/src/pdf.js` (FR-024)
- [X] T042 [US5] Add "Ejecutiva" template function (sober, dark tones) to `app/frontend/src/pdf.js` (FR-024)
- [X] T043 [US5] Create `PlantillaPdfSelector.vue` component in `app/frontend/src/components/PlantillaPdfSelector.vue` — template gallery for premium users, color pickers for encabezado/acento/texto, preview before download (FR-024, FR-025)
- [X] T044 [US5] Integrate template/color selection into the quote editor and wire to PDF generation and save preferences in `app/frontend/src/vistas/` (FR-026)

**Checkpoint**: User Story 5 fully functional — 3 templates, color customization, and PDF generation work

---

## Phase 9: User Story 7 — WhatsApp con PDF adjunto (Priority: P2)

**Goal**: WhatsApp button shares PDF directly as file (Web Share API). Falls back to wa.me link with temporal download URL.

**Independent Test**: Create quote, tap WhatsApp, verify PDF shared on mobile. On desktop, verify fallback with download link. (VS-9 in quickstart.md)

### Implementation for User Story 7

- [X] T045 [US7] Implement `POST /api/cotizaciones/:id/compartir` extension — generate temporal download link (UUID, public, 7-day expiry) and store in DB in `app/backend/rutas/cotizaciones.js` (FR-031)
- [X] T046 [US7] Implement `GET /api/compartir/descargar/:uuid` — public endpoint to download PDF by temporal link, check expiry in `app/backend/rutas/cotizaciones.js` or new route file (FR-031)
- [X] T047 [US7] Update WhatsApp share button in frontend to use Web Share API (`navigator.share()` with files) when supported. Detect support with `navigator.canShare`. Fallback to wa.me with download link in `app/frontend/src/vistas/` or share component (FR-030, FR-031)

**Checkpoint**: User Story 7 fully functional — WhatsApp sharing works on mobile and desktop

---

## Phase 10: User Story 8 — Textos legales unificados (Priority: P2)

**Goal**: Single unified legal document combining privacy, SARLAFT, terms, and donations. Single checkbox at registration.

**Independent Test**: Register, verify one checkbox. Open document, verify all sections. Login as existing user, verify re-acceptance prompt. (VS-11 in quickstart.md)

### Implementation for User Story 8

- [X] T048 [US8] Create unified legal document record (`tipo: terminos_unificados`, `version: 2.0.0`) with all sections in `app/backend/db.js` or appropriate seed/migration (FR-032)
- [X] T049 [US8] Implement `GET /api/auth/legal/unificado` public endpoint to serve the unified document in `app/backend/src/api/` or `app/backend/rutas/auth.js` (FR-032)
- [X] T050 [US8] Simplify registration form to single checkbox "Acepto los Términos y Condiciones" with link to unified document in `app/frontend/src/vistas/` (FR-033)
- [X] T051 [US8] Add re-acceptance prompt for existing users who haven't accepted the unified version — check on login and show acceptance dialog in `app/frontend/src/vistas/` (FR-033, scenario 3)

**Checkpoint**: User Story 8 fully functional — unified legal document and single-checkbox acceptance work

---

## Phase 11: User Story 9 — Doble autenticación 2FA (Priority: P2)

**Goal**: Users can activate TOTP-based 2FA from profile. Login requires second factor. Recovery codes available.

**Independent Test**: Activate 2FA, scan QR, verify login with TOTP code, test recovery code. (VS-10 in quickstart.md)

### Implementation for User Story 9

- [X] T052 [US9] Install `otpauth` and `qrcode` dependencies via `npm install` at project root
- [X] T053 [US9] Implement `POST /api/auth/2fa/activar` — generate TOTP secret, QR data URL, 8 recovery codes (hashed with SHA-256), store in `totp_2fa` and `codigos_recuperacion` tables in `app/backend/rutas/auth.js` (FR-034, FR-035, FR-036)
- [X] T054 [US9] Implement `POST /api/auth/2fa/verificar` — validate TOTP code, mark 2FA as active on first verification, or complete login on subsequent logins in `app/backend/rutas/auth.js` (FR-037)
- [X] T055 [US9] Implement `POST /api/auth/2fa/recuperar` — validate recovery code hash, mark as used, return remaining count in `app/backend/rutas/auth.js` (FR-037)
- [X] T056 [US9] Implement `DELETE /api/auth/2fa` — deactivate 2FA, clear secret and recovery codes in `app/backend/rutas/auth.js`
- [X] T057 [US9] Add 2FA check to login flow — after credential verification, if `totp_activo = 1`, require second factor before issuing session in `app/backend/rutas/auth.js` or `app/backend/auth.js` (FR-037)
- [X] T058 [US9] Create `Configuracion2FA.vue` component in `app/frontend/src/components/Configuracion2FA.vue` — activation flow (QR display, code verification, recovery codes display), deactivation button (FR-034, FR-035, FR-036)
- [X] T059 [US9] Create 2FA verification step in login flow — show code input after credentials if 2FA is active, with option to use recovery code in `app/frontend/src/vistas/` (FR-037)

**Checkpoint**: User Story 9 fully functional — 2FA activation, login verification, and recovery work

---

## Phase 12: User Story 12 — Seguridad web y validación de datos (Priority: P2)

**Goal**: All inputs validated and sanitized. No OWASP Top 10 vulnerabilities. Data integrity guaranteed.

**Independent Test**: Attempt XSS injection, verify sanitization. Verify HTTPS. Check security headers. (VS-16 in quickstart.md)

### Implementation for User Story 12

- [X] T060 [P] [US12] Audit and add input sanitization to all new endpoints (clientes, emisores, cotizaciones, 2FA) — escape HTML, validate types, reject malformed data in `app/backend/rutas/` (FR-043)
- [X] T061 [P] [US12] Add security headers middleware (CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security) in `app/backend/server.js` (FR-042)
- [X] T062 [US12] Verify data integrity: add validation that saved and retrieved data matches for clientes, cotizaciones, emisores across all CRUD operations in `app/backend/rutas/` (FR-044)

**Checkpoint**: User Story 12 fully functional — security hardened across all endpoints

---

## Phase 13: User Story 13 — Actualización de planes (Priority: P2)

**Goal**: Plan comparison table updated to include new premium features (multiple emitters, PDF templates).

**Independent Test**: View plans section, verify all new features listed with correct free/premium differentiation. (VS-14 in quickstart.md)

### Implementation for User Story 13

- [X] T063 [US13] Update plan comparison data/component to include: emisores múltiples (solo premium), plantillas PDF personalizables (solo premium), PDF estándar profesional (gratuita), gestión de clientes con logo (ambas, con límites), catálogo de servicios (ambas, con límites), impuestos configurables (ambas). Highlight multiple emitters visually in `app/frontend/src/vistas/` or `app/frontend/src/components/` (FR-050, FR-051)

**Checkpoint**: User Story 13 fully functional — plan table reflects all new features

---

## Phase 14: User Story 10 — SEO, metadatos, Core Web Vitals y favicon (Priority: P3)

**Goal**: Landing page with SEO intro text, complete meta tags, favicon, and green Core Web Vitals.

**Independent Test**: Open landing page, verify intro text, inspect meta tags, check favicon, run Lighthouse. (VS-12 in quickstart.md)

### Implementation for User Story 10

- [X] T064 [P] [US10] Add SEO intro text in Spanish (Colombia) to the landing page HTML — describe PresupuestosPro, benefits, target audience. Include keywords: cotización, presupuesto, freelancer, Colombia, profesional in `app/frontend/index.html` (FR-038, SC-012)
- [X] T065 [P] [US10] Add complete meta tags to `app/frontend/index.html` — `<title>`, `<meta name="description">`, Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`), canonical URL (FR-039)
- [X] T066 [P] [US10] Add favicon files to `app/frontend/public/` and reference in `app/frontend/index.html` (FR-041)
- [X] T067 [US10] Optimize Vite build for Core Web Vitals: configure code splitting by route, lazy load non-critical views, minimize render-blocking JS in `vite.config.js` (FR-040)

**Checkpoint**: User Story 10 fully functional — SEO, meta tags, favicon, and performance optimized

---

## Phase 15: User Story 11 — Eliminación de cotizaciones y diseño profesional (Priority: P3)

**Goal**: Delete button on each quote in list with confirmation dialog. Minimalist checkbox styling across platform.

**Independent Test**: Delete a quote from list with confirmation. Verify checkbox styling. (VS-13 in quickstart.md)

### Implementation for User Story 11

- [X] T068 [US11] Implement `DELETE /api/cotizaciones/:id` endpoint — owner-only deletion, permanent in `app/backend/rutas/cotizaciones.js` (FR-046, FR-047)
- [X] T069 [US11] Add delete button to each quote in "Mis cotizaciones" list with confirmation dialog in `app/frontend/src/vistas/` (FR-046, FR-047)
- [X] T070 [P] [US11] Restyle all checkboxes across the platform to be small, minimalist, and visually coherent in `app/frontend/src/estilos.css` (FR-048)

**Checkpoint**: User Story 11 fully functional — quote deletion and design consistency work

---

## Phase 16: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T071 [P] Verify all new endpoints return proper error messages in Spanish (Colombia) across `app/backend/rutas/`
- [X] T072 [P] Ensure premium feature gating is consistent: emisores múltiples, plantillas PDF, and higher storage limits all check subscription status correctly across `app/backend/rutas/`
- [X] T073 Ensure downgrade from premium to free: emisores additional become read-only, only primary emitter usable for new quotes (EC-7) in `app/backend/rutas/perfil.js` and `app/frontend/src/vistas/`
- [X] T074 Verify client snapshot preservation: when a client is deleted, existing quotes retain snapshot data (EC-10) in `app/backend/rutas/clientes.js`
- [X] T075 [P] Review overall UI consistency and professional design across all new components and views in `app/frontend/src/` (FR-049)
- [X] T076 Run quickstart.md validation scenarios (VS-1 through VS-16) manually to verify all features end-to-end
- [X] T077 [P] Verify HTTPS configuration at deployment level on Hostinger — certificado SSL válido, redirección HTTP→HTTPS, encabezado Strict-Transport-Security (FR-045). Nota: es configuración de infraestructura, no de código

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–15)**: All depend on Foundational phase completion
  - P1 stories (US1, US2, US3, US6) can proceed in parallel after Phase 2
  - P2 stories depend on Phase 2; US4 and US5 can start after Phase 2 independently
  - P3 stories (US10, US11) have no dependencies on other user stories
- **Polish (Phase 16)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1** (Clientes): Can start after Phase 2 — no dependencies on other stories
- **US2** (Impuestos): Can start after Phase 2 — uses `calculo.js` from Phase 2
- **US3** (Catálogo servicios): Can start after Phase 2 — no dependencies on other stories
- **US6** (Borrador/preview): Best implemented after US1, US2, US3 (integrates their components), but autoguardado composable is independent
- **US4** (Emisores múltiples): Can start after Phase 2 — independent but enhances US2's tax config
- **US5** (Plantillas PDF): Can start after Phase 2 — uses tax breakdown from US2's `calculo.js`
- **US7** (WhatsApp): Can start after Phase 2 — uses PDF from US5 but can work with default template
- **US8** (Textos legales): Fully independent after Phase 2
- **US9** (2FA): Fully independent after Phase 2
- **US10** (SEO): Fully independent — can be done at any time
- **US11** (Eliminación): Fully independent after Phase 2
- **US12** (Seguridad): Best done after all endpoints are implemented
- **US13** (Planes): Can be done at any time — frontend only

### Within Each User Story

- Models/schema before services/routes
- Backend endpoints before frontend components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (T001–T009) can run sequentially as they modify the same file (`db.js`)
- Foundational tasks T011 and T012 are parallel (different files)
- P1 stories US1, US2, US3 can run in parallel after Phase 2 (different files and components)
- US4 tasks T032, T033, T034 are parallel backend endpoints
- US5 tasks T038, T039 are parallel backend endpoints
- US10 tasks T064, T065, T066 are parallel (different files)
- US12 tasks T060, T061 are parallel (different files)

---

## Parallel Example: User Story 1

```bash
# After Phase 2, launch backend endpoints in parallel:
Task T013: "Search query param on GET /api/clientes in app/backend/rutas/clientes.js"
Task T014: "Extend POST /api/clientes with logo, email, telefono in app/backend/rutas/clientes.js"

# Then launch frontend components in parallel:
Task T016: "ClienteSelector.vue in app/frontend/src/components/"
Task T017: "LogoUploader.vue in app/frontend/src/components/"

# Finally integrate:
Task T018: "Integrate into quote editor view"
```

---

## Parallel Example: User Story 2

```bash
# Backend first:
Task T019: "tipo_emisor in perfil endpoint"
Task T020: "Extend cotizaciones endpoints with all tax fields"

# Then frontend in parallel:
Task T022: "ConfiguracionImpuestos.vue"
Task T023: "DesgloseTotales.vue"

# Finally integrate:
Task T024: "Integrate into quote editor"
```

---

## Implementation Strategy

### MVP First (P1 User Stories Only)

1. Complete Phase 1: Setup (schema migrations)
2. Complete Phase 2: Foundational (calculo.js, autoguardado composable)
3. Complete Phase 3: US1 — Gestión de clientes guardados
4. Complete Phase 4: US2 — Impuestos
5. Complete Phase 5: US3 — Catálogo de servicios
6. Complete Phase 6: US6 — Borrador con preview dinámico
7. **STOP and VALIDATE**: Run VS-1 through VS-5, VS-8 from quickstart.md
8. Deploy/demo if ready — core quoting flow is complete

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 + US3 + US6 → MVP (core quoting) → Validate and deploy
3. Add US4 (Emisores) + US5 (Plantillas PDF) → Premium features → Validate
4. Add US7 (WhatsApp) + US8 (Legal) + US9 (2FA) → Communication & security → Validate
5. Add US12 (Seguridad) + US13 (Planes) → Hardening & marketing → Validate
6. Add US10 (SEO) + US11 (Eliminación) → Polish → Final validation (all VS scenarios)
7. Phase 16: Polish → Full quickstart.md walkthrough

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Clientes) + US3 (Catálogo)
   - Developer B: US2 (Impuestos) + US6 (Borrador/Preview)
3. After P1 complete:
   - Developer A: US4 (Emisores) + US5 (Plantillas)
   - Developer B: US9 (2FA) + US7 (WhatsApp)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Constitution compliance: all tasks map to explicit FR/EC requirements — no scope creep
