# Feature Specification: Plataforma de Cotizaciones Colombia

**Feature Branch**: `003-plataforma-cotizaciones`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "Cambiar lenguaje de la app a terminología colombiana (presupuesto → cotización). Web app escalable a móvil. Monetización con Google AdSense y pauta contratada. Plataforma abierta para cualquier profesional o PYME, respetando normatividad colombiana DIAN."

> **Referencia de diseño**: Esta feature evoluciona el diseño existente documentado en `specs/002-presupuestos-pro/design-brief.md`. La terminología, estructura de pantallas y decisiones de UX del design brief se mantienen como base, actualizando la nomenclatura y expandiendo el alcance a plataforma multiusuario con monetización.

## Glosario de Terminología

Mapeo de términos usados en versiones anteriores (spec-002) a la terminología colombiana estándar que MUST usarse en toda la plataforma:

| Término anterior | Término colombiano | Contexto |
|---|---|---|
| Presupuesto | Cotización | Documento comercial que se entrega al cliente |
| Lista de presupuestos | Mis cotizaciones | Pantalla principal |
| Editor de presupuesto | Editor de cotización | Pantalla de creación/edición |
| Nuevo presupuesto | Nueva cotización | Botón de acción principal |
| Número de presupuesto | Número de cotización | Identificador AAAA-NNN |
| Fecha de validez | Vigencia | Período de validez del documento |
| Base imponible | Base gravable | Suma antes de impuestos |
| Particular | Persona natural | Tipo de cliente (individuo) |
| Empresa | Persona jurídica | Tipo de cliente (sociedad, PYME) |
| Freelancer | Profesional independiente | Usuario de la plataforma |
| Perfil del freelancer | Perfil profesional | Sección de configuración personal |

## Clarifications

### Session 2026-10-05

- Q: Después de que una cotización se guarda por primera vez y recibe su número automático (AAAA-NNN), ¿el usuario puede seguir editando su contenido o se vuelve de solo lectura? → A: Estados Borrador / Emitida — editable mientras está en "Borrador", solo lectura una vez que el usuario la marca explícitamente como "Emitida".
- Q: FR-028 dice que la tarifa de IVA puede seleccionarse "por línea o por cotización" — ¿cuál modelo aplica para v1? → A: Una sola tarifa de IVA para toda la cotización (no por línea).
- Q: ¿Se requiere verificación del correo electrónico antes de que un usuario registrado pueda usar la plataforma? → A: Sí, verificación obligatoria por email antes de poder crear cotizaciones.
- Q: ¿El usuario puede eliminar cotizaciones, o solo borradores? → A: Solo puede eliminar borradores; las cotizaciones emitidas no se pueden eliminar (conservación por práctica comercial colombiana — Código de Comercio, 10 años).
- Q: ¿La plataforma debe ofrecer recuperación de contraseña ("Olvidé mi contraseña") en v1? → A: Sí, flujo de restablecimiento por enlace enviado al email verificado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear cotización con terminología y cálculos colombianos (Priority: P1)

Como profesional independiente colombiano, quiero crear una cotización eligiendo un cliente y añadiendo líneas de servicio, y que el sistema calcule automáticamente la base gravable, el IVA y la retención en la fuente según la normatividad DIAN vigente, usando terminología colombiana en toda la interfaz, para presentarle a mi cliente un documento correcto y profesional.

**Why this priority**: Es la razón de ser de la plataforma. Sin cotizaciones bien calculadas y con la terminología correcta, la app no cumple su propósito fundamental. La terminología colombiana ("cotización", "base gravable") genera confianza y familiaridad con el usuario local.

**Independent Test**: Se puede probar creando una cotización con dos líneas de servicio, un cliente tipo "persona jurídica", activando retención en la fuente al 11 %, y verificando que toda la interfaz dice "cotización" (no "presupuesto") y que los importes calculados coinciden con el cálculo manual según reglas DIAN.

**Acceptance Scenarios**:

1. **Given** un profesional autenticado en la plataforma, **When** navega a la sección principal, **Then** la interfaz muestra "Mis cotizaciones" como título y todos los textos usan la terminología del glosario (cotización, base gravable, retención en la fuente, persona natural/jurídica, etc.).
2. **Given** una cotización con dos líneas (1.500.000 COP y 500.000 COP) y un cliente tipo "persona jurídica" con retención en la fuente al 11 %, **When** el profesional guarda la cotización, **Then** el sistema muestra: base gravable 2.000.000 COP, IVA 380.000 COP, retención −220.000 COP, total 2.160.000 COP.
3. **Given** un cliente de tipo "persona natural" no agente retenedor, **When** el profesional intenta activar retención en la fuente, **Then** el sistema la deshabilita y muestra una explicación visible del motivo.
4. **Given** una cotización sin líneas, **When** el profesional intenta descargar el PDF, **Then** el sistema lo impide y muestra un aviso claro.

---

### User Story 2 - Registrarse y acceder a la plataforma (Priority: P2)

Como profesional independiente o representante de una PYME colombiana, quiero registrarme en la plataforma con mis datos básicos y acceder desde cualquier navegador, para crear y gestionar mis cotizaciones sin depender de un equipo específico.

**Why this priority**: La plataforma es multiusuario y pública; sin registro y autenticación no puede funcionar como servicio abierto. Es prerrequisito para la monetización y para que cada profesional tenga su propio espacio de datos.

**Independent Test**: Se puede probar registrando un nuevo usuario con email, nombre, tipo y número de documento, iniciando sesión, creando una cotización, cerrando sesión, volviendo a iniciar sesión desde otro navegador y verificando que la cotización sigue allí.

**Acceptance Scenarios**:

1. **Given** un profesional sin cuenta, **When** completa el formulario de registro con nombre completo, correo electrónico, tipo de documento (CC, NIT, CE, pasaporte), número de documento y contraseña, **Then** recibe acceso a su espacio personal en la plataforma.
2. **Given** un profesional registrado, **When** inicia sesión desde un navegador o dispositivo diferente, **Then** ve todas sus cotizaciones, clientes, catálogo de servicios y perfil tal como los dejó.
3. **Given** un profesional autenticado, **When** cierra sesión, **Then** sus datos quedan protegidos y no son accesibles sin volver a autenticarse.

---

### User Story 3 - Experiencia responsiva y lista para móvil (Priority: P3)

Como profesional que trabaja frecuentemente desde el celular, quiero usar la plataforma cómodamente desde el navegador móvil, con controles táctiles adecuados y una experiencia fluida, para crear cotizaciones rápidas en cualquier momento y lugar.

**Why this priority**: La mayoría de profesionales independientes en Colombia usan el celular como dispositivo principal de trabajo. El design brief ya establece mobile-first como principio. Si la experiencia móvil no es buena, la adopción se resiente significativamente.

**Independent Test**: Se puede probar accediendo desde un celular, creando una cotización completa (seleccionar cliente, añadir líneas, descargar PDF) y verificando que todos los controles son accesibles con el pulgar, los formularios son legibles y no hay scroll horizontal.

**Acceptance Scenarios**:

1. **Given** un profesional accediendo desde un celular con pantalla de 360px de ancho, **When** navega por la plataforma, **Then** todos los elementos son visibles sin scroll horizontal y los botones/campos tienen un área táctil mínima de 44px.
2. **Given** un profesional en un celular, **When** crea una cotización completa (cliente, líneas, descarga PDF), **Then** puede completar el flujo sin necesidad de cambiar a escritorio.
3. **Given** la plataforma web responsiva, **When** se evalúa su estructura, **Then** el diseño permite una futura evolución a aplicación móvil nativa sin rediseñar la lógica de negocio ni la estructura de datos.

---

### User Story 4 - Monetización con publicidad (Priority: P4)

Como propietario de la plataforma, quiero mostrar anuncios de Google AdSense en espacios designados y ofrecer espacios de pauta directa a anunciantes que contraten, para generar ingresos que sostengan el servicio gratuito.

**Why this priority**: La monetización hace viable la plataforma a largo plazo. Sin embargo, las funcionalidades core (cotizaciones, registro, experiencia móvil) deben funcionar primero. La publicidad se integra sobre una plataforma que ya tiene usuarios.

**Independent Test**: Se puede probar verificando que los espacios publicitarios se muestran correctamente en las ubicaciones designadas, que los anuncios de AdSense cargan sin bloquear la funcionalidad principal, y que los espacios de pauta directa muestran el contenido del anunciante cuando está contratado.

