# Feature Specification: Sistema de Monetización — Publicidad y Donaciones

**Feature Branch**: `004-monetizacion-ads-donaciones`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "plantea un sistema de monetización con publicidad de google y poner botones para donaciones"

> **Relación con spec-003**: Esta feature reemplaza y amplía los requisitos de monetización definidos en `specs/003-plataforma-cotizaciones/spec.md` (FR-023 a FR-027). Los requisitos de publicidad se detallan aquí con mayor profundidad y se añade un canal de ingresos por donaciones voluntarias. Los requisitos de monetización de spec-003 quedan supersedidos por esta spec.

## Clarifications

### Session 2026-10-05

- Q: ¿Las "donaciones" voluntarias generan obligación tributaria en Colombia (retención, documento al donante)? → A: Son ingresos gravados para la plataforma que se declaran en renta, pero no se emite documento individual al donante (contribución voluntaria sin contraprestación).
- Q: ¿El profesional debe recibir un correo electrónico de confirmación después de una donación exitosa? → A: Sí, enviar email de confirmación con fecha, monto y referencia de transacción.
- Q: ¿Debe existir un límite diario de donaciones por usuario para prevenir fraude con tarjetas robadas? → A: Máximo 3 donaciones y 200.000 COP acumulados por usuario por día.
- Q: ¿La plataforma necesita un aviso de cookies/consentimiento de privacidad para Google AdSense, conforme a la Ley 1581 de 2012? → A: Sí, banner de consentimiento de cookies obligatorio al primer acceso, con opción de aceptar o rechazar cookies de publicidad.
- Q: ¿La plataforma permite reembolsos de donaciones? → A: No reembolsable — aviso claro visible antes de confirmar la donación.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publicidad no intrusiva con Google AdSense (Priority: P1)

Como propietario de la plataforma, quiero mostrar anuncios de Google AdSense en ubicaciones designadas de la interfaz web, para generar ingresos recurrentes que sostengan el servicio gratuito sin degradar la experiencia del profesional.

**Why this priority**: Los anuncios son la fuente principal de ingresos de la plataforma. Sin publicidad, el modelo de negocio gratuito no es sostenible. Es el canal de monetización más escalable porque genera ingresos proporcionales al tráfico sin intervención manual.

**Independent Test**: Se puede probar verificando que los espacios publicitarios se muestran en las pantallas designadas, que los anuncios de AdSense cargan correctamente, que no interfieren con la creación de cotizaciones, y que la funcionalidad sigue operando cuando los anuncios no cargan.

**Acceptance Scenarios**:

1. **Given** un profesional autenticado navegando por la plataforma, **When** visita las pantallas principales (lista de cotizaciones, editor de cotización, catálogo de servicios, perfil), **Then** se muestran espacios publicitarios de AdSense en ubicaciones predefinidas que no cubren controles interactivos ni interfieren con el flujo de trabajo.
2. **Given** un profesional editando una cotización en un celular (360px de ancho), **When** interactúa con los campos del formulario, **Then** ningún anuncio se superpone a los controles de edición ni dificulta la interacción táctil.
3. **Given** un profesional con un bloqueador de publicidad activo, **When** navega por la plataforma, **Then** la funcionalidad completa de cotización sigue operando normalmente sin degradación, errores visibles ni bloqueo de acceso.
4. **Given** la plataforma generando un PDF de cotización, **When** el profesional descarga el documento, **Then** el PDF no contiene ningún anuncio ni referencia publicitaria.

---

### User Story 2 - Botón de donaciones voluntarias (Priority: P2)

Como profesional que valora la plataforma gratuita, quiero poder hacer una donación voluntaria para apoyar su desarrollo, mediante un botón visible pero no intrusivo que me permita contribuir con el monto que yo elija.

**Why this priority**: Las donaciones son un canal de ingresos complementario que demuestra valor percibido por los usuarios y genera ingresos directos sin intermediación publicitaria. Su prioridad es menor que AdSense porque requiere una acción deliberada del usuario y no escala automáticamente con el tráfico.

