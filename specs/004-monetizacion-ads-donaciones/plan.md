# Implementation Plan: Sistema de Monetización — Publicidad y Donaciones

**Branch**: `004-monetizacion-ads-donaciones` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-monetizacion-ads-donaciones/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

> **Relación con spec-003**: Esta feature reemplaza y amplía los requisitos de monetización definidos en `specs/003-plataforma-cotizaciones/spec.md` (FR-023 a FR-027). Los requisitos de publicidad se detallan aquí con mayor profundidad y se añade un canal de ingresos por donaciones voluntarias.

## Summary

Este plan implementa tres canales de monetización para PresupuestosPro: (1) espacios publicitarios de Google AdSense integrados en la SPA Vue 3 existente, con carga asíncrona y manejo graceful de bloqueadores; (2) espacios de pauta directa configurables sin redespliegue, con fallback a AdSense; (3) un sistema de donaciones voluntarias con pasarela de pago colombiana (tarjetas, PSE), historial del profesional, email de confirmación y límites antifraude. Se incluye un banner de consentimiento de cookies conforme a la Ley 1581 de 2012 que condiciona la carga de AdSense. Todos los canales se integran sobre la arquitectura existente Node.js + Express + SQLite (backend) y Vue 3 + Vite (frontend), sin añadir servicios externos más allá de la pasarela de pago y un servicio de email transaccional.

## Technical Context

**Language/Version**: JavaScript (Node.js LTS) en el backend; JavaScript (ES2022) con Vue 3 (Composition API) y Vite en el frontend. Sin cambio respecto a spec-002.

**Primary Dependencies**:
- Backend existente: Express, better-sqlite3, jsPDF (frontend)
- Nuevas para esta feature:
  - **Wompi** (pasarela de pago colombiana — API REST directa, sin SDK wrapper; tarjetas, PSE, Nequi)
  - **Resend** (email transaccional — 1 paquete npm, 1 env var, tier gratuito 3k/mes)
  - **Google AdSense SDK** (script de carga dinámica del lado del cliente, condicionado al consentimiento de cookies)

**Storage**: Fichero SQLite existente (`datos/presupuestospro.sqlite`). Se añaden tablas para donaciones, espacios publicitarios y preferencias de cookies. Sin cambio de motor de almacenamiento.

**Testing**: `node --test` para:
1. Rutas de API de donaciones (crear, listar historial, validar límites diarios) con SQLite en memoria.
2. Lógica de límites antifraude (3 donaciones/día, 200.000 COP/día).
3. Verificación manual en el navegador para: espacios publicitarios, cookie consent, flujo de donación, responsividad móvil.

**Target Platform**: Navegador web móvil (360px) y escritorio como cliente; servidor Node.js con disco persistente (Render/Fly.io).

**Project Type**: Aplicación web cliente-servidor (mismo que spec-002).

**Performance Goals**: La carga de publicidad no añade más de 2 segundos al tiempo de visualización del contenido principal (SC-006). La API de donaciones responde en menos de 200ms.

**Constraints**:
- Publicidad nunca en PDFs descargables (FR-005).
- Espacios publicitarios máximo 25% del área visible en móvil (FR-003).
- Áreas táctiles de donación mínimo 44px (FR-017).
- Sin pop-ups ni recordatorios de donación (FR-016).
- Secretos de pasarela y email en variables de entorno, nunca en código (Principio V).

**Scale/Scope**: Plataforma para profesionales independientes colombianos. Volumen bajo de donaciones (decenas al día como máximo). Tráfico publicitario proporcional a usuarios activos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|-----------|-----------|--------|
| **I. Simplicidad ante todo** | No se implementa panel de administración de anuncios propio; se usa el panel de Google AdSense para métricas. La pauta directa se configura con datos estáticos (imagen/enlace) sin CMS. Las donaciones usan una pasarela externa sin construir procesamiento de pagos propio. Email transaccional con servicio externo, sin sistema de templates sofisticado. | ✅ PASA |
| **II. Idioma y mercado** | Todos los textos (botón de donación, confirmación, historial, cookie consent, mensajes de error) en español de Colombia. Montos solo en COP. Pasarela de pago colombiana con PSE y tarjetas locales. | ✅ PASA |
| **III. Cero alcance fantasma** | Solo se implementa lo que la spec pide: AdSense, pauta directa, donaciones, cookie consent. No se añade: analíticas propias de publicidad, programa de fidelidad de donantes, donaciones recurrentes, panel de anunciantes. La gestión comercial de anunciantes queda fuera de la plataforma (spec, Assumptions). | ✅ PASA |
| **IV. Verificable por persona no técnica** | SC-001 a SC-007 son todos verificables manualmente: ver anuncios en pantalla, crear cotización con bloqueador, completar donación, verificar historial, descargar PDF sin ads, medir tiempo de carga, actualizar config de pauta directa. | ✅ PASA |
| **V. Datos con respeto** | No se recolectan datos adicionales para personalizar publicidad. Las donaciones registran solo monto, fecha y resultado (spec, Assumptions). Secretos de pasarela y email en variables de entorno. Cookie consent explícito antes de cargar AdSense. | ✅ PASA |

