# Tasks: Sistema de Monetización — Publicidad y Donaciones

**Input**: Design documents from `/specs/004-monetizacion-ads-donaciones/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included per plan.md testing requirements (`node --test` for donation API routes and anti-fraud limits).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`
- Paths based on plan.md project structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, new directories, dependencies, and configuration files.

- [X] T001 Create directory structure: `backend/src/services/`, `backend/src/config/`, `backend/tests/unit/`, `backend/tests/integration/`, `frontend/src/components/ads/`, `frontend/src/components/donations/`, `frontend/src/components/privacy/`, `frontend/src/composables/`, `frontend/src/services/`
- [X] T002 [P] Install backend dependency `resend` in backend/package.json
- [X] T003 [P] Create `.env.example` with WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY, WOMPI_INTEGRITY_SECRET, RESEND_API_KEY, ADSENSE_CLIENT_ID at repository root
- [X] T004 [P] Create initial ads-config.json with AdSense spaces for 5 main pages in backend/src/config/ads-config.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 [P] Create ads config loader that reads backend/src/config/ads-config.json and GET /api/config/ads route returning spaces and adsense_client_id in backend/src/api/ads-config.js (contract: contracts/api-ads-config.md)
- [X] T006 [P] Create SQLite migration for `donacion` table with indexes (idx_donacion_profesional_fecha, idx_donacion_referencia) and Donacion model in backend/src/models/donacion.js (schema per data-model.md)
- [X] T007 [P] Create AdSense dynamic loader utility `loadAdSense(publisherId)` that injects script tag conditioned on consent in frontend/src/services/adsense-loader.js

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Publicidad no intrusiva con Google AdSense (Priority: P1) 🎯 MVP

**Goal**: Show Google AdSense ads in designated UI locations with cookie consent, async loading, and graceful degradation for ad blockers.

**Independent Test**: Verify ad spaces appear on 5 main screens, AdSense loads when consent is granted, ads collapse silently with ad blockers active, and no ads appear in PDFs. Full platform functionality works regardless of ad load state.

### Implementation for User Story 1

- [X] T008 [US1] Create useCookieConsent.js composable managing localStorage keys (cookie_consent_ads, cookie_consent_date) with reactive state and consent-changed events in frontend/src/composables/useCookieConsent.js (contract: contracts/api-cookie-consent.md)
- [X] T009 [P] [US1] Create CookieConsent.vue banner component with accept/reject buttons and Ley 1581 text in frontend/src/components/privacy/CookieConsent.vue (depends on T008)
- [X] T010 [P] [US1] Create AdSlot.vue component with adClient/adSlot props, inject cookieConsent, try/catch adsbygoogle.push, collapse CSS (`:empty`, `[data-ad-status="unfilled"]`), and `:key="route.fullPath"` remount in frontend/src/components/ads/AdSlot.vue (depends on T007, T008)
- [X] T011 [US1] Integrate CookieConsent.vue into App.vue and provide cookie consent state via `provide('cookieConsent', ref)` in frontend/src/App.vue (depends on T008, T009)
- [X] T012 [US1] Integrate AdSlot.vue into 5 main pages: lista-cotizaciones, editor-cotizacion, catálogo-servicios, gestión-clientes, perfil in frontend/src/pages/ (depends on T010, T011; positions per ads-config.json: superior/lateral in desktop, entre-contenido in mobile)
- [X] T013 [US1] Add privacy settings section for changing cookie preference (reset localStorage and reload page) in frontend/src/pages/ profile or configuración page (depends on T008)

**Checkpoint**: AdSense ads display on all 5 screens, collapse with blockers, cookie consent gates loading. User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 — Botón de donaciones voluntarias (Priority: P2)

**Goal**: Enable voluntary donations with Colombian payment gateway (Wompi), anti-fraud limits, confirmation email, and donation history.

**Independent Test**: Click donation button, select amount, complete payment via Wompi sandbox, verify thank-you message, check donation in history, verify confirmation email received. Test anti-fraud limits by attempting 4th donation in same day.

### Tests for User Story 2 ⚠️

> **NOTE: Tests per plan.md — `node --test` for donation API and anti-fraud limits.**

