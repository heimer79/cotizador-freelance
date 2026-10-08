# Feature Specification: Cotización UX, Impuestos y Mejoras Generales

**Feature Branch**: `006-cotizacion-ux-impuestos`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Mejoras integrales al flujo de cotización: gestión de clientes guardados con logo, catálogo de servicios reutilizables, distinción empresa/independiente con impuestos configurables (retención en la fuente, IVA, ICA), selección de emisor múltiple (premium), plantillas de PDF personalizables (premium), texto introductorio SEO, meta datos, Core Web Vitals, doble autenticación, validación de datos en base de datos, WhatsApp con PDF adjunto, borrador con preview dinámico, unificación de textos legales, favicon, eliminación de cotizaciones, diseño profesional y actualización de planes."

> **Relación con specs anteriores**: Esta feature amplía la plataforma definida en spec-003, spec-004 y spec-005. Se conservan los roles (usuario/admin), tipos de cuenta (gratuita/premium), medios de monetización y marco legal ya definidos. Se mejora el flujo principal de cotización con gestión de clientes, servicios, impuestos colombianos y funcionalidades premium adicionales.

## Clarifications

### Session 2026-10-08

- Q: ¿Qué estados puede tener una cotización después de ser creada como borrador — se puede editar después de compartirla o descargarla como PDF? → A: Siempre editable. Compartir o descargar el PDF no cambia el estado ni bloquea la cotización; el usuario puede modificar y volver a compartir.
- Q: Para usuarios premium con múltiples emisores de distintos tipos (persona natural y persona jurídica), ¿la configuración de impuestos es por emisor o por usuario? → A: Por emisor. Cada perfil de emisor almacena su propia configuración de IVA, retención en la fuente, retención de IVA e ICA de forma independiente.
- Q: ¿Qué desglose de impuestos ve el cliente en el PDF de la cotización? → A: Desglose completo. El PDF muestra subtotal, IVA, retención en la fuente, retención de IVA, retención de ICA y total neto.
- Q: Al eliminar un cliente guardado, ¿qué pasa con las cotizaciones existentes que lo referencian? → A: Snapshot preservado. Las cotizaciones conservan una copia de los datos del cliente; solo se elimina la entrada reutilizable del listado de clientes.
- Q: ¿El enlace temporal de descarga del PDF (fallback de WhatsApp) requiere autenticación? → A: No. El enlace es público con expiración de 7 días. El flujo principal de WhatsApp adjunta el PDF directamente; el enlace solo es el fallback cuando el dispositivo no soporta compartir archivos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Gestión de clientes guardados en nueva cotización (Priority: P1)

Como profesional que cotiza frecuentemente a los mismos clientes, quiero que al crear una nueva cotización me aparezca un listado de mis clientes guardados para seleccionar uno y ver sus datos en vista previa, o si no tengo clientes guardados, poder ingresar los datos manualmente y guardarlos para futuras cotizaciones. Quiero poder subir el logo del cliente en cualquier momento.

**Why this priority**: El panel de clientes es la pieza central de la experiencia de cotización. Reduce el tiempo de creación de cotizaciones recurrentes y es la funcionalidad más solicitada.

**Independent Test**: Se puede probar creando una cotización nueva, verificando que aparece el formulario vacío si no hay clientes, guardando un cliente, y luego creando otra cotización donde aparezca el listado con el cliente guardado y su vista previa.

**Acceptance Scenarios**:

1. **Given** un usuario sin clientes guardados, **When** accede a "Nueva cotización", **Then** ve el formulario de datos del cliente vacío con opción de guardar al completar los datos.
2. **Given** un usuario con clientes guardados, **When** accede a "Nueva cotización", **Then** ve un listado de sus clientes guardados con nombre/razón social y puede buscar o filtrar.
3. **Given** un usuario que selecciona un cliente del listado, **When** lo elige, **Then** ve una vista previa con los datos completos del cliente (razón social, NIT/documento, contacto, correo, teléfono, logo) y puede confirmar o cambiar de cliente.
4. **Given** un usuario que completa datos de un cliente nuevo, **When** finaliza el formulario, **Then** puede guardar ese cliente para futuras cotizaciones con un botón "Guardar cliente".
5. **Given** un usuario en el formulario de cliente, **When** desea agregar el logo del cliente, **Then** puede subir una imagen (JPG, PNG, máximo 2 MB) que se almacena con el perfil del cliente y aparece en el PDF generado.
6. **Given** un usuario que cambia de cliente seleccionado, **When** elige otro cliente del listado, **Then** la vista previa de la cotización se actualiza automáticamente con los datos del nuevo cliente.

---

### User Story 2 — Distinción empresa/independiente y configuración de impuestos (Priority: P1)

Como profesional colombiano (persona natural independiente o empresa), quiero que el sistema distinga mi tipo de emisor para aplicar correctamente los impuestos que me corresponden al cotizar: IVA, retención en la fuente, ICA y aportes adicionales según la normativa tributaria colombiana.

