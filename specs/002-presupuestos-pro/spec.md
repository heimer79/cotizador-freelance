# Feature Specification: PresupuestosPro v0

**Feature Branch**: `002-presupuestos-pro`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "PresupuestosPro es una herramienta para que un freelancer colombiano cree presupuestos profesionales con su marca y los descargue en PDF para enviárselos a sus clientes, sin pelearse con Excel ni con plantillas. Debe calcular automáticamente IVA y retención en la fuente, numerar los presupuestos por año y generar un PDF listo para enviar."

> **Nota de adaptación al mercado**: la descripción original de esta feature se redactó con reglas fiscales españolas (IVA 21 %, retención de IRPF, NIF, euros). La constitution del proyecto (`.specify/memory/constitution.md`, Principio II) fija Colombia como mercado y COP como moneda. Por decisión explícita del usuario, esta spec traduce las reglas de negocio a sus equivalentes colombianos (IVA 19 %, retención en la fuente, NIT, pesos colombianos) conservando intacta la estructura y la intención original del encargo.

## Clarifications

### Session 2026-10-02

- Q: ¿En qué momento recibe un presupuesto su número oficial AAAA-NNN — al guardarlo por primera vez, o solo cuando se genera el PDF por primera vez? → A: Se asigna el número al crear/guardar por primera vez — todo presupuesto guardado tiene número de inmediato, incluso los inacabados.
- Q: ¿El redondeo a pesos colombianos enteros se aplica por línea o solo al final sobre los totales agregados? → A: Redondeo solo al final — las líneas se suman con precisión completa; solo la base, el IVA, la retención y el total se redondean a peso entero al mostrarse.
- Q: ¿Qué valores son válidos para la cantidad y el precio unitario de una línea de presupuesto? → A: Cantidad entera ≥ 1 y precio unitario > 0 (en pesos enteros); no se permiten ceros ni negativos.
- Q: Si el freelancer edita o elimina un cliente, ¿los presupuestos ya creados con ese cliente mantienen los datos originales o reflejan los datos actuales? → A: El presupuesto conserva una copia de los datos del cliente al crearse; editar/eliminar el cliente no afecta presupuestos existentes.
- Q: Cuando un presupuesto se edita después de generar su PDF, ¿el estado "modificado" debe mostrarse como una etiqueta visible en la interfaz? → B: Sin indicador visible — el freelancer puede regenerar el PDF cuando quiera y siempre refleja los datos actuales, sin aviso explícito de que el anterior quedó desactualizado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear un presupuesto con impuestos calculados automáticamente (Priority: P1)

Como freelancer, quiero crear un presupuesto eligiendo el cliente y añadiendo líneas de trabajo, y que el sistema calcule solo la base, el IVA, la retención en la fuente (cuando corresponda) y el total, para no equivocarme con los impuestos ni perder tiempo con la calculadora.

**Why this priority**: Es el corazón del producto. Sin un cálculo fiable de impuestos, PresupuestosPro no resuelve el problema real (presupuestos mal cuadrados, hechos de madrugada contra el reloj). Es la única historia que, por sí sola, ya evita el error más costoso para el freelancer.

**Independent Test**: Se puede probar por completo creando un presupuesto con dos líneas y un cliente de tipo "empresa", activando la retención en la fuente, y comprobando que la base, el IVA, la retención y el total mostrados en pantalla coinciden exactamente con el cálculo manual esperado.

**Acceptance Scenarios**:

1. **Given** un presupuesto con dos líneas (1.500.000 COP y 500.000 COP) y un cliente tipo "empresa" con retención en la fuente activada al 11 %, **When** el freelancer guarda el presupuesto, **Then** el sistema muestra base imponible 2.000.000 COP, IVA 380.000 COP, retención −220.000 COP y total 2.160.000 COP.
2. **Given** el mismo presupuesto, **When** el freelancer cambia la retención del 11 % al 10 %, **Then** el total se recalcula solo a 2.180.000 COP sin que el freelancer tenga que volver a introducir nada.
3. **Given** el mismo presupuesto, **When** el freelancer marca el cliente como "particular", **Then** la retención deja de aplicarse (aunque estuviera activada) y el total sube a 2.380.000 COP.
4. **Given** un presupuesto sin ninguna línea añadida, **When** el freelancer intenta generar el PDF, **Then** el sistema se lo impide y le avisa de que debe añadir al menos una línea.