- [X] T014 [P] [US2] Create unit tests for anti-fraud limits (3 donations pendiente+exitosa/day, 200.000 COP/day accumulation, timezone America/Bogota boundary cases, rapid pending creation race scenario) in backend/tests/unit/donacion-limites.test.js
- [X] T015 [P] [US2] Create integration tests for donation API routes (POST create, GET list, webhook processing) with SQLite in-memory in backend/tests/integration/donaciones-api.test.js

### Implementation for User Story 2

- [X] T016 [P] [US2] Create DonacionService with anti-fraud limit validation (count and sum queries filtering `pendiente` + `exitosa` states, timezone America/Bogota for daily reset), state transitions, and donation creation logic in backend/src/services/donacion-service.js (depends on T006)
- [X] T017 [P] [US2] Create EmailService for donation confirmation using Resend (subject, body in Spanish with date/amount/reference per research.md) in backend/src/services/email-service.js
- [X] T018 [US2] Create donation API routes: POST /api/donaciones (validate monto, check limits, create Wompi transaction with redirect_url for post-payment return, return checkout_url) and GET /api/donaciones (paginated history) in backend/src/api/donaciones.js (contract: contracts/api-donaciones.md; depends on T016, T017)
- [X] T019 [US2] Create Wompi webhook handler: POST /api/donaciones/webhook (validate signature with WOMPI_INTEGRITY_SECRET, update donation state, trigger email on APPROVED, idempotent) in backend/src/api/donaciones-webhook.js (contract: contracts/api-donaciones.md; depends on T016, T017)
- [X] T020 [P] [US2] Create useDonation.js composable with API client for donation creation, history fetching, and error handling in frontend/src/composables/useDonation.js
- [X] T021 [P] [US2] Create DonationButton.vue non-intrusive button component (no pop-ups, no reminders per FR-016, 44px touch target per FR-017) in frontend/src/components/donations/DonationButton.vue
- [X] T022 [US2] Create DonationForm.vue with preset amounts (5.000, 10.000, 20.000, 50.000 COP), custom amount input (min 2.000, max 500.000 COP), non-refundable notice, Wompi checkout redirect, return-from-payment handling (show thank-you on success, error on failure per US2 scenarios 4/5), and gateway-unavailable error state with user-friendly message (EC3) in frontend/src/components/donations/DonationForm.vue (depends on T020)
- [X] T023 [US2] Create DonationHistory.vue component displaying date, monto, estado per donation in frontend/src/components/donations/DonationHistory.vue (depends on T020)
- [X] T024 [US2] Integrate DonationButton into sidebar menu or profile/configuración section in frontend/src/pages/ (depends on T021, T022)
- [X] T025 [US2] Integrate DonationHistory into profile page in frontend/src/pages/ (depends on T023)

**Checkpoint**: Full donation flow works end-to-end — create, pay via Wompi sandbox, receive email confirmation, view history. Anti-fraud limits enforce. Tests pass with `node --test`.

---

## Phase 5: User Story 3 — Espacios de pauta directa contratada (Priority: P3)

**Goal**: Show direct advertiser content in premium positions with fallback to AdSense or hidden when no advertiser is contracted.

**Independent Test**: Configure a direct ad space in ads-config.json with test content, verify it displays correctly. Remove advertiser content, verify AdSense fallback or hidden state. Update ads-config.json and restart server to verify no redeploy needed (SC-007).

### Implementation for User Story 3

- [X] T026 [P] [US3] Create DirectAdSlot.vue component that fetches config from GET /api/config/ads, shows advertiser image/link when available, falls back to AdSlot.vue (AdSense) or hides based on `fallback` field in frontend/src/components/ads/DirectAdSlot.vue (depends on T005, T010)
- [X] T027 [P] [US3] Configure ads-config.json with at least 2 pauta_directa spaces in premium positions (banner-superior, entre-contenido) with sample advertiser content and fallback settings in backend/src/config/ads-config.json
- [X] T028 [US3] Integrate DirectAdSlot in premium ad positions replacing or wrapping existing AdSlot placements in frontend/src/pages/ (depends on T026, T027)

**Checkpoint**: Direct ads show when configured, fall back to AdSense or hide when not. Config updates without redeploy. All user stories now independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, performance, mobile responsiveness, and end-to-end scenario testing.