**Why this priority**: La correcta aplicación de impuestos es un requisito legal y financiero crítico. Sin esta distinción, las cotizaciones pueden ser incorrectas tributariamente, generando problemas legales y económicos al usuario.

**Independent Test**: Se puede probar configurando el perfil como independiente, creando una cotización y verificando que aparecen las opciones de retención en la fuente e IVA según aplique. Luego cambiando a empresa y verificando las diferencias en impuestos aplicables.

**Acceptance Scenarios**:

1. **Given** un usuario que configura su perfil, **When** define su tipo de emisor, **Then** puede seleccionar entre "Persona natural / Independiente" o "Persona jurídica / Empresa", y el sistema guarda esta configuración.
2. **Given** un usuario independiente (persona natural) en Colombia, **When** crea una cotización para una empresa, **Then** ve opciones para configurar: retención en la fuente (con porcentajes comunes: 4%, 6%, 10%, 11%), IVA (0% si no es responsable, 19% si es responsable), retención de IVA (15% sobre el IVA) y retención de ICA (según municipio).
3. **Given** un usuario empresa (persona jurídica), **When** crea una cotización, **Then** ve opciones para configurar: IVA (19% estándar u otros porcentajes según tipo de bien/servicio), y puede indicar si el cliente le practica retención en la fuente.
4. **Given** un usuario independiente que marca "Retención en la fuente (11%)", **When** la cotización se calcula, **Then** el total muestra el subtotal, IVA (si aplica), descuento por retención en la fuente y total neto a recibir.
5. **Given** un usuario que desea compensar el costo de la retención, **When** edita un servicio/producto, **Then** puede agregar un porcentaje adicional al precio unitario para compensar el descuento por retención (el sistema lo calcula automáticamente si el usuario activa esta opción).
6. **Given** un usuario que ya definió su tipo en el perfil, **When** accede a "Nueva cotización", **Then** su perfil de emisor se carga por defecto con la opción de modificarlo temporalmente para esa cotización específica.

---

### User Story 3 — Catálogo de servicios reutilizables en cotización (Priority: P1)

Como profesional que ofrece servicios recurrentes, quiero que mis servicios guardados aparezcan como listado al crear una cotización (similar al listado de clientes), para no tener que escribir la descripción y el precio cada vez.

**Why this priority**: Junto con los clientes guardados, los servicios reutilizables son esenciales para reducir el tiempo de creación de cotizaciones y eliminar errores de transcripción.

**Independent Test**: Se puede probar guardando un servicio desde el catálogo, creando una nueva cotización y verificando que el servicio aparece para ser agregado con un clic.

**Acceptance Scenarios**:

1. **Given** un usuario sin servicios guardados, **When** accede a la sección de servicios en "Nueva cotización", **Then** ve el formulario actual para agregar servicios manualmente, con opción de guardarlos al catálogo.
2. **Given** un usuario con servicios guardados, **When** accede a la sección de servicios en "Nueva cotización", **Then** ve un listado de sus servicios guardados que puede agregar a la cotización con un clic.
3. **Given** un usuario que agrega un servicio del catálogo a la cotización, **When** lo selecciona, **Then** la descripción, cantidad predeterminada y precio unitario se completan automáticamente, pero puede editarlos para esa cotización específica.
4. **Given** un usuario que llena un servicio manualmente, **When** completa la descripción y precio, **Then** puede guardarlo al catálogo para futuras cotizaciones.

---

### User Story 4 — Perfil de emisor con carga automática y emisores múltiples (Priority: P2)

Como profesional que ya configuró su perfil (nombre, NIT, correo, teléfono, logo, tipo de emisor), quiero que al crear una cotización mi perfil se cargue automáticamente en la sección "Tu información". Si soy premium, quiero poder tener varios perfiles de emisor para enviar cotizaciones como si fuera distintas empresas o identidades profesionales.

**Why this priority**: La carga automática del perfil ahorra tiempo en cada cotización. Los emisores múltiples son un diferenciador premium valioso para profesionales que operan bajo varias razones sociales.

**Independent Test**: Se puede probar configurando el perfil, creando una cotización y verificando que "Tu información" se llena sola. Para premium: creando un segundo emisor y alternando entre ellos en el borrador.

**Acceptance Scenarios**:

1. **Given** un usuario con perfil completo, **When** accede a "Nueva cotización", **Then** la sección "Tu información" se llena automáticamente con los datos de su perfil (nombre/razón social, NIT, correo, teléfono).
2. **Given** un usuario que quiere modificar sus datos de emisor en una cotización, **When** edita los campos en "Tu información", **Then** los cambios aplican solo a esa cotización, sin modificar su perfil guardado.
3. **Given** un usuario premium, **When** accede al borrador de cotización, **Then** ve un selector de emisor que le permite elegir entre sus distintos perfiles de emisor registrados.
4. **Given** un usuario gratuito, **When** crea una cotización, **Then** solo puede usar su perfil principal. Si quiere cambiar datos de emisor, debe hacerlo desde la sección de perfil (afecta todas las cotizaciones futuras).
5. **Given** un usuario premium con múltiples emisores, **When** selecciona un emisor diferente en el borrador, **Then** la vista previa se actualiza con el nombre, NIT, logo y datos del emisor seleccionado.
6. **Given** la sección de planes, **When** un usuario la consulta, **Then** se destaca que con premium puede enviar cotizaciones como distintos emisores o empresas.