**Independent Test**: Se puede probar localizando el botón de donación en la interfaz, haciendo clic, eligiendo un monto, completando el pago a través de la pasarela, y verificando que la donación se registra y se muestra un agradecimiento.

**Acceptance Scenarios**:

1. **Given** un profesional autenticado, **When** busca cómo apoyar la plataforma, **Then** encuentra un botón de donación claramente visible en el menú lateral o en la sección de perfil/configuración, sin que interrumpa su flujo de trabajo.
2. **Given** un profesional que hace clic en el botón de donación, **When** se abre la pantalla de donación, **Then** puede elegir un monto predefinido (5.000, 10.000, 20.000, 50.000 COP) o ingresar un monto personalizado (mínimo 2.000 COP).
3. **Given** un profesional que seleccionó un monto, **When** confirma la donación, **Then** es redirigido a una pasarela de pago donde puede completar el pago con los medios disponibles en Colombia.
4. **Given** un profesional que completó una donación exitosa, **When** regresa a la plataforma, **Then** ve un mensaje de agradecimiento y la donación queda registrada en su historial.
5. **Given** un profesional que intenta donar pero el pago falla o es cancelado, **When** regresa a la plataforma, **Then** no se registra ningún cargo y puede intentar de nuevo si lo desea.

---

### User Story 3 - Espacios de pauta directa contratada (Priority: P3)

Como propietario de la plataforma, quiero ofrecer espacios de publicidad directa a anunciantes que contraten, mostrando su contenido publicitario en ubicaciones premium, para generar ingresos mayores que AdSense por impresión en esos espacios.

**Why this priority**: La pauta directa genera mayor ingreso por impresión que AdSense, pero requiere gestión comercial externa y una base de usuarios establecida. Se construye sobre la infraestructura de espacios publicitarios ya existente.

**Independent Test**: Se puede probar configurando un espacio de pauta directa con contenido de prueba, verificando que se muestra correctamente en la ubicación designada, y que cuando no hay anunciante contratado el espacio muestra AdSense como relleno o permanece oculto.

**Acceptance Scenarios**:

1. **Given** un espacio de pauta directa con contenido de un anunciante configurado, **When** un profesional visita la página donde está el espacio, **Then** el contenido del anunciante se muestra en la ubicación designada.
2. **Given** un espacio de pauta directa sin anunciante contratado, **When** un profesional visita la página, **Then** el espacio muestra publicidad de AdSense como relleno o permanece oculto sin afectar el diseño.
3. **Given** múltiples espacios publicitarios en una misma pantalla, **When** un profesional los ve desde un celular, **Then** ningún espacio excede el 25 % del área visible de la pantalla ni empuja el contenido principal fuera del primer scroll.

---

### Edge Cases

- EC1. Si Google AdSense no carga (bloqueador, error de red, cuenta suspendida), todos los espacios publicitarios permanecen ocultos o vacíos sin afectar la funcionalidad ni el diseño de la plataforma.
- EC2. Si un profesional intenta donar un monto inferior al mínimo (2.000 COP), el sistema muestra un aviso indicando el monto mínimo permitido.
- EC3. Si la pasarela de pago de donaciones está fuera de servicio, el botón de donación sigue visible pero al hacer clic muestra un mensaje indicando que el servicio está temporalmente no disponible y que intente más tarde.
- EC4. Si un profesional completa una donación pero la confirmación de la pasarela tarda más de lo esperado, la plataforma no registra la donación como exitosa hasta recibir confirmación definitiva; no cobra dos veces.
- EC5. La publicidad nunca aparece dentro del PDF descargable de la cotización.
- EC6. Si el profesional dona desde un celular, la pantalla de donación y la pasarela de pago son completamente funcionales en resolución de 360px.

## Requirements *(mandatory)*

### Functional Requirements

**Publicidad — Google AdSense**