**Resultado del gate**: ✅ TODOS LOS PRINCIPIOS PASAN. Proceder a Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/004-monetizacion-ads-donaciones/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/           # Modelos SQLite existentes + nuevos (donacion, espacio_publicitario, cookie_consent)
│   ├── services/         # Lógica de negocio: donaciones (límites, validación), email
│   ├── api/              # Rutas Express existentes + nuevas (/donaciones, /ads-config, /cookie-consent)
│   └── config/           # Configuración de pauta directa (JSON/env vars)
└── tests/
    ├── unit/             # Límites antifraude, validación de montos
    └── integration/      # Rutas de donación con SQLite en memoria

frontend/
├── src/
│   ├── components/
│   │   ├── ads/          # AdSlot.vue (AdSense), DirectAdSlot.vue (pauta directa)
│   │   ├── donations/    # DonationButton.vue, DonationForm.vue, DonationHistory.vue
│   │   └── privacy/      # CookieConsent.vue
│   ├── composables/      # useCookieConsent.js, useDonation.js
│   ├── pages/            # Pantallas existentes con slots publicitarios integrados
│   └── services/         # API client para donaciones y cookie consent
└── tests/
```

**Structure Decision**: Se mantiene la estructura frontend/backend existente de spec-002. Los nuevos componentes se organizan en subdirectorios temáticos (`ads/`, `donations/`, `privacy/`) dentro de `components/`. La configuración de pauta directa vive en el backend como JSON configurable por variables de entorno o fichero de configuración, sin necesidad de redespliegue (FR-008).

## Complexity Tracking

> No hay violaciones de la Constitution que justificar. No se añade esta tabla.

## Constitution Re-Check (Post-Design)

*Re-evaluación tras completar Phase 0 (research) y Phase 1 (design).*

| Principio | Evaluación Post-Design | Estado |
|-----------|----------------------|--------|
| **I. Simplicidad** | Wompi con API REST directa (sin wrapper); Resend con 1 paquete; AdSense carga dinámica sin librería; cookie consent propio sin framework de terceros; pauta directa como fichero JSON, sin CMS ni panel admin. Todas las decisiones de research eligieron la opción más simple. | ✅ PASA |
| **II. Idioma y mercado** | Todos los mensajes de error, confirmación y UI definidos en español de Colombia en los contratos. Montos solo en COP. Pasarela colombiana (Wompi/Bancolombia) con PSE y métodos locales. | ✅ PASA |
| **III. Cero alcance fantasma** | El diseño no añade nada fuera de la spec: no hay dashboard de analíticas, programa de donantes, donaciones recurrentes ni panel de gestión de anunciantes. Cada artefacto de diseño traza directamente a requisitos FR-001 a FR-022. | ✅ PASA |
| **IV. Verificable** | Los 10 escenarios del quickstart son ejecutables por una persona no técnica haciendo clics en la plataforma. | ✅ PASA |
| **V. Datos con respeto** | Las donaciones registran solo monto, fecha y resultado. No se recolectan datos adicionales para publicidad. Cookie consent explícito. Secretos (WOMPI_PRIVATE_KEY, WOMPI_INTEGRITY_SECRET, RESEND_API_KEY, ADSENSE_CLIENT_ID) en variables de entorno. | ✅ PASA |

**Resultado**: ✅ Diseño alineado con la constitution. Sin violaciones. Listo para `/speckit-tasks`.