---

### User Story 5 — Plantillas de PDF personalizables (Priority: P2)

Como usuario premium, quiero poder escoger entre varias plantillas de PDF para mis cotizaciones y personalizar los colores y la diagramación, para que mis cotizaciones reflejen la identidad visual de mi negocio. Los usuarios gratuitos reciben un PDF estándar con diseño profesional y atractivo.

**Why this priority**: La personalización del PDF es un diferenciador premium que agrega valor percibido. El PDF gratuito también debe lucir profesional para retener usuarios.

**Independent Test**: Se puede probar como usuario gratuito descargando un PDF y verificando que luce profesional. Luego como premium, seleccionando distintas plantillas, cambiando colores y descargando para comparar.

**Acceptance Scenarios**:

1. **Given** un usuario gratuito, **When** descarga el PDF de una cotización, **Then** recibe un PDF con diseño profesional estándar (limpio, bien diagramado, con logo del emisor y del cliente si los subió).
2. **Given** un usuario premium, **When** accede a las opciones de PDF, **Then** ve un catálogo de al menos 3 plantillas de diseño para elegir.
3. **Given** un usuario premium que selecciona una plantilla, **When** la elige, **Then** puede personalizar los colores principales (color de encabezado, color de acento, color de texto) y ver una vista previa antes de descargar.
4. **Given** un usuario premium con plantilla personalizada, **When** descarga o comparte el PDF, **Then** el PDF refleja la plantilla y los colores elegidos.

---

### User Story 6 — Borrador de cotización con preview dinámico (Priority: P1)

Como usuario que crea una cotización, quiero que el borrador se guarde correctamente y que al cambiar de cliente, emisor o servicios, la vista previa se actualice en tiempo real con los datos seleccionados.

**Why this priority**: El borrador es la experiencia central de la app. Si los datos no se guardan bien o la vista previa no refleja los cambios, la confianza del usuario se pierde.

**Independent Test**: Se puede probar creando un borrador, cambiando el cliente, verificando que la vista previa se actualiza, guardando, cerrando y reabriendo para verificar persistencia.

**Acceptance Scenarios**:

1. **Given** un usuario editando una cotización, **When** cambia cualquier dato (cliente, emisor, servicio, impuesto), **Then** la vista previa se actualiza automáticamente reflejando los datos actuales.
2. **Given** un usuario que guarda un borrador, **When** vuelve a acceder a "Mis cotizaciones", **Then** encuentra el borrador con todos los datos exactamente como los dejó (cliente, servicios, impuestos, emisor).
3. **Given** un usuario que selecciona un cliente diferente en un borrador existente, **When** el cliente cambia, **Then** la vista previa muestra el nuevo cliente y conserva los servicios y configuración de impuestos.
4. **Given** un usuario que cierra la app sin guardar explícitamente, **When** vuelve a la cotización, **Then** los datos del borrador se han preservado (autoguardado).

---

### User Story 7 — WhatsApp con PDF adjunto (Priority: P2)

Como usuario que comparte cotizaciones por WhatsApp, quiero que al presionar el botón de WhatsApp se adjunte directamente el PDF de la cotización para que mi cliente lo reciba de forma inmediata.

**Why this priority**: El envío por WhatsApp es el canal principal de distribución de cotizaciones en Colombia. Adjuntar el PDF mejora significativamente la experiencia del destinatario.

**Independent Test**: Se puede probar creando una cotización completa, presionando el botón de WhatsApp y verificando que se abre WhatsApp con el PDF listo para enviar.

**Acceptance Scenarios**:

1. **Given** un usuario con una cotización completa, **When** presiona el botón de WhatsApp, **Then** se genera el PDF y se abre WhatsApp con el archivo adjunto listo para enviar (usando la funcionalidad de compartir archivos del dispositivo).
2. **Given** un usuario en un dispositivo que no soporta compartir archivos directamente, **When** presiona el botón de WhatsApp, **Then** como alternativa se abre WhatsApp con un mensaje prellenado que incluye un enlace de descarga del PDF (comportamiento actual mejorado).

---

### User Story 8 — Unificación de textos legales y aceptación simplificada (Priority: P2)

Como usuario que se registra en la plataforma, quiero encontrar toda la política de datos, SARLAFT y términos de uso en un solo documento unificado, y aceptarlo con un único checkbox al registrarme.

**Why this priority**: La fragmentación de textos legales confunde al usuario y dificulta la aceptación. Un solo documento con un solo check simplifica el registro sin perder cumplimiento legal.

**Independent Test**: Se puede probar registrándose y verificando que solo aparece un checkbox con enlace a un documento legal unificado, y que ese documento contiene todas las secciones legales requeridas.

**Acceptance Scenarios**:

1. **Given** un nuevo usuario registrándose, **When** llega al paso de aceptación de términos, **Then** ve un solo checkbox con texto tipo "Acepto los Términos de uso, Política de privacidad y SARLAFT" con enlace al documento completo.
2. **Given** el documento legal unificado, **When** el usuario lo abre, **Then** contiene todas las secciones: política de privacidad (Ley 1581 de 2012), SARLAFT, términos de uso y política de donaciones, organizadas como secciones dentro de un solo texto coherente.
3. **Given** un usuario existente que ya aceptó los términos fragmentados, **When** se actualiza al formato unificado, **Then** se le solicita aceptar la nueva versión unificada en su próximo inicio de sesión.

---

### User Story 9 — Doble autenticación (2FA) (Priority: P2)

Como usuario preocupado por la seguridad de mis datos y cotizaciones, quiero poder activar la autenticación de dos factores para proteger mi cuenta con una capa adicional de seguridad.

**Why this priority**: La doble autenticación es un estándar de seguridad que protege la información comercial sensible de los usuarios. Es especialmente importante para cuentas premium con datos persistentes.

**Independent Test**: Se puede probar activando 2FA desde el perfil, cerrando sesión, volviendo a iniciar sesión y verificando que se solicita el segundo factor.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** accede a la configuración de seguridad en su perfil, **Then** ve la opción de activar autenticación de dos factores.
2. **Given** un usuario que activa 2FA, **When** configura su segundo factor (correo electrónico o app de autenticación), **Then** recibe confirmación de que 2FA está activo y se le proporcionan códigos de recuperación.
3. **Given** un usuario con 2FA activo, **When** inicia sesión con sus credenciales, **Then** se le solicita el código del segundo factor antes de acceder a la plataforma.
4. **Given** un usuario con 2FA que pierde acceso a su segundo factor, **When** usa un código de recuperación, **Then** puede acceder a su cuenta y reconfigurar 2FA.

---

### User Story 10 — SEO, metadatos, Core Web Vitals y favicon (Priority: P3)

Como propietario de la plataforma, quiero que la página principal tenga un texto introductorio optimizado para SEO que explique qué es la app, metadatos completos para Google, buen rendimiento en Core Web Vitals y un favicon profesional.

**Why this priority**: El SEO y el rendimiento mejoran la adquisición orgánica de usuarios pero no son funcionalidades del producto en sí. El favicon completa la identidad visual.

**Independent Test**: Se puede probar abriendo la página principal, verificando el texto introductorio, inspeccionando los metadatos del HTML, corriendo una auditoría de rendimiento y verificando que el favicon aparece en la pestaña del navegador.

**Acceptance Scenarios**:

1. **Given** un visitante que accede a la página principal, **When** la página carga, **Then** ve un texto introductorio profesional en español que explica qué es PresupuestosPro, sus beneficios y para quién está diseñada.
2. **Given** un motor de búsqueda que indexa la página, **When** lee los metadatos, **Then** encuentra title, description, Open Graph tags (og:title, og:description, og:image) y datos estructurados relevantes.
3. **Given** una auditoría de rendimiento, **When** se ejecuta sobre la página principal, **Then** los Core Web Vitals están en zona verde: LCP menor a 2.5 segundos, INP menor a 200ms, CLS menor a 0.1.
4. **Given** cualquier página de la plataforma, **When** el usuario mira la pestaña del navegador, **Then** ve el favicon con el logo de PresupuestosPro.

---

### User Story 11 — Eliminación de cotizaciones y diseño profesional (Priority: P3)

Como usuario que gestiona sus cotizaciones, quiero poder eliminar cotizaciones desde el listado de "Mis cotizaciones" y que toda la interfaz mantenga un diseño profesional con elementos minimalistas.

**Why this priority**: La eliminación de cotizaciones es una funcionalidad de gestión básica. El diseño profesional es una mejora cosmética continua.

**Independent Test**: Se puede probar accediendo al listado de cotizaciones, eliminando una y verificando que desaparece. Para el diseño: verificando que los checkboxes son compactos y estéticos.

**Acceptance Scenarios**:

1. **Given** un usuario en el listado de "Mis cotizaciones", **When** ve cada cotización, **Then** cada una tiene un botón de eliminar visible y accesible.
2. **Given** un usuario que presiona eliminar en una cotización, **When** confirma la acción, **Then** la cotización se elimina permanentemente y desaparece del listado.
3. **Given** un usuario que presiona eliminar, **When** se le muestra una confirmación, **Then** puede cancelar la eliminación sin pérdida de datos.
4. **Given** cualquier pantalla de la plataforma, **When** el usuario interactúa con checkboxes, **Then** estos son pequeños, minimalistas y estéticamente coherentes con el diseño general.
5. **Given** toda la plataforma, **When** el usuario navega por las distintas secciones, **Then** el diseño es consistente, profesional y moderno en todos los componentes.

---

### User Story 12 — Seguridad web y validación de datos (Priority: P2)