**Acceptance Scenarios**:

1. **Given** un profesional usando la plataforma, **When** navega por las pantallas principales (lista de cotizaciones, editor, clientes), **Then** se muestran espacios publicitarios en ubicaciones que no interfieren con la creación de cotizaciones.
2. **Given** un espacio de pauta contratada por un anunciante, **When** el anunciante ha proporcionado su contenido, **Then** ese contenido se muestra en el espacio designado a todos los usuarios.
3. **Given** un espacio de pauta sin anunciante contratado, **When** un usuario visita la página, **Then** el espacio muestra publicidad de Google AdSense como relleno o permanece oculto de forma elegante.
4. **Given** la publicidad desplegada, **When** un profesional está editando una cotización en un celular, **Then** los anuncios no se superponen a los controles de edición ni dificultan la interacción táctil.

---

### User Story 5 - Cumplimiento normativo DIAN para profesionales y PYMEs (Priority: P5)

Como profesional independiente o PYME colombiana, quiero que las cotizaciones apliquen correctamente las reglas tributarias de la DIAN (tarifas de IVA, retención en la fuente según tipo de servicio), para presentar documentos coherentes con mis obligaciones fiscales.

**Why this priority**: El cumplimiento normativo es lo que diferencia esta herramienta de una calculadora genérica. Sin embargo, se construye sobre la base de las funcionalidades de cotización y registro ya existentes (Historias 1-3).

**Independent Test**: Se puede probar creando cotizaciones con diferentes combinaciones de tipo de retención y tipo de IVA, y verificando que los porcentajes aplicados y los montos calculados corresponden a las tarifas vigentes de la DIAN.

**Acceptance Scenarios**:

1. **Given** un profesional que presta servicios de honorarios, **When** crea una cotización a un cliente agente retenedor, **Then** puede seleccionar la tarifa de retención en la fuente aplicable (honorarios 10 % o 11 %).
2. **Given** una PYME que cotiza servicios generales, **When** crea una cotización, **Then** puede seleccionar la tarifa de retención correspondiente (servicios 4 % o 6 %) o las que apliquen a su actividad.
3. **Given** un profesional configurando su perfil, **When** selecciona su régimen tributario (ordinario, simple, no responsable de IVA), **Then** el sistema registra esta información y la incluye en los datos fiscales del PDF.
4. **Given** cualquier cotización generada, **When** se descarga como PDF, **Then** el documento incluye los datos fiscales del emisor (NIT/CC, régimen tributario) y del receptor, conforme a la práctica comercial colombiana.

---

### Edge Cases

- EC1. Si un profesional no ha completado su perfil fiscal (NIT, régimen), puede crear cotizaciones, pero la plataforma muestra un aviso de que los datos fiscales del PDF estarán incompletos.
- EC2. Si un anuncio de AdSense no carga (bloqueador de publicidad, error de red), la funcionalidad de cotización sigue operando normalmente sin degradación.
- EC3. Si un profesional intenta aplicar retención en la fuente a un cliente tipo "persona natural" no agente retenedor, el sistema lo impide y explica el motivo visiblemente.
- EC4. Si la tarifa de IVA o retención vigente cambia por disposición legal, la plataforma aplica la nueva tarifa a las cotizaciones creadas después del cambio; las cotizaciones ya emitidas conservan sus cálculos originales.
- EC5. Si un profesional accede desde un dispositivo con pantalla muy pequeña (<320px), la plataforma sigue siendo funcional aunque la experiencia visual pueda ser menos óptima.
- EC6. La publicidad nunca se muestra dentro del PDF descargable de la cotización; solo aparece en la interfaz web.
- EC7. Si el profesional usa un bloqueador de publicidad, la plataforma sigue funcionando completamente; no se degrada ni se bloquea el acceso como represalia.

## Requirements *(mandatory)*

### Functional Requirements

**Terminología y localización**

- **FR-001**: La interfaz de usuario MUST usar "cotización" en todos los contextos donde antes decía "presupuesto", y aplicar la terminología del glosario definido en esta spec en toda la plataforma.
- **FR-002**: Todos los textos, mensajes de ayuda, validaciones, etiquetas y contenido generado (incluido el PDF) MUST estar en español de Colombia con terminología fiscal/comercial estándar (base gravable, retención en la fuente, NIT, persona natural, persona jurídica, régimen tributario, etc.).