- [ ] T029 [P] Validate async ad loading does not add >2s to content display time (SC-006) using browser DevTools Network tab
- [ ] T030 [P] Validate mobile responsiveness at 360px: ads ≤25% viewport (FR-003), donation form functional (FR-017), 44px touch targets
- [ ] T031 [P] Verify PDF generation contains no ad elements, donation references, or banners (SC-005, FR-005)
- [ ] T032 Run quickstart.md scenarios 1–10 for end-to-end validation of all user stories

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — No dependencies on US1 or US3; independent donation flow
- **User Story 3 (P3)**: Can start after Phase 2, but depends on US1's AdSlot.vue (T010) for fallback rendering. Recommend completing US1 first.

### Within Each User Story

- Models before services
- Services before API routes
- Composables before Vue components that use them
- Components before page integration
- Core implementation before cross-cutting validation

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003, T004)
- All Foundational tasks marked [P] can run in parallel (T005, T006, T007)
- Once Foundational completes: US1 and US2 can start in parallel
- Within US1: T009 and T010 can run in parallel (after T008)
- Within US2: T014, T015, T016, T017, T020, T021 can run in parallel (backend and frontend independence)
- Within US3: T026 and T027 can run in parallel
- Polish tasks T029, T030, T031 can run in parallel

---

## Parallel Example: User Story 2

```bash
# After Foundational (Phase 2) completes:

# Backend parallelism:
Task T016: "DonacionService with anti-fraud limits in backend/src/services/donacion-service.js"
Task T017: "EmailService for donation confirmation in backend/src/services/email-service.js"

# Frontend parallelism (independent of backend):
Task T020: "useDonation.js composable in frontend/src/composables/useDonation.js"
Task T021: "DonationButton.vue in frontend/src/components/donations/DonationButton.vue"

# Tests (can run in parallel with each other):
Task T014: "Unit tests for anti-fraud limits in backend/tests/unit/donacion-limites.test.js"
Task T015: "Integration tests for donation API in backend/tests/integration/donaciones-api.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T007)
3. Complete Phase 3: User Story 1 — AdSense + Cookie Consent (T008–T013)
4. **STOP and VALIDATE**: Run quickstart scenarios 1, 2, 7 → ads display, blockers degrade gracefully, consent works
5. Deploy/demo if ready — platform generates ad revenue

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP — ads generating revenue!)
3. Add User Story 2 → Test independently → Deploy/Demo (donations active)
4. Add User Story 3 → Test independently → Deploy/Demo (premium ad spaces available)
5. Each story adds a revenue channel without breaking previous ones

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (AdSense + Cookie Consent)
   - Developer B: User Story 2 (Donations backend + frontend)
3. Once US1 is done:
   - Developer A: User Story 3 (Direct Ads — needs US1's AdSlot.vue)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Environment variables (WOMPI_*, RESEND_API_KEY, ADSENSE_CLIENT_ID) must be set before testing US1 and US2
- Use Wompi sandbox keys for development and testing
- All UI text must be in Spanish (Colombia) per Constitution Principle II
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Notas de implementación (estado actual)

- **Pendiente de verificación manual**: T029–T032 (tiempos de carga, responsividad a 360 px, PDF sin publicidad, escenarios de quickstart). Requieren navegador y credenciales reales de Wompi, Resend y AdSense; no se han ejecutado todavía.
- **Rutas reales del proyecto**: el código existente vive en `backend/` plano (`rutas/`, `db.js`, `calculo.js`) y en `frontend/src/vistas/`. Donde las tareas dicen `backend/src/…` y `frontend/src/pages/…`, se respetó la ruta de la tarea para los ficheros nuevos de monetización, y las vistas se integraron en `frontend/src/vistas/`.
- **Pauta directa**: los dos espacios `pauta_directa` están configurados sin anunciante (`anunciante: null`), así que muestran el relleno de AdSense o se ocultan. No se publican anunciantes de ejemplo. Para contratar un espacio, rellena `anunciante` en `backend/src/config/ads-config.json`.
- **Unidades de AdSense**: el campo `adsense_slot` de cada espacio `adsense` está en `null`; el anuncio no se renderiza hasta que se pegue el identificador real de la unidad.
- **Webhook de Wompi**: la firma usa `WOMPI_INTEGRITY_SECRET`, tal como indica `contracts/api-donaciones.md`. Wompi firma sus eventos con el *events secret* de la cuenta; si la cuenta usa uno distinto, hay que cambiar la variable que lee `firmaValida`.
- **Referencia de pago**: la donación se localiza por `transaction.reference` (la referencia generada al crear la donación), porque el enlace de checkout se abre antes de que exista un id de transacción.