Como propietario de la plataforma, quiero asegurar que los datos se guardan correctamente en la base de datos, que la aplicación pasa pruebas de seguridad web y que la información de los usuarios está protegida.

**Why this priority**: La integridad de datos y la seguridad son requisitos no negociables para una aplicación que maneja información comercial y financiera.

**Independent Test**: Se puede probar ejecutando pruebas de seguridad web (OWASP Top 10), verificando la integridad de datos al guardar y recuperar cotizaciones, clientes y configuraciones.

**Acceptance Scenarios**:

1. **Given** un usuario que guarda datos (cliente, cotización, perfil), **When** los datos se persisten, **Then** al recuperarlos son idénticos a los ingresados (sin pérdida, truncamiento o corrupción).
2. **Given** la plataforma en producción, **When** se ejecuta un análisis de seguridad, **Then** no se detectan vulnerabilidades críticas ni altas del OWASP Top 10 (inyección, XSS, CSRF, autenticación rota, etc.).
3. **Given** un formulario de la plataforma, **When** un usuario ingresa datos, **Then** todos los inputs se validan y sanitizan antes de persistirse.
4. **Given** la comunicación entre navegador y servidor, **When** se transmiten datos, **Then** toda la comunicación se realiza sobre HTTPS con certificado válido.

---

### User Story 13 — Actualización de planes de suscripción (Priority: P2)

Como propietario de la plataforma, quiero actualizar el cuadro comparativo de planes para reflejar las nuevas funcionalidades premium (emisores múltiples, plantillas de PDF personalizables) y mantener la propuesta de valor atractiva.

**Why this priority**: Los planes deben reflejar las nuevas funcionalidades para que los usuarios entiendan el valor de premium y conviertan.

**Independent Test**: Se puede probar accediendo a la sección de planes y verificando que todas las funcionalidades nuevas aparecen correctamente diferenciadas entre gratuita y premium.

**Acceptance Scenarios**:

1. **Given** un usuario que consulta los planes, **When** ve el cuadro comparativo, **Then** incluye las nuevas funcionalidades: emisores múltiples (solo premium), plantillas de PDF personalizables (solo premium), PDF estándar profesional (gratuita), gestión de clientes con logo, catálogo de servicios e impuestos configurables (ambas cuentas con sus respectivos límites).
2. **Given** el cuadro comparativo, **When** el usuario lo revisa, **Then** destaca visualmente que con premium puede enviar cotizaciones como distintos emisores o empresas.

---

### Edge Cases

- EC1. Si un usuario sube un logo de cliente con formato no soportado o tamaño mayor a 2 MB, el sistema informa el error y solicita una imagen válida (JPG o PNG, máximo 2 MB).
- EC2. Si un usuario independiente no sabe qué porcentaje de retención aplicar, el sistema muestra los porcentajes más comunes con una breve descripción de cuándo aplica cada uno (4% compras, 6% servicios, 10% honorarios, 11% servicios declarante).
- EC3. Si un usuario gratuito alcanza el límite de clientes guardados (10), al intentar guardar uno nuevo ve un mensaje indicando el límite y sugiriendo la cuenta premium.
- EC4. Si el dispositivo del usuario no soporta compartir archivos directamente a WhatsApp, el sistema usa el enlace wa.me con URL de descarga como fallback.
- EC5. Si un usuario con 2FA activo pierde todos sus códigos de recuperación y acceso al segundo factor, debe contactar al soporte (correo del responsable en la política de privacidad) con verificación de identidad.
- EC6. Si un usuario intenta eliminar una cotización que fue compartida por WhatsApp con enlace activo, la cotización se elimina pero el enlace de descarga del PDF sigue activo hasta su expiración (7 días).
- EC7. Si un usuario premium con emisores múltiples baja a gratuita, conserva los datos de emisores en modo lectura pero solo puede usar el emisor principal para nuevas cotizaciones.
- EC8. Si un usuario independiente selecciona compensación de retención en el precio, el sistema calcula el precio ajustado y lo muestra desglosado (precio original + compensación) para transparencia.
- EC9. Si el autoguardado del borrador falla (pérdida de conexión), el sistema notifica al usuario e intenta reintentar cuando la conexión se restablezca. Los datos no guardados se preservan en el navegador.
- EC10. Si un usuario elimina un cliente de su listado, las cotizaciones existentes que referencian ese cliente conservan un snapshot de los datos del cliente (razón social, NIT, contacto, logo). Solo se elimina la entrada reutilizable; el historial de cotizaciones permanece intacto.

## Requirements *(mandatory)*

### Functional Requirements

**Gestión de clientes en cotización**

