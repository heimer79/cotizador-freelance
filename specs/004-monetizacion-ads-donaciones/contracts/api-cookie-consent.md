# API Contract: Consentimiento de Cookies

El consentimiento de cookies se maneja **enteramente en el lado del cliente** (localStorage del navegador). No existe un endpoint de API para esta funcionalidad.

## Contrato del lado del cliente

### localStorage Keys

| Clave | Tipo | Valores | Descripción |
|-------|------|---------|-------------|
| `cookie_consent_ads` | string | `"true"` \| `"false"` | Preferencia del usuario sobre cookies de publicidad |
| `cookie_consent_date` | string | ISO 8601 | Fecha del último consentimiento |

### Comportamiento del componente `CookieConsent.vue`

| Estado de localStorage | Acción |
|-----------------------|--------|
| `cookie_consent_ads` no existe | Mostrar banner de consentimiento |
| `cookie_consent_ads === "true"` | Cargar AdSense dinámicamente; no mostrar banner |
| `cookie_consent_ads === "false"` | NO cargar AdSense; no mostrar banner; la pauta directa SÍ se muestra |

### Eventos

| Evento | Disparador | Efecto |
|--------|-----------|--------|
| `consent-changed(true)` | Usuario acepta cookies | Guardar en localStorage, cargar script de AdSense, propagar estado reactivo |
| `consent-changed(false)` | Usuario rechaza cookies | Guardar en localStorage, NO cargar AdSense, propagar estado reactivo |
| Cambio desde Configuración > Privacidad | Usuario cambia preferencia | Actualizar localStorage, recargar la página para aplicar el cambio |

### Integración con componentes de publicidad

El estado de consentimiento se provee mediante `provide('cookieConsent', ref)` desde `App.vue`. Los componentes `AdSlot.vue` lo consumen con `inject('cookieConsent')` y solo renderizan el anuncio de AdSense si el valor es `true`.

La pauta directa (`DirectAdSlot.vue`) NO depende del consentimiento de cookies porque no usa cookies de terceros — solo muestra una imagen estática y un enlace.
