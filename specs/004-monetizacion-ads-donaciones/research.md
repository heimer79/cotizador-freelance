# Research: Sistema de Monetización — Publicidad y Donaciones

**Feature**: 004-monetizacion-ads-donaciones | **Date**: 2026-10-05

## 1. Pasarela de pago para donaciones en Colombia

### Decisión: Wompi (por Bancolombia)

**Rationale**: Wompi ofrece la mejor combinación de simplicidad de integración, cobertura de métodos de pago colombianos y respaldo institucional (Bancolombia). Su API REST es limpia y bien documentada, con sandbox disponible inmediatamente. Soporta pagos únicos (sin necesidad de suscripción), lo cual encaja con el modelo de donaciones voluntarias.

**Alternativas consideradas**:

| Pasarela | Pros | Contras | Veredicto |
|----------|------|---------|-----------|
| **Wompi** | Tarjetas, PSE, Nequi; API REST limpia; sandbox inmediato; Bancolombia backing | SDK Node.js no oficial (wrapper comunitario `@pulgueta/wompi`); fees negociables (no públicos) | ✅ Elegida |
| **ePayco** | SDK Node.js oficial; 22+ métodos de pago (Daviplata, Efecty, Baloto); buena cobertura cash | Docs menos pulidos; onboarding más lento | Alternativa viable |
| **MercadoPago** | Mejor SDK Node.js oficial; buena documentación | Sin Nequi/Daviplata; PSE reciente | Descartada |
| **PayU Latam** | Fees más transparentes; cobertura amplia | Sin SDK Node.js oficial; onboarding empresarial pesado | Descartada |

**Método de integración elegido**: API REST directa de Wompi (sin SDK wrapper). Se construyen las llamadas HTTP desde el backend Express, manteniendo el control y evitando dependencia de un wrapper comunitario. Las credenciales (llaves pública y privada) van en variables de entorno.

**Flujo de pago**:
1. Frontend envía monto y datos al backend (`POST /api/donaciones`)
2. Backend valida límites (3/día, 200k COP/día), crea registro `pendiente` en SQLite
3. Backend crea transacción en Wompi y devuelve URL de checkout/widget al frontend
4. Profesional completa pago en widget de Wompi (tarjeta, PSE o Nequi)
5. Wompi envía webhook al backend con resultado definitivo
6. Backend actualiza estado de la donación y envía email de confirmación si es exitosa

## 2. Integración de Google AdSense en Vue 3 SPA

### Decisión: Carga dinámica del script condicionada al consentimiento de cookies

**Rationale**: En una SPA, el script de AdSense no debe cargarse en `index.html` de forma estática. Se carga dinámicamente solo cuando el usuario acepta cookies de publicidad, cumpliendo FR-021 y la Ley 1581.

**Patrones de implementación**:

- **Carga del script**: Función `loadAdSense(publisherId)` que inyecta el `<script>` en el `<head>` solo si no existe ya y si el consentimiento fue otorgado.
- **Componente reutilizable `AdSlot.vue`**: Recibe `adClient` y `adSlot` como props; usa `inject('cookieConsent')` para decidir si renderizar; envuelve `adsbygoogle.push({})` en try/catch para colapsar silenciosamente ante bloqueadores.
- **Remount en cambio de ruta**: Usar `:key="route.fullPath"` en los componentes de anuncio para forzar remount al navegar en la SPA. Google prohíbe refrescar anuncios en la misma página más de cada 30 segundos; el remount por cambio de ruta es compliant.
- **Responsive**: `data-ad-format="auto"` + `data-full-width-responsive="true"` para que AdSense ajuste al ancho disponible. En móvil (360px), los anuncios van entre secciones de contenido; en desktop, banner superior (728×90) y rectángulo lateral (300×250).
- **CSS de colapso**: `.ad-slot:empty, .ad-slot[data-ad-status="unfilled"] { display: none; }` para que los espacios vacíos no dejen huecos (FR-004).

**Exclusión de PDFs**: El frontend genera PDFs con jsPDF a partir de datos, no del DOM. Los anuncios nunca se incluyen en la generación de PDF porque los datos de la cotización no contienen elementos publicitarios.

### Decisión: Pauta directa como componente separado con fallback

**Rationale**: `DirectAdSlot.vue` consulta la configuración de pauta directa cargada del backend (`GET /api/config/ads`). Si hay anunciante activo para ese espacio, muestra imagen/enlace; si no, renderiza un `AdSlot.vue` como fallback (o se oculta si el fallback es 'oculto'). FR-007 y FR-008 cubiertos.