- **FR-001**: Al acceder a "Nueva cotización", si el usuario tiene clientes guardados, el panel de cliente MUST mostrar un listado con búsqueda y filtro de los clientes existentes, permitiendo seleccionar uno para prellenar los datos.
- **FR-002**: Si el usuario no tiene clientes guardados, el panel de cliente MUST mostrar el formulario de ingreso manual de datos del cliente (razón social, NIT/documento, contacto, correo, teléfono).
- **FR-003**: Desde el formulario de cliente en "Nueva cotización", el usuario MUST poder guardar el cliente ingresado para futuras cotizaciones.
- **FR-004**: El usuario MUST poder subir el logo del cliente (imagen JPG o PNG, máximo 2 MB) desde el formulario de cliente. El logo se almacena con el perfil del cliente y aparece en el PDF generado.
- **FR-005**: Al seleccionar un cliente del listado, el sistema MUST mostrar una vista previa con los datos completos del cliente antes de confirmar la selección.
- **FR-006**: Al cambiar de cliente seleccionado, la vista previa de la cotización MUST actualizarse automáticamente con los datos del nuevo cliente.

**Distinción empresa/independiente e impuestos**

- **FR-007**: En la sección de perfil, el usuario MUST poder definir su tipo de emisor: "Persona natural / Independiente" o "Persona jurídica / Empresa".
- **FR-008**: Al crear una cotización, el tipo de emisor del perfil MUST cargarse por defecto. El usuario puede modificar temporalmente el tipo para esa cotización sin cambiar su perfil.
- **FR-009**: Para emisores tipo "Persona natural / Independiente", el sistema MUST mostrar opciones de impuestos configurables: retención en la fuente (porcentajes seleccionables: 4%, 6%, 10%, 11%, personalizado), IVA (0% si no es responsable, 19% si es responsable), retención de IVA (15% sobre el IVA facturado, si aplica) y retención de ICA (porcentaje configurable según municipio).
- **FR-010**: Para emisores tipo "Persona jurídica / Empresa", el sistema MUST mostrar opciones de IVA (19% estándar u otro porcentaje según tipo de bien/servicio) e indicar si el cliente practica retención en la fuente.
- **FR-011**: El cálculo de la cotización MUST desglosar: subtotal, IVA (si aplica), retención en la fuente (si aplica, como descuento), retención de IVA (si aplica, como descuento), retención de ICA (si aplica, como descuento) y total neto a recibir.
- **FR-012**: El usuario MUST poder activar una opción de "Compensar retención en precio" que agregue automáticamente un porcentaje al precio unitario de los servicios para compensar el descuento por retención. El cálculo MUST ser transparente y mostrar el desglose (precio original + compensación).
- **FR-013**: Los porcentajes de impuestos configurados MUST persistir como preferencia del perfil de emisor activo (no del usuario global) y cargarse por defecto en futuras cotizaciones que usen ese emisor.

**Catálogo de servicios reutilizables**

- **FR-014**: En la sección de servicios de "Nueva cotización", si el usuario tiene servicios guardados, MUST mostrarse un listado de los servicios del catálogo con descripción y precio.
- **FR-015**: El usuario MUST poder agregar un servicio del catálogo a la cotización con un clic, prellenando descripción, cantidad predeterminada y precio unitario.
- **FR-016**: Los datos de un servicio del catálogo agregado a una cotización MUST ser editables para esa cotización específica sin modificar el catálogo.
- **FR-017**: El usuario MUST poder guardar un servicio ingresado manualmente al catálogo para futuras cotizaciones.

**Perfil de emisor y emisores múltiples**

- **FR-018**: Al crear una cotización, la sección "Tu información" MUST llenarse automáticamente con los datos del perfil del usuario (nombre/razón social, NIT/documento, correo, teléfono, logo).
- **FR-019**: Los usuarios premium MUST poder registrar múltiples perfiles de emisor (cada uno con nombre/razón social, NIT, correo, teléfono, logo, tipo de emisor y configuración de impuestos independiente).
- **FR-020**: En el borrador de cotización, los usuarios premium MUST ver un selector para elegir el emisor de la cotización entre sus perfiles registrados.
- **FR-021**: Los usuarios gratuitos MUST usar exclusivamente su perfil principal como emisor. Para cambiar datos de emisor, deben hacerlo desde la sección de perfil.
- **FR-022**: Al cambiar de emisor en el borrador, la vista previa MUST actualizarse con los datos (nombre, NIT, logo) del emisor seleccionado.

**Plantillas de PDF**

- **FR-023**: Los usuarios gratuitos MUST recibir un PDF con diseño profesional estándar (limpio, bien diagramado, incluye logos si están disponibles). El PDF MUST mostrar el desglose completo de impuestos: subtotal, IVA, retención en la fuente, retención de IVA, retención de ICA y total neto, según aplique.
- **FR-024**: Los usuarios premium MUST poder seleccionar entre al menos 3 plantillas de diseño de PDF.
- **FR-025**: Los usuarios premium MUST poder personalizar los colores principales de la plantilla seleccionada (encabezado, acento, texto) y ver vista previa antes de descargar.
- **FR-026**: La plantilla y colores seleccionados MUST persistir como preferencia del usuario para futuras cotizaciones.

**Borrador y preview dinámico**

