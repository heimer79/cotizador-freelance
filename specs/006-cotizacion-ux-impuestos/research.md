# Research: Cotización UX, Impuestos y Mejoras Generales

**Feature**: 006-cotizacion-ux-impuestos | **Date**: 2026-10-08

## R1. Impuestos colombianos para independientes y empresas

**Decision**: Implementar cálculo de 4 tipos de impuesto/retención: IVA, retención en la fuente, retención de IVA (reteIVA) y retención de ICA (reteICA), con porcentajes configurables por perfil de emisor.

**Rationale**: El Estatuto Tributario colombiano establece que cuando un independiente (persona natural) presta servicios a una empresa (persona jurídica agente retenedor), la empresa practica retención en la fuente. Los porcentajes dependen del concepto: honorarios (10%-11%), servicios (4%-6%), compras (2.5%-3.5%). El IVA es 19% para responsables. La reteIVA es 15% sobre el IVA facturado. El ICA varía por municipio (ej. Bogotá: 4.14‰ a 13.8‰ para servicios).

**Alternatives considered**:
- Cálculo automático basado en municipio → Rechazado: requiere base de datos de tarifas por municipio que se desactualiza, violando Principio I (simplicidad). Mejor dejar el porcentaje configurable por el usuario.
- Solo retención en la fuente sin reteIVA/reteICA → Rechazado: la spec FR-011 exige desglose completo.

**Impact on existing code**: El módulo `calculo.js` actual solo maneja IVA y retención en la fuente. Se debe ampliar para incluir reteIVA y reteICA. La tabla `cotizaciones` necesita columnas nuevas para los 4 impuestos. El PDF (`pdf.js`) necesita mostrar el desglose completo.

## R2. Modelo de emisores múltiples (premium)

**Decision**: Crear una tabla `emisores` separada de `perfil`. El perfil existente se migra como el "emisor principal" del usuario. Los usuarios premium pueden tener hasta 5 emisores, cada uno con su propia configuración de impuestos.

**Rationale**: La tabla `perfil` actual es 1:1 con el usuario (PK = usuario_id). Los emisores múltiples requieren una relación 1:N. Cada emisor necesita tipo (natural/jurídica) y configuración fiscal independiente (FR-013, FR-019).

**Alternatives considered**:
- Ampliar `perfil` con campos JSON para emisores adicionales → Rechazado: dificulta las consultas y la integridad referencial.
- Tabla pivot usuario-emisor → Innecesario: la relación es directa 1:N (un emisor pertenece a un solo usuario).

**Migration strategy**: Al aplicar el schema migration, se crea el emisor principal para cada usuario existente copiando datos de `perfil`. La columna `emisor_id` se agrega a `cotizaciones` con referencia al emisor usado.

## R3. Autoguardado del borrador

**Decision**: Autoguardado dual: localStorage como buffer inmediato (tolerante a desconexión) + sincronización con el servidor vía API cada 5 segundos de inactividad (debounce).

**Rationale**: FR-027 exige autoguardado. FR-029 exige restauración exacta. EC-9 especifica que ante pérdida de conexión se preserva en el navegador. El patrón debounce evita llamadas excesivas al servidor.

**Alternatives considered**:
- Solo localStorage → Rechazado: no sobrevive cambio de dispositivo ni limpieza de caché.
- Solo servidor → Rechazado: EC-9 requiere persistencia offline.
- WebSocket para sync en tiempo real → Rechazado: Principio I (simplicidad), overkill para un solo usuario editando su borrador.

**Implementation**: Composable `useAutoguardado.js` que observa cambios reactivos del borrador, guarda en localStorage inmediatamente, y hace PUT al servidor tras debounce. Al cargar, compara timestamps de localStorage vs servidor y usa el más reciente.

## R4. Web Share API para PDF en WhatsApp

**Decision**: Usar `navigator.share()` con `files` para compartir el PDF como archivo. Fallback a enlace `wa.me` con URL de descarga temporal.

**Rationale**: FR-030 pide compartir el PDF directamente. Web Share API Level 2 soporta archivos en Chrome Android 76+, Safari iOS 15+. En escritorio/navegadores sin soporte, se usa el fallback existente mejorado (FR-031).

**Alternatives considered**:
- WhatsApp Business API → Rechazado: requiere cuenta business verificada, costos por mensaje, complejidad excesiva (Principio I).
- Generar enlace y copiar al portapapeles → No cumple FR-030 que pide adjuntar el PDF.

**Detection**: `navigator.canShare && navigator.canShare({ files: [new File([], 'test.pdf')] })`. Si es `false`, se cae al fallback con enlace temporal.