- **FR-001**: La plataforma MUST incluir espacios publicitarios de Google AdSense en las pantallas principales: lista de cotizaciones, editor de cotización, catálogo de servicios, gestión de clientes y perfil profesional.
- **FR-002**: Los espacios publicitarios MUST ubicarse en zonas que no cubran ni interfieran con controles interactivos (botones, campos de formulario, menús), especialmente en pantallas móviles (360px de ancho).
- **FR-003**: Los anuncios MUST NOT ocupar más del 25 % del área visible de la pantalla en dispositivos móviles.
- **FR-004**: Si un anuncio no carga (bloqueador, error de red), el espacio MUST ocultarse o colapsar sin dejar huecos visuales ni afectar la funcionalidad de la plataforma.
- **FR-005**: La publicidad MUST NOT mostrarse dentro de los PDFs descargables de cotización.

**Publicidad — Pauta directa**

- **FR-006**: La plataforma MUST incluir al menos dos espacios de pauta directa en ubicaciones premium (banner superior o lateral en pantallas de escritorio, entre contenido en pantallas móviles).
- **FR-007**: Cuando un espacio de pauta directa no tiene anunciante contratado, MUST mostrar publicidad de AdSense como relleno o permanecer oculto sin afectar el diseño.
- **FR-008**: El contenido de pauta directa MUST poder configurarse sin necesidad de desplegar una nueva versión de la plataforma; basta con actualizar la configuración del espacio (imagen/enlace del anunciante).

**Donaciones voluntarias**

- **FR-009**: La plataforma MUST mostrar un botón de donación visible y accesible desde el menú lateral o la sección de configuración/perfil, disponible para todos los profesionales autenticados.
- **FR-010**: Al hacer clic en el botón de donación, el sistema MUST mostrar una pantalla con montos predefinidos (5.000, 10.000, 20.000, 50.000 COP) y la opción de ingresar un monto personalizado (mínimo 2.000 COP, máximo 500.000 COP). La pantalla MUST incluir un aviso visible de que las donaciones no son reembolsables antes del botón de confirmar.
- **FR-011**: El sistema MUST redirigir al profesional a una pasarela de pago colombiana para completar la donación. La pasarela MUST soportar al menos tarjetas de crédito/débito y transferencia bancaria (PSE).
- **FR-012**: Tras una donación exitosa (confirmada por la pasarela), el sistema MUST mostrar un mensaje de agradecimiento en pantalla, registrar la donación en el historial del profesional, y enviar un correo electrónico de confirmación al donante con la fecha, el monto y la referencia de transacción.
- **FR-013**: Si el pago falla o es cancelado por el profesional, el sistema MUST NOT registrar ningún cargo y MUST permitir intentar de nuevo.
- **FR-014**: El historial de donaciones del profesional MUST ser visible en su perfil, mostrando fecha, monto y estado (exitosa/fallida) de cada intento.
- **FR-015**: El sistema MUST limitar las donaciones a un máximo de 3 donaciones en estado `pendiente` o `exitosa` por usuario por día natural (zona horaria America/Bogota) y un acumulado máximo de 200.000 COP en donaciones `pendiente` o `exitosa` por usuario por día natural (misma zona horaria). Si el usuario alcanza cualquiera de los dos límites, el sistema MUST mostrar un mensaje informando que podrá donar nuevamente al día siguiente.
- **FR-016**: El botón de donación MUST NOT ser intrusivo: no se muestran pop-ups, banners emergentes ni recordatorios recurrentes solicitando donaciones. El profesional dona solo cuando él lo decide.
- **FR-017**: La pantalla de donación y la pasarela de pago MUST ser completamente funcionales en dispositivos móviles (360px de ancho) con áreas táctiles de al menos 44px.

**Protección y coherencia**

- **FR-018**: Los espacios publicitarios MUST cargarse de forma asíncrona para no bloquear ni retrasar la carga del contenido principal de la plataforma.
- **FR-019**: Todos los textos relacionados con publicidad y donaciones (botones, mensajes, confirmaciones, historial) MUST estar en español de Colombia, usando la terminología del glosario de la plataforma.

**Consentimiento de cookies y privacidad**