**Registro y autenticación**

- **FR-003**: La plataforma MUST permitir el registro de usuarios con: nombre completo, correo electrónico, tipo de documento (CC, NIT, CE, pasaporte), número de documento y contraseña.
- **FR-004**: La plataforma MUST autenticar usuarios mediante correo electrónico y contraseña, con sesión persistente entre visitas.
- **FR-004a**: La plataforma MUST enviar un correo de verificación al registrarse. El usuario MUST confirmar su correo electrónico antes de poder crear cotizaciones, clientes o configurar su perfil profesional.
- **FR-004b**: La plataforma MUST ofrecer un flujo de "Olvidé mi contraseña" que envíe un enlace de restablecimiento al correo electrónico verificado del usuario.
- **FR-005**: Cada usuario MUST tener su propio espacio aislado de datos (cotizaciones, clientes, catálogo de servicios, perfil) inaccesible para otros usuarios.

**Cotizaciones**

- **FR-006**: El sistema MUST permitir crear cotizaciones con: selección de cliente, líneas de servicio (desde catálogo o manuales, con descripción, cantidad entera ≥ 1 y precio unitario en COP enteros > 0), cálculo automático de base gravable, IVA y retención en la fuente.
- **FR-007**: El sistema MUST numerar las cotizaciones automáticamente con el formato AAAA-NNN por usuario, asignando el número al guardar por primera vez y reiniciando el contador cada año natural.
- **FR-008**: Cada cotización MUST mostrar fecha de emisión y vigencia (30 días naturales desde la emisión).
- **FR-009**: El sistema MUST calcular automáticamente: base gravable (suma de cantidad × precio unitario), IVA (base gravable × tarifa de IVA aplicable), retención en la fuente (base gravable × tarifa seleccionada, si aplica), y total (base gravable + IVA − retención).
- **FR-010**: Si el cliente es de tipo "persona natural" no agente retenedor, el sistema MUST desactivar la retención en la fuente con explicación visible del motivo, sin ocultar el control.
- **FR-011**: El sistema MUST generar un PDF descargable con: logo del profesional (o nombre como cabecera si no hay logo), datos fiscales del emisor y receptor, número de cotización, fechas, tabla de líneas, desglose de base gravable, IVA, retención (si aplica) y total.
- **FR-012**: El sistema MUST impedir generar PDF de una cotización sin líneas, mostrando aviso claro al usuario.
- **FR-013**: Los importes MUST mostrarse redondeados a pesos colombianos enteros (sin decimales) en base gravable, IVA, retención y total; el cálculo interno usa precisión completa con redondeo solo al final sobre los totales agregados.
- **FR-014**: El número de cotización asignado automáticamente MUST ser inmutable; el profesional no puede editarlo una vez emitido.
- **FR-014a**: Cada cotización MUST tener un estado visible: "Borrador" (editable: el usuario puede modificar líneas, precios, cliente y configuración fiscal) o "Emitida" (solo lectura: ningún dato puede modificarse). El estado inicial al crear una cotización MUST ser "Borrador".
- **FR-014b**: El usuario MUST poder marcar explícitamente una cotización en "Borrador" como "Emitida" mediante una acción deliberada. Una vez emitida, la cotización MUST NOT poder revertirse a "Borrador".
- **FR-014c**: El usuario MUST poder eliminar cotizaciones en estado "Borrador". Las cotizaciones en estado "Emitida" MUST NOT poder eliminarse. El número de una cotización eliminada (borrador) MUST NOT reutilizarse.

**Perfil profesional y datos fiscales**

- **FR-015**: El sistema MUST permitir configurar el perfil profesional: nombre/razón social, NIT o documento de identidad, datos de contacto, logo (con vista previa; si no hay logo, se muestra el nombre como cabecera), y régimen tributario (ordinario, simple, no responsable de IVA).
- **FR-016**: Los datos del perfil MUST reflejarse en todas las cotizaciones nuevas. Las cotizaciones ya emitidas MUST conservar los datos que tenían al crearse.

**Clientes y catálogo**