- **FR-027**: El borrador de cotización MUST autoguardarse al realizar cambios (cliente, emisor, servicios, impuestos) para prevenir pérdida de datos.
- **FR-028**: La vista previa de la cotización MUST actualizarse en tiempo real al modificar cualquier dato del borrador (cliente, emisor, servicios, cantidades, precios, impuestos).
- **FR-029**: Al recuperar un borrador guardado, todos los datos MUST restaurarse exactamente como fueron dejados: cliente seleccionado, emisor, lista de servicios con cantidades y precios, configuración de impuestos.

**WhatsApp con PDF**

- **FR-030**: El botón de WhatsApp MUST generar el PDF de la cotización e intentar compartirlo directamente como archivo adjunto usando la funcionalidad de compartir del dispositivo (Web Share API).
- **FR-031**: Si el dispositivo no soporta compartir archivos directamente, el sistema MUST usar como alternativa un enlace wa.me con mensaje prellenado que incluya un enlace de descarga temporal del PDF. El enlace de descarga es público (no requiere autenticación) y expira a los 7 días.

**Textos legales unificados**

- **FR-032**: La política de privacidad, SARLAFT, términos de uso y política de donaciones MUST unificarse en un solo documento legal coherente, organizado por secciones.
- **FR-033**: En el registro y login, la aceptación de términos MUST ser un solo checkbox con texto tipo "Acepto los Términos y Condiciones" con enlace al documento unificado.

**Doble autenticación (2FA)**

- **FR-034**: El usuario MUST poder activar autenticación de dos factores desde la configuración de seguridad en su perfil.
- **FR-035**: La 2FA MUST soportar al menos un método: correo electrónico (código de verificación enviado al correo registrado) o aplicación de autenticación (TOTP).
- **FR-036**: Al activar 2FA, el sistema MUST generar y mostrar códigos de recuperación (mínimo 8 códigos de un solo uso).
- **FR-037**: Con 2FA activo, cada inicio de sesión MUST solicitar el segundo factor después de la verificación de credenciales.

**SEO, metadatos y rendimiento**

- **FR-038**: La página principal MUST incluir un texto introductorio en español de Colombia que describa qué es PresupuestosPro, sus beneficios principales y a quién está dirigida.
- **FR-039**: Todas las páginas MUST incluir metadatos completos: title, meta description, Open Graph (og:title, og:description, og:image, og:url), y etiqueta canónica.
- **FR-040**: La plataforma MUST lograr métricas de Core Web Vitals en zona verde: LCP menor a 2.5 segundos, INP menor a 200 milisegundos, CLS menor a 0.1.
- **FR-041**: Todas las páginas de la plataforma MUST mostrar un favicon con el logo de PresupuestosPro en la pestaña del navegador.

**Seguridad y validación de datos**

- **FR-042**: La plataforma MUST pasar un análisis de seguridad sin vulnerabilidades críticas ni altas del OWASP Top 10 (inyección, XSS, CSRF, autenticación rota, exposición de datos sensibles).
- **FR-043**: Todos los datos ingresados por el usuario MUST validarse y sanitizarse antes de persistirse en la base de datos.
- **FR-044**: Los datos persistidos MUST poder recuperarse sin pérdida, truncamiento ni corrupción (integridad referencial garantizada).
- **FR-045**: Toda comunicación entre navegador y servidor MUST realizarse sobre HTTPS con certificado válido.

**Eliminación de cotizaciones**

- **FR-046**: En el listado de "Mis cotizaciones", cada cotización MUST tener un botón de eliminar visible.
- **FR-047**: Al presionar eliminar, el sistema MUST mostrar una confirmación antes de proceder. Si el usuario confirma, la cotización se elimina permanentemente.

**Diseño e interfaz**

- **FR-048**: Los elementos checkbox de toda la plataforma MUST ser pequeños, minimalistas y estéticamente coherentes con el diseño general.
- **FR-049**: El diseño general de la plataforma MUST mantener una apariencia profesional y moderna en todos los componentes y pantallas.

**Actualización de planes**

- **FR-050**: El cuadro comparativo de planes MUST actualizarse para incluir las nuevas funcionalidades: emisores múltiples (solo premium), plantillas de PDF personalizables (solo premium), PDF estándar profesional (gratuita), gestión de clientes, catálogo de servicios e impuestos configurables (ambas con límites según plan).
- **FR-051**: El cuadro de planes MUST destacar visualmente que con premium se pueden enviar cotizaciones como distintos emisores o empresas.

### Key Entities

