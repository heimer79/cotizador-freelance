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
| V. Datos con respeto | PASA | 2FA guarda el secreto TOTP cifrado con clave del servidor, no en texto plano. Logos en base64 como ya existe. |