- **FR-017**: El sistema MUST permitir crear, editar y eliminar clientes con: nombre/razón social, datos de contacto, tipo (persona natural / persona jurídica) y condición de agente retenedor. El tipo de cliente MUST ser un control muy visible, ya que determina si la retención puede aplicarse.
- **FR-018**: Una cotización MUST conservar una copia de los datos del cliente al crearse; editar o eliminar el cliente después MUST NOT alterar cotizaciones existentes.
- **FR-019**: El sistema MUST permitir mantener un catálogo de servicios reutilizables con nombre y precio por defecto. Editar o eliminar un servicio del catálogo MUST NOT afectar cotizaciones que ya lo usaron.

**Experiencia móvil y escalabilidad**

- **FR-020**: La plataforma MUST funcionar en navegadores de escritorio y móviles con una experiencia responsiva que no requiera scroll horizontal en pantallas de 360px o más de ancho.
- **FR-021**: Todos los controles interactivos MUST tener un área táctil mínima de 44px × 44px.
- **FR-022**: La estructura de la plataforma MUST separar la lógica de negocio de la presentación, de forma que permita una futura evolución a aplicación móvil nativa sin reescribir la lógica de negocio.

**Monetización**

- **FR-023**: La plataforma MUST incluir espacios designados para anuncios de Google AdSense en las pantallas principales (lista de cotizaciones, editor, catálogo, perfil).
- **FR-024**: La plataforma MUST incluir al menos dos espacios de pauta directa donde anunciantes contratados puedan mostrar su contenido publicitario.
- **FR-025**: Cuando un espacio de pauta directa no tiene anunciante contratado, MUST mostrar publicidad de AdSense como relleno o permanecer oculto sin afectar el diseño.
- **FR-026**: La publicidad MUST NOT mostrarse dentro de los PDFs descargables de cotización.
- **FR-027**: La publicidad MUST NOT interferir con los controles de edición de cotizaciones ni superponerse a elementos interactivos, especialmente en pantallas móviles.

**Normatividad DIAN**

- **FR-028**: La tarifa de IVA por defecto MUST ser la tarifa general vigente (19 %). El sistema MUST permitir seleccionar tarifa reducida (5 %) o excluido (0 %) a nivel de cotización completa (una sola tarifa aplica a todas las líneas de la misma cotización).
- **FR-029**: Las tarifas de retención en la fuente disponibles MUST incluir las principales definidas por la DIAN para actividades de profesionales y PYMEs: honorarios (10 % / 11 %), servicios generales (4 % / 6 %), compras (2.5 % / 3.5 %).
- **FR-030**: El PDF de la cotización MUST incluir los datos fiscales del emisor (nombre/razón social, NIT/CC, régimen tributario, responsabilidad de IVA) y los datos del receptor (nombre/razón social, NIT/CC), conforme a la práctica comercial colombiana.

### Key Entities *(include if feature involves data)*