- **Cliente**: Persona o empresa destinataria de una cotización. Atributos: razón social, NIT/documento, persona de contacto, correo, teléfono, logo (imagen). Pertenece a un usuario. Límites según plan (gratuita: 10, premium: 200). Al eliminar un cliente, las cotizaciones existentes conservan un snapshot de sus datos; solo se elimina la entrada reutilizable del listado.
- **Servicio del Catálogo**: Servicio o producto guardado por el usuario para reutilizar en cotizaciones. Atributos: descripción, precio unitario predeterminado, cantidad predeterminada. Pertenece a un usuario.
- **Perfil de Emisor**: Identidad profesional desde la cual se emite una cotización. Atributos: nombre/razón social, NIT/documento, correo, teléfono, logo, tipo de emisor (persona natural/empresa). Los usuarios gratuitos tienen un perfil de emisor; los premium pueden tener múltiples.
- **Configuración de Impuestos**: Preferencias tributarias asociadas a cada perfil de emisor (no al usuario global). Atributos: tipo de emisor (natural/jurídica), responsable de IVA (sí/no), porcentaje de retención en la fuente preferido, porcentaje de retención de IVA, porcentaje de retención de ICA, municipio de ICA, compensación de retención activa (sí/no). Cada perfil de emisor almacena su configuración de impuestos de forma independiente.
- **Plantilla de PDF**: Diseño visual disponible para cotizaciones. Atributos: nombre, diseño base, colores personalizables (encabezado, acento, texto). Las plantillas se seleccionan por usuarios premium.
- **Borrador de Cotización**: Estado intermedio de una cotización en edición. Atributos: emisor seleccionado, cliente seleccionado, lista de servicios con cantidades/precios, configuración de impuestos activa, plantilla de PDF seleccionada. Se autoguarda. Las cotizaciones permanecen siempre editables: compartir o descargar el PDF no cambia su estado ni las bloquea.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario con clientes guardados puede seleccionar un cliente y crear una cotización completa en menos de 2 minutos (vs. llenar todo manualmente cada vez).
- **SC-002**: Un usuario con servicios en el catálogo puede agregar 5 servicios a una cotización en menos de 30 segundos.
- **SC-003**: Los cálculos de impuestos (IVA, retención en la fuente, retención de IVA, retención de ICA) son correctos al 100% según los porcentajes configurados, verificables con cálculo manual.
- **SC-004**: El 100% de los borradores autoguardados se recuperan con todos sus datos intactos al reabrir la cotización.
- **SC-005**: La página principal obtiene puntuación verde (90+) en Core Web Vitals medidos con herramienta de auditoría de rendimiento.
- **SC-006**: El 100% de los datos ingresados (clientes, servicios, cotizaciones, perfiles de emisor) se persisten y recuperan sin pérdida ni corrupción.
- **SC-007**: La plataforma no presenta vulnerabilidades críticas ni altas en un análisis de seguridad basado en OWASP Top 10.
- **SC-008**: Un usuario puede activar 2FA y completar un inicio de sesión con segundo factor en menos de 1 minuto.
- **SC-009**: Los usuarios premium pueden alternar entre emisores y plantillas de PDF y ver la vista previa actualizada en menos de 3 segundos.
- **SC-010**: El botón de WhatsApp comparte el PDF (directamente o vía enlace) exitosamente en al menos el 95% de los dispositivos móviles probados.
- **SC-011**: El favicon se muestra correctamente en los 3 navegadores principales (Chrome, Firefox, Safari).
- **SC-012**: El texto introductorio de la página principal contiene al menos 3 palabras clave relevantes para SEO (cotización, presupuesto, freelancer, Colombia, profesional).

## Assumptions

- Se conserva toda la funcionalidad existente de las specs anteriores (001-005). Esta spec añade funcionalidades sin eliminar las existentes.
- Los límites de almacenamiento de la spec-005 aplican: gratuita (20 cotizaciones, 10 clientes), premium (500 cotizaciones, 200 clientes). Los servicios del catálogo siguen el mismo patrón de límites (gratuita: 20 servicios, premium: 200 servicios).
- Los porcentajes de retención en la fuente (4%, 6%, 10%, 11%) son los más comunes en Colombia para servicios profesionales según el Estatuto Tributario. El usuario puede ingresar un porcentaje personalizado si su caso no corresponde a los predeterminados.
- En Colombia, cuando un independiente (persona natural) presta servicios a una empresa (persona jurídica), la empresa como agente retenedor practica retención en la fuente sobre el pago. El independiente debe reflejar esto en su cotización para que el total neto sea transparente.
- La retención en la fuente no la cobra el independiente; es un descuento que practica la empresa contratante. El sistema lo muestra como deducción en la cotización para que ambas partes conozcan el neto a pagar.
- El IVA (19%) aplica si el independiente es responsable del IVA (régimen común). Si no es responsable (no contribuyente de IVA), no lo cobra. El sistema permite al usuario indicar si es responsable.
- La retención de ICA varía por municipio. El sistema permite al usuario configurar el porcentaje manualmente.
- El Web Share API para compartir archivos directamente a WhatsApp no está disponible en todos los navegadores de escritorio. El fallback con enlace wa.me cubre estos casos.
- El favicon usa el logo existente de PresupuestosPro. No se requiere diseño nuevo.
- Los emisores múltiples (premium) tienen un límite razonable de 5 perfiles de emisor por usuario premium.
- El autoguardado del borrador usa almacenamiento local del navegador como respaldo inmediato y sincroniza con el servidor cuando hay conexión.
- La 2FA por correo electrónico utiliza el servicio de Gmail API ya configurado en la spec-005.
- El texto introductorio SEO se escribe como contenido estático de la página principal, no como contenido dinámico generado.
