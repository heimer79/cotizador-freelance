# Implementation Plan: Roles, Cuentas Premium y Marco Legal

**Branch**: `005-roles-cuentas-legal` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-roles-cuentas-legal/spec.md`

## Summary

Ampliar PresupuestosPro con un sistema de roles (usuario normal / administrador), tipos de cuenta (gratuita / premium $20 USD/año), autenticación social (Google y Facebook), panel de administración, textos legales colombianos obligatorios, compartir cotizaciones por WhatsApp con enlace temporal de PDF, y atribución de Digital Pyme Solutions. La plataforma mantiene su stack actual (Express + better-sqlite3 + Vue 3 + Vite) y se extiende sin cambios de diseño visual.

## Technical Context

**Language/Version**: Node.js 18+ (CommonJS en backend, ESM en frontend)

**Primary Dependencies**:
- Backend: Express 4.19, better-sqlite3 11.x, Resend (correo transaccional actual)
- Frontend: Vue 3.4, Vite 5.4, jsPDF 2.5
- Nuevas: passport + passport-google-oauth20 + passport-facebook (auth social), googleapis (Gmail API), mercadopago SDK o Checkout Pro redirect

**Storage**: SQLite (better-sqlite3) — fichero local `app/backend/datos/presupuestospro.sqlite`

**Testing**: Node.js built-in test runner (`node --test`)

**Target Platform**: Servidor Linux (Hostinger VPS), navegadores modernos (Chrome, Firefox, Safari, Edge)

**Project Type**: Web application (SPA Vue 3 + API Express)

**Performance Goals**: Respuesta API < 500ms, carga de SPA < 3s en 3G

**Constraints**: SQLite single-file (sin servidor de BD separado), sin WebSocket (polling o SSE para notificaciones admin), sin framework CSS externo (estilos propios)

**Scale/Scope**: < 1000 usuarios en v1, ~15 pantallas/vistas, 1 instancia de servidor

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | ¿Se cumple? | Justificación |
|-----------|-------------|---------------|
| I. Simplicidad ante todo | ✅ SÍ | Se extiende el stack existente (Express, SQLite, Vue) sin introducir frameworks nuevos ni abstracciones innecesarias. Passport.js es la librería estándar mínima para OAuth. MercadoPago Checkout Pro usa redirect (sin SDK pesado). No se diseña para multi-tenant ni escala futura. |
| II. Idioma y mercado | ⚠️ DESVIACIÓN JUSTIFICADA | Toda la UI y textos legales siguen en español de Colombia. **Desviación**: el precio de la suscripción premium se muestra en USD ($20 USD/año) además de la equivalencia aproximada en COP, porque la spec lo requiere explícitamente (FR-025). No se hacen cálculos en USD; la conversión la maneja la pasarela de pago. |
| III. Cero alcance fantasma | ✅ SÍ | Todas las funcionalidades están listadas explícitamente en la spec (FR-001 a FR-056). No se añade nada fuera de spec. |
| IV. Verificable por persona no técnica | ✅ SÍ | Cada criterio de éxito (SC-001 a SC-011) se verifica usando la aplicación: hacer clic, rellenar formularios, verificar visualmente. |
| V. Datos del usuario con respeto | ✅ SÍ | Solo se recopilan datos imprescindibles. Credenciales OAuth, claves API y secretos van en variables de entorno o en tabla de configuración encriptada, nunca en código. El administrador no accede a cotizaciones ni datos de clientes (FR-007). |

**Desviación registrada**: Principio II — Precio en USD requerido por spec FR-025 y FR-019. No contradice el principio: la moneda de la aplicación sigue siendo COP; el precio USD es informativo junto con equivalencia COP.

## Project Structure

### Documentation (this feature)

```text
specs/005-roles-cuentas-legal/
├── plan.md              # Este archivo
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── backend/
│   ├── auth.js                  # (existente) Extender con OAuth social y roles
│   ├── db.js                    # (existente) Extender schema con nuevas tablas
│   ├── server.js                # (existente) Registrar nuevas rutas
│   ├── rutas/
│   │   ├── auth.js              # (existente) Extender con endpoints OAuth
│   │   ├── clientes.js          # (existente) Sin cambios
│   │   ├── catalogo.js          # (existente) Sin cambios
│   │   ├── cotizaciones.js      # (existente) Extender con compartir WhatsApp / enlace temporal
│   │   └── perfil.js            # (existente) Extender con historial de actividad
│   └── src/
│       ├── api/
│       │   ├── admin.js              # (nuevo) Rutas del panel de administración
│       │   ├── suscripcion.js        # (nuevo) Rutas de suscripción premium
│       │   ├── legal.js              # (nuevo) Rutas de documentos legales
│       │   └── compartir.js          # (nuevo) Rutas de enlaces temporales PDF
│       ├── models/
│       │   ├── donacion.js           # (existente) Sin cambios
│       │   ├── suscripcion.js        # (nuevo) Modelo de suscripciones
│       │   ├── documento-legal.js    # (nuevo) Modelo de documentos legales
│       │   ├── notificacion.js       # (nuevo) Modelo de notificaciones admin
│       │   └── enlace-temporal.js    # (nuevo) Modelo de enlaces temporales PDF
│       └── services/
│           ├── email-service.js      # (existente) Extender con correos de suscripción
│           ├── donacion-service.js   # (existente) Sin cambios
│           └── gmail-service.js      # (nuevo) Servicio Gmail API alternativo
├── frontend/
│   └── src/
│       ├── App.vue               # (existente) Extender con nuevas vistas y lógica de roles
│       ├── vistas/
│       │   ├── AdminView.vue          # (nuevo) Panel de administración
│       │   ├── PlanesView.vue         # (nuevo) Cuadro comparativo de cuentas
│       │   ├── LegalView.vue          # (nuevo) Vista de documentos legales
│       │   └── AuthView.vue           # (existente) Sin cambios
│       ├── components/
│       │   ├── LoginModal.vue         # (existente) Extender con botones OAuth + aceptación de términos
│       │   ├── NavBar.vue             # (existente) Extender con ítems de admin y planes
│       │   ├── admin/                 # (nuevo) Componentes del panel admin
│       │   ├── legal/                 # (nuevo) Componentes de textos legales
│       │   └── premium/              # (nuevo) Componentes de cuadro comparativo y suscripción
│       └── composables/
│           ├── useAuth.js             # (nuevo) Lógica de autenticación social
│           └── useSuscripcion.js      # (nuevo) Estado de suscripción

tests/
├── api.test.js               # (existente)
├── calculo.test.js           # (existente)
├── auth-social.test.js       # (nuevo)
├── suscripcion.test.js       # (nuevo)
├── admin.test.js             # (nuevo)
└── legal.test.js             # (nuevo)
```

**Structure Decision**: Se mantiene la estructura existente `app/backend` + `app/frontend` con separación por capas (rutas → modelos → servicios). Las nuevas funcionalidades se añaden como módulos paralelos dentro de `src/` para el backend y como nuevas vistas/componentes en el frontend. No se introduce un nuevo directorio raíz ni se reorganiza la estructura existente.

## Complexity Tracking

| Desviación | Por qué se necesita | Alternativa más simple rechazada porque |
|-----------|---------------------|----------------------------------------|
| Precio en USD (Principio II) | FR-019 y FR-025 lo exigen explícitamente | Mostrar solo COP no cumple la spec |
| Passport.js como dependencia nueva | OAuth social requiere flujos estándar OpenID/OAuth2 | Implementar OAuth desde cero es más complejo y propenso a errores de seguridad |
| Gmail API como servicio alternativo de correo | FR-038 requiere que el admin configure Gmail API | Resend ya existe pero la spec pide Gmail API configurable por admin |