---

### User Story 2 - Descargar el presupuesto como PDF listo para enviar (Priority: P2)

Como freelancer, quiero descargar el presupuesto como PDF con mi logo, mi marca, el número del presupuesto y su validez, para enviárselo al cliente con una imagen profesional sin tener que maquetarlo a mano.

**Why this priority**: El cálculo correcto (Historia 1) no sirve de nada si el freelancer no tiene un documento que pueda enviar. Esta historia es la que materializa el "éxito de negocio" (emitir un presupuesto en menos de 5 minutos).

**Independent Test**: Se puede probar generando el PDF de un presupuesto ya creado y comprobando visualmente que contiene el logo (o el estado por defecto si no hay logo), los datos del freelancer y del cliente, el número, las fechas y el desglose completo de importes.

**Acceptance Scenarios**:

1. **Given** un presupuesto con líneas y datos de cliente completos, **When** el freelancer pulsa "Descargar PDF", **Then** se genera un PDF con el logo del freelancer (o el estado por defecto si no ha subido ninguno), el número de presupuesto, la fecha de emisión, la fecha de validez (30 días después), la tabla de líneas y el desglose de base, IVA, retención (si aplica) y total.
2. **Given** un presupuesto editado después de generarlo una vez (se cambia una línea), **When** el freelancer vuelve a descargar el PDF, **Then** el nuevo PDF refleja los importes actualizados.

---

### User Story 3 - Configurar el perfil del freelancer (Priority: P3)

Como freelancer, quiero configurar mi nombre, NIT (o documento de identidad), datos de contacto y logo una sola vez, para que todos mis presupuestos salgan con mi marca sin tener que repetir esos datos cada vez.

**Why this priority**: Mejora la experiencia y la imagen profesional, pero el sistema puede emitir un presupuesto funcional (Historias 1 y 2) con datos de perfil incompletos o por defecto, así que no bloquea el valor principal.

**Independent Test**: Se puede probar entrando a la sección de perfil, guardando nombre, NIT, datos de contacto y logo, cerrando y reabriendo la aplicación, y comprobando que los datos siguen ahí y aparecen en un presupuesto nuevo.

**Acceptance Scenarios**:

1. **Given** que el freelancer no ha configurado su perfil, **When** entra a la sección de perfil y guarda nombre, NIT, datos de contacto y logo, **Then** esos datos quedan guardados y disponibles para su uso en cualquier presupuesto nuevo.
2. **Given** un perfil ya guardado, **When** el freelancer lo edita y guarda los cambios, **Then** los presupuestos nuevos usan los datos actualizados (los presupuestos ya emitidos no se modifican retroactivamente).

---

### User Story 4 - Mantener un catálogo de servicios reutilizables (Priority: P4)

Como freelancer, quiero mantener un catálogo de mis servicios habituales con un precio por defecto cada uno, para añadirlos a un presupuesto con un par de clics en lugar de escribirlos de cero cada vez.

**Why this priority**: Ahorra tiempo en el día a día, pero no es imprescindible para emitir un presupuesto correcto: las líneas también se pueden escribir a mano (ver Historia 1 y CL2).

**Independent Test**: Se puede probar creando un servicio en el catálogo con nombre y precio, añadiéndolo luego como línea en un presupuesto nuevo, y comprobando que el nombre y el precio se copian correctamente y pueden ajustarse sin alterar el servicio original del catálogo.

**Acceptance Scenarios**:

1. **Given** un catálogo vacío, **When** el freelancer crea un servicio con nombre y precio por defecto, **Then** el servicio queda disponible para añadirse como línea en cualquier presupuesto futuro.
2. **Given** un servicio del catálogo, **When** el freelancer lo edita o lo elimina, **Then** los presupuestos que ya usaron ese servicio conservan los importes que tenían (no se recalculan retroactivamente).

---

### Edge Cases

- CL1. Si el presupuesto no tiene ninguna línea, el sistema no permite generar el PDF y avisa al freelancer (cubierto en Historia 1, escenario 4).
- CL2. Una línea escrita a mano, sin venir del catálogo, es válida y se calcula igual que cualquier otra línea.
- CL3. Si el cliente es "particular" y el freelancer activa la retención en la fuente por error, la retención no se aplica: el tipo de cliente manda sobre la casilla de retención.
- ¿Qué pasa si se edita o elimina una línea después de haber generado el PDF? El sistema no muestra ningún indicador visible de "desactualizado"; el freelancer simplemente debe volver a descargar el PDF cuando quiera para obtener el documento con los importes actualizados (ver Historia 2, escenario 2).
- ¿Qué pasa si el freelancer intenta generar un presupuesto sin haber configurado su perfil? El PDF se genera igualmente, mostrando el estado por defecto en los campos de perfil que falten (ver Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir guardar y editar el perfil del freelancer: nombre, NIT (o documento de identidad), datos de contacto y logo.
- **FR-002**: El sistema MUST permitir crear, editar y eliminar servicios de un catálogo, cada uno con nombre y precio por defecto.
- **FR-003**: El sistema MUST permitir crear un presupuesto indicando los datos del cliente y su tipo: "empresa" o "particular". El presupuesto MUST conservar una copia de esos datos del cliente tal como estaban en el momento de crearse; editar o eliminar el cliente después MUST NOT alterar los presupuestos ya creados con él.
- **FR-004**: Cada línea de un presupuesto MUST poder originarse en el catálogo o escribirse a mano, con descripción, cantidad y precio unitario. La cantidad MUST ser un número entero mayor o igual a 1 y el precio unitario MUST ser un valor en pesos colombianos enteros mayor que 0; el sistema MUST rechazar e impedir guardar líneas con cantidad o precio unitario en cero o negativos.
- **FR-005**: El sistema MUST calcular automáticamente, en cada presupuesto: base imponible (suma de cantidad × precio unitario de todas las líneas), IVA (base imponible × 19 %), retención en la fuente (si el freelancer la activa, base imponible × 11 % o × 10 %, según elija) y total (base imponible + IVA − retención en la fuente).
- **FR-006**: Si el cliente es de tipo "particular", el sistema MUST ignorar la retención en la fuente aunque esté activada, y no aplicarla al total.
- **FR-007**: El sistema MUST numerar los presupuestos automáticamente con el formato AAAA-NNN (por ejemplo, 2026-001) en el momento de crear/guardar el presupuesto por primera vez (no al generar el PDF), reiniciando el contador cada año natural.
- **FR-008**: El sistema MUST mostrar en cada presupuesto la fecha de emisión y una fecha de validez de 30 días naturales desde la emisión.
- **FR-009**: El sistema MUST permitir editar o eliminar cualquier línea de un presupuesto mientras no se haya generado su PDF, y también después, recalculando los importes.
- **FR-010**: El sistema MUST generar un PDF descargable con el logo (o, si no hay logo, el nombre del freelancer como cabecera de texto), los datos del freelancer y del cliente, el número de presupuesto, la fecha de emisión, la fecha de validez, la tabla de líneas y el desglose de base imponible, IVA, retención (si aplica) y total.
- **FR-011**: El sistema MUST impedir la generación del PDF de un presupuesto sin líneas y MUST avisar al freelancer del motivo.
- **FR-012**: El sistema MUST conservar el perfil, el catálogo y todos los presupuestos entre sesiones, de forma que sigan disponibles la próxima vez que el freelancer abra la aplicación.
- **FR-013**: El sistema MUST mantener fijos, sin posibilidad de edición en esta versión, el tipo de IVA (19 %) y las dos opciones de retención en la fuente (11 % y 10 %).
- **FR-014**: El número de presupuesto asignado automáticamente MUST ser inmutable: el sistema no MUST ofrecer una forma de corregirlo manualmente una vez emitido.

### Key Entities *(include if feature involves data)*

- **Perfil del freelancer**: nombre, NIT o documento de identidad, datos de contacto, logo. Único por instalación; se usa como cabecera en todos los presupuestos.
- **Cliente**: nombre/razón social, datos de contacto, tipo ("empresa" o "particular"). El tipo determina si la retención en la fuente puede aplicarse. Un presupuesto conserva una copia de los datos del cliente tal como estaban al crearse; editar o eliminar el cliente después no afecta a los presupuestos ya creados con él.
- **Servicio (catálogo)**: nombre y precio por defecto. Reutilizable como plantilla al crear líneas de presupuesto; editarlo o borrarlo no afecta a presupuestos ya creados.
- **Presupuesto**: número (AAAA-NNN), fecha de emisión, fecha de validez, cliente asociado, indicador de retención en la fuente (activada/desactivada y porcentaje elegido), lista de líneas, totales calculados (base, IVA, retención, total).
- **Línea de presupuesto**: descripción, cantidad, precio unitario, origen (catálogo o manual), importe de línea (cantidad × precio unitario).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un freelancer puede crear un presupuesto completo (cliente, líneas, impuestos) y descargar su PDF en menos de 5 minutos.
- **SC-002**: El total mostrado para el presupuesto de referencia (base 2.000.000 COP, retención 11 %) es exactamente 2.160.000 COP, sin desviación de redondeo.
- **SC-003**: El 100 % de los presupuestos creados a clientes de tipo "particular" se emiten sin retención en la fuente aplicada, incluso si el freelancer intentó activarla.
- **SC-004**: El segundo presupuesto emitido dentro del mismo año recibe automáticamente el número siguiente al primero, sin intervención manual.
- **SC-005**: Al reabrir la aplicación después de cerrarla, el 100 % del perfil, el catálogo y los presupuestos previamente guardados siguen disponibles y sin pérdida de datos.

## Assumptions

- El tipo de IVA (19 %) y los dos porcentajes de retención en la fuente (11 % y 10 %) son fijos en esta versión; no son editables por el freelancer (Principio I de la constitution: simplicidad ante todo).
- Si el freelancer no ha subido un logo, el PDF se genera igualmente mostrando el nombre del freelancer como cabecera en lugar de una imagen.
- El número de presupuesto no se puede corregir manualmente una vez asignado; si hay un error, la vía es crear un presupuesto nuevo.
- Los importes se redondean al peso colombiano más cercano (sin decimales), por ser la unidad monetaria mínima habitual en Colombia. El redondeo se aplica una sola vez, al final, sobre la base imponible, el IVA, la retención y el total agregados; las líneas se suman entre sí con precisión completa antes de ese redondeo final.
- La primera vez que se abre la aplicación, con el catálogo vacío y sin perfil configurado, el freelancer puede igualmente crear un presupuesto con líneas manuales; el sistema no le obliga a configurar perfil o catálogo antes de empezar.
- Los datos (perfil, catálogo, presupuestos) se guardan únicamente en el equipo donde se usa la aplicación; no hay sincronización entre distintos equipos ni copia en la nube (coherente con "Fuera de alcance" y con el Principio V de la constitution).
- No se trata de una factura ni tiene validez como documento fiscal electrónico; es un documento comercial informativo para que el cliente conozca el precio antes de aceptar el encargo.
- No hay cuentas de usuario ni inicio de sesión: la aplicación es de un único freelancer por instalación.
- Solo se manejan pesos colombianos (COP); no hay soporte multidivisa.
- No hay descuentos por línea ni descuentos globales en esta versión.