## R5. 2FA con TOTP y correo

**Decision**: Implementar TOTP (RFC 6238) como método principal de 2FA, con fallback a código por correo electrónico usando el servicio de email existente.

**Rationale**: FR-035 requiere al menos un método: correo o app de autenticación. TOTP es el estándar para "app de autenticación" (Google Authenticator, Authy). El correo ya funciona con el email service existente.

**Alternatives considered**:
- Solo correo → Cumple FR-035 pero es menos seguro y depende de la entrega de email.
- WebAuthn/passkeys → Rechazado: Principio I, complejidad excesiva para v1.
- SMS → Rechazado: requiere proveedor de SMS, costos recurrentes.

**Dependencies**: Se necesita la librería `otpauth` (o implementación manual de HOTP/TOTP sobre crypto). Para QR, `qrcode` genera la imagen del URI `otpauth://`. Los códigos de recuperación son tokens aleatorios hasheados con scrypt (mismo patrón de auth.js).

**Storage**: Tabla `totp_2fa` con secreto cifrado, `activo` flag. Tabla `codigos_recuperacion` con hash de cada código y flag `usado`.

## R6. Plantillas de PDF personalizables (premium)

**Decision**: Definir las plantillas como funciones JavaScript en `pdf.js` que reciben los datos de la cotización y la configuración de colores, y producen el PDF con jsPDF.

**Rationale**: FR-024 requiere al menos 3 plantillas. jsPDF ya se usa en el frontend. Las plantillas son variaciones de layout/colores, no archivos externos.

**Alternatives considered**:
- HTML-to-PDF con puppeteer en servidor → Rechazado: requiere headless browser en Hostinger (no viable), viola Principio I.
- Plantillas como archivos PDF rellenables → Rechazado: jsPDF no soporta llenado de formularios PDF.
- Paquete externo como pdfmake → Rechazado: ya se usa jsPDF, añadir otra lib de PDF no aporta valor.

**Implementation**: 3 plantillas iniciales: "Profesional" (actual, mejorada), "Moderna" (layout columnar, colores de acento), "Ejecutiva" (sobria, tonos oscuros). Los colores personalizables (encabezado, acento, texto) se pasan como parámetro. Los usuarios gratuitos usan "Profesional" con colores fijos.

## R7. SEO y Core Web Vitals

**Decision**: Texto introductorio estático en el HTML de la landing, meta tags en el `<head>`, favicon como archivos estáticos.

**Rationale**: FR-038/039/041 son requisitos de contenido estático. FR-040 (Core Web Vitals) se logra optimizando el bundle Vite (code splitting, lazy loading de vistas), compresión de assets, y minimizando JavaScript bloqueante.

**Alternatives considered**:
- SSR con Nuxt → Rechazado: Principio I, cambio arquitectónico mayor para algo que se resuelve con contenido estático en el HTML servido por Express.
- Pre-rendering con vite-plugin-ssr → Rechazado: complejidad innecesaria si el SEO solo aplica a la landing.

**Implementation**: Modificar `index.html` para incluir meta tags y contenido visible antes de que Vue monte. Agregar favicon en `public/`. Configurar Vite para code splitting por ruta.

## R8. Unificación de textos legales

**Decision**: Crear un nuevo documento legal unificado de tipo `terminos_unificados` que combina las secciones de privacidad, SARLAFT, términos de uso y donaciones. Mantener los documentos individuales existentes como históricos.

**Rationale**: FR-032 pide un solo documento. FR-033 pide un solo checkbox. Los documentos individuales ya están en la tabla `documentos_legales`. Se agrega uno nuevo tipo `terminos_unificados` con versión `2.0.0`. Los usuarios existentes deben re-aceptar (FR-033 acceptance scenario 3).

**Alternatives considered**:
- Eliminar documentos individuales → Rechazado: rompe historial de aceptaciones existentes.
- Combinar en frontend sin cambio en BD → Rechazado: la aceptación debe registrarse contra un documento específico en `aceptaciones_legales`.

## R9. Compensación de retención en precio

**Decision**: Implementar como un toggle por cotización que aplica un factor de ajuste al precio unitario de cada servicio. El factor es `1 / (1 - retencion%)`, de modo que el neto después de retención iguale el precio original.

**Rationale**: FR-012 pide que sea transparente y muestre desglose (precio original + compensación). La fórmula estándar para "grossing up" un pago neto es: precio_bruto = precio_neto / (1 - tasa_retencion).

**Implementation**: Se calcula y muestra como dos líneas en el desglose: "Precio base" y "Compensación retención (+X%)", con el total ajustado. El cálculo se hace en `calculo.js` para consistencia backend/frontend.