- **FR-020**: La plataforma MUST mostrar un banner de consentimiento de cookies al primer acceso del usuario, informando sobre el uso de cookies de publicidad (Google AdSense) conforme a la Ley 1581 de 2012 de Protección de Datos Personales.
- **FR-021**: El banner MUST ofrecer al usuario la opción de aceptar o rechazar las cookies de publicidad. Si el usuario rechaza, los espacios de AdSense MUST NO cargarse; los espacios de pauta directa (que no usan cookies de terceros) pueden seguir mostrándose.
- **FR-022**: La preferencia de cookies del usuario MUST persistir entre sesiones. El usuario MUST poder cambiar su preferencia en cualquier momento desde la configuración de privacidad.

### Key Entities *(include if feature involves data)*

- **Espacio publicitario**: Ubicación en la interfaz (banner superior, lateral, entre contenido), tipo (AdSense o pauta directa), estado (activo/inactivo), contenido del anunciante (imagen y enlace, si es pauta directa). Configurable sin redespliegue.
- **Donación**: Profesional donante, fecha, monto (COP enteros), estado (pendiente, exitosa, fallida, cancelada), referencia de transacción de la pasarela de pago.
- **Historial de donaciones**: Registro por profesional con todas sus donaciones, visible en el perfil.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los espacios publicitarios de AdSense se muestran correctamente en las 5 pantallas principales sin cubrir ni desplazar controles interactivos, verificado en pantallas de 360px de ancho y de escritorio.
- **SC-002**: Un profesional con bloqueador de publicidad activo puede crear una cotización completa (seleccionar cliente, añadir líneas, descargar PDF) sin ningún error ni degradación funcional.
- **SC-003**: Un profesional puede completar una donación (desde hacer clic en el botón hasta recibir el agradecimiento) en menos de 3 minutos.
- **SC-004**: El 100 % de las donaciones exitosas confirmadas por la pasarela se reflejan en el historial del profesional sin intervención manual.
- **SC-005**: Los PDFs descargados de cotización no contienen ningún elemento publicitario ni referencia a donaciones.
- **SC-006**: La carga de publicidad no añade más de 2 segundos al tiempo de visualización del contenido principal de cualquier pantalla.
- **SC-007**: Los espacios de pauta directa pueden actualizarse (cambiar imagen/enlace del anunciante) sin necesidad de desplegar una nueva versión de la plataforma.

## Assumptions

- Esta spec reemplaza y amplía los requisitos de monetización de spec-003 (FR-023 a FR-027). Los requisitos aquí definidos son la referencia definitiva para la implementación de publicidad y donaciones.
- La plataforma sigue siendo gratuita para todos los usuarios. Los ingresos provienen de publicidad (AdSense y pauta directa) y donaciones voluntarias. No hay plan premium ni suscripciones.
- Las donaciones son voluntarias y a favor de la plataforma (no entre usuarios). No se solicitan recurrentemente ni se condiciona funcionalidad a donar.
- Los montos de donación se manejan exclusivamente en pesos colombianos (COP).
- La pasarela de pago para donaciones debe soportar métodos de pago comunes en Colombia (tarjetas crédito/débito, PSE). La selección específica de la pasarela es una decisión de implementación.
- La gestión comercial de anunciantes de pauta directa (contratos, facturación al anunciante, rotación de creatividades) se maneja fuera de la plataforma. La app solo muestra el contenido configurado.
- La configuración de los espacios de pauta directa (imagen, enlace) se actualiza mediante configuración administrativa, sin necesidad de nuevo despliegue.
- Las donaciones son contribuciones voluntarias sin contraprestación, no compras de bienes o servicios. Constituyen ingreso gravado para la plataforma (se declaran en renta), pero no se emite factura electrónica, documento equivalente DIAN ni recibo individual al donante. Si la normativa cambia, se actualizará en una versión futura.
- Se respeta el principio I de la constitution (simplicidad): no se implementa un panel de administración de anuncios sofisticado ni analíticas de publicidad propias; se confía en el panel de Google AdSense para métricas de publicidad.
- Se respeta el principio V de la constitution (datos con respeto): no se recolectan datos adicionales del profesional para personalizar publicidad más allá de lo que Google AdSense haga por su cuenta. Las donaciones solo registran monto, fecha y resultado.