**Configuración sin redespliegue (FR-008)**: La configuración de pauta directa vive en un fichero JSON (`ads-config.json`) en el directorio de configuración del backend. El servidor lo lee al arrancar y expone un endpoint `GET /api/config/ads`. Para actualizar, se modifica el fichero JSON y se reinicia el servidor (o se implementa un endpoint de recarga hot). No requiere nuevo build ni deploy del frontend.

## 3. Consentimiento de cookies (Ley 1581 de 2012)

### Decisión: Banner propio en Vue, preferencia en localStorage

**Rationale**: No se necesita una librería de terceros para un banner simple. Un componente `CookieConsent.vue` muestra el banner al primer acceso, permite aceptar o rechazar, y persiste la preferencia en `localStorage`. Es la opción más simple que cumple FR-020 a FR-022.

**Comportamiento**:
- Sin preferencia guardada → mostrar banner con texto explicativo y dos botones (Aceptar / Rechazar)
- Aceptar → guardar `cookie_consent_ads=true` en localStorage, cargar AdSense dinámicamente
- Rechazar → guardar `cookie_consent_ads=false`, NO cargar AdSense. La pauta directa sí se muestra (no usa cookies de terceros)
- Cambio posterior → accesible desde Configuración > Privacidad, resetea la clave y recarga la página

**Texto del banner**: "Usamos cookies de publicidad (Google AdSense) para sostener este servicio gratuito. Puede aceptar o rechazar conforme a la Ley 1581 de 2012 de Protección de Datos Personales."

## 4. Email transaccional para confirmación de donaciones

### Decisión: Resend (API HTTP)

**Rationale**: Resend es el servicio más simple para enviar emails transaccionales desde Node.js: un paquete (`resend`), una variable de entorno (`RESEND_API_KEY`), una llamada de función. El tier gratuito cubre 3.000 emails/mes, más que suficiente para el volumen esperado de donaciones.

**Alternativas consideradas**:

| Opción | Pros | Contras | Veredicto |
|--------|------|---------|-----------|
| **Resend** | 1 paquete, 1 env var; tier gratuito 3k/mes; delivery tracking | Servicio relativamente nuevo | ✅ Elegida |
| **Nodemailer + Gmail** | Sin costo | Límites estrictos; bloqueos por "actividad sospechosa"; requiere App Password | Descartada |
| **SendGrid** | Robusto, establecido | SDK más pesado; dashboard complejo; overkill | Descartada |
| **AWS SES** | Barato a escala | Requiere cuenta AWS, IAM, verificación de dominio; viola Principio I | Descartada |

**Contenido del email de confirmación** (FR-012):
- Asunto: "Confirmación de tu donación a PresupuestosPro"
- Cuerpo: agradecimiento, fecha, monto (en COP), referencia de transacción
- Remitente: `no-reply@[dominio-de-la-plataforma]`
- Idioma: español de Colombia

## 5. Manejo de bloqueadores de publicidad

### Decisión: Degradación silenciosa

**Rationale**: La spec exige (FR-004, EC1, SC-002) que la plataforma funcione completamente con bloqueadores activos. No se detecta ni se pide desactivar el bloqueador.

**Implementación**:
- `try/catch` alrededor de cada `adsbygoogle.push({})`
- CSS para colapsar espacios vacíos sin dejar huecos visuales
- Ningún mensaje, modal ni degradación funcional

## 6. Límites antifraude de donaciones

### Decisión: Validación en backend con consulta a SQLite

**Rationale**: Los límites (FR-015) se validan en el backend antes de crear la transacción en Wompi. Se consulta la tabla `donacion` para contar donaciones exitosas del profesional en el día natural actual y sumar montos acumulados.

**Queries**:
```sql
-- Contar donaciones exitosas del día
SELECT COUNT(*) FROM donacion
WHERE profesional_id = ? AND estado = 'exitosa'
  AND DATE(fecha_creacion) = DATE('now');

-- Sumar montos del día
SELECT COALESCE(SUM(monto), 0) FROM donacion
WHERE profesional_id = ? AND estado = 'exitosa'
  AND DATE(fecha_creacion) = DATE('now');
```

Si cualquier límite se excede, se retorna error 429 con mensaje en español indicando que podrá donar nuevamente al día siguiente.