- **Usuario**: Profesional independiente o representante de PYME que se registra en la plataforma. Tiene credenciales de acceso (email, contraseña) y un espacio aislado de datos.
- **Perfil profesional**: Nombre/razón social, NIT o documento de identidad, datos de contacto, logo, régimen tributario (ordinario, simple, no responsable de IVA). Un perfil por usuario; se usa como cabecera en todas las cotizaciones.
- **Cliente**: Nombre/razón social, datos de contacto, tipo (persona natural / persona jurídica), condición de agente retenedor. Una cotización conserva una copia de los datos del cliente al crearse.
- **Servicio (catálogo)**: Nombre y precio por defecto. Reutilizable como plantilla al crear líneas; editarlo o eliminarlo no afecta cotizaciones existentes.
- **Cotización**: Número (AAAA-NNN), fecha de emisión, vigencia, cliente asociado, configuración de retención en la fuente (activada/desactivada, tarifa seleccionada), tarifa de IVA, lista de líneas, totales calculados (base gravable, IVA, retención, total), estado (Borrador / Emitida). Una cotización en estado "Borrador" puede editarse libremente (líneas, precios, cliente); una vez que el usuario la marca explícitamente como "Emitida", se vuelve de solo lectura.
- **Línea de cotización**: Descripción, cantidad (entero ≥ 1), precio unitario (COP entero > 0), origen (catálogo o manual), importe de línea (cantidad × precio unitario).
- **Espacio publicitario**: Ubicación en la interfaz (banner, lateral, entre contenido), tipo (AdSense o pauta directa), estado (activo/inactivo), contenido del anunciante (si es pauta directa).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un profesional puede registrarse, configurar su perfil y generar su primera cotización con PDF en menos de 10 minutos.
- **SC-002**: El 100 % de los textos visibles en la interfaz usan la terminología colombiana del glosario ("cotización", "base gravable", "persona natural/jurídica", etc.) sin restos de "presupuesto" ni otra terminología no colombiana.
- **SC-003**: Un profesional puede completar el flujo completo de crear una cotización desde un celular (360px de ancho) sin scroll horizontal ni elementos inaccesibles.
- **SC-004**: Los cálculos de IVA y retención en la fuente para el caso de referencia (base gravable 2.000.000 COP, IVA 19 %, retención honorarios 11 %) arrojan exactamente 2.160.000 COP de total.
- **SC-005**: Los espacios publicitarios se cargan sin bloquear ni degradar la funcionalidad de creación de cotizaciones: el profesional puede crear una cotización completa aunque los anuncios fallen.
- **SC-006**: Al reabrir la plataforma e iniciar sesión, el 100 % del perfil, catálogo y cotizaciones previamente guardados siguen disponibles y sin pérdida de datos.
- **SC-007**: Las cotizaciones a clientes persona natural no agente retenedor se emiten sin retención en la fuente aplicada en el 100 % de los casos.

## Assumptions

- "Cotización" es el término comercial colombiano equivalente a "presupuesto" o "quote". No es una factura electrónica y no requiere cumplir con la Resolución DIAN de facturación electrónica; es un documento comercial previo a la aceptación del encargo.
- Las tarifas de IVA y retención en la fuente se configuran según la normatividad DIAN vigente a la fecha de lanzamiento. Si cambian por disposición legal, se actualizarán mediante mantenimiento de la plataforma; el profesional no edita los porcentajes directamente.
- Las tarifas de retención en la fuente incluidas (honorarios 10 %/11 %, servicios 4 %/6 %, compras 2.5 %/3.5 %) cubren los escenarios más comunes para profesionales independientes y PYMEs. Otras tarifas especiales pueden añadirse en versiones futuras.
- El régimen tributario del profesional (ordinario, simple, no responsable de IVA) se configura en el perfil y se muestra en el PDF. No cambia las tarifas de IVA ni retención disponibles; esas dependen del tipo de bien/servicio y del tipo de cliente.
- La plataforma es gratuita para todos los usuarios. Los ingresos provienen exclusivamente de publicidad (Google AdSense y pauta directa contratada por anunciantes). Un posible plan premium sin publicidad queda fuera del alcance de esta versión.
- El registro requiere un email válido y datos de documento de identidad colombiano. No se implementa verificación de identidad con entidades externas (DIAN, Registraduría, procuraduría) en esta versión.
- Los datos de cada usuario son privados y aislados. No hay funcionalidad de compartir cotizaciones entre usuarios dentro de la plataforma (la compartición es mediante el PDF descargado, enviado por WhatsApp, correo u otros medios externos).
- La plataforma es una web app responsiva (mobile-first). La evolución a aplicación móvil nativa es un objetivo de arquitectura (separación lógica/presentación), no una funcionalidad entregable de esta versión.
- Los montos se manejan exclusivamente en pesos colombianos (COP). No hay soporte multidivisa.
- No hay descuentos por línea ni descuentos globales en esta versión.
- La gestión de anunciantes de pauta directa (contratos, facturación al anunciante, rotación de creatividades) se maneja fuera de la plataforma en esta versión; la app solo muestra el contenido publicitario proporcionado.
- El diseño visual sigue los lineamientos del design brief existente (`specs/002-presupuestos-pro/design-brief.md`): paleta neutra, tipografía legible, mobile-first, inputs grandes; actualizando toda la terminología según el glosario de esta spec.
- Esta feature expande significativamente el alcance original de la constitution (de app local monousuario a plataforma multiusuario con autenticación y monetización). La constitution deberá actualizarse para reflejar este nuevo alcance antes de la fase de implementación.
