# Design Brief: PresupuestosPro v0

Brief de UI/UX derivado de `spec.md` y `research.md`, pensado como entrada
para generar un prototipo visual (Artifact de tipo Design). No sustituye a
ninguno de esos documentos; solo traduce sus requisitos a decisiones de
pantalla, componentes y flujo.

## 1. Quién usa esto y en qué contexto

Un freelancer colombiano, sin perfil técnico, que abre la app desde el
celular o el computador para armar un presupuesto rápido y mandarlo por
WhatsApp/correo como PDF. Mobile-first: la mayoría de los formularios deben
usarse cómodamente con el pulgar.

## 2. Mapa de pantallas (SPA, Vue Router)

1. **Presupuestos** (vista principal / home)
   - Lista de presupuestos existentes: número (AAAA-NNN), cliente, fecha de
     emisión, total, estado de validez (vigente / vencido, calculado por
     fecha, no un campo explícito).
   - Botón primario "Nuevo presupuesto".
2. **Editor de presupuesto** (crear/editar)
   - Selector de cliente (buscar existente o crear uno nuevo inline).
   - Toggle "aplica retención en la fuente" + selector 11 %/10 %, deshabilitado
     automáticamente si el cliente es "particular" (con explicación visible
     de por qué, ver FR-006/CL3).
   - Tabla de líneas: añadir desde catálogo (autocompletar) o a mano
     (descripción, cantidad, precio unitario). Cantidad entera ≥ 1, precio
     entero > 0; validación inline inmediata si se intenta 0 o negativo.
   - Panel de totales en tiempo real: base, IVA (19 %, fijo), retención (si
     aplica), total — se recalcula en cada cambio de línea (reactividad Vue).
   - Acciones: "Guardar" (asigna número AAAA-NNN la primera vez, FR-007),
     "Descargar PDF" (deshabilitado si no hay líneas, FR-011, con mensaje
     explicando por qué).
3. **Clientes**
   - Lista + alta/edición: nombre/razón social, contacto, tipo (empresa /
     particular) como control muy visible (determina si la retención puede
     aplicarse).
4. **Catálogo de servicios**
   - Lista + alta/edición: nombre, precio por defecto. Acción "añadir a
     presupuesto" disponible desde aquí y desde el editor de presupuesto.
5. **Perfil del freelancer**
   - Formulario único: nombre, NIT/documento, contacto, logo (subida de
     imagen con preview; si no hay logo, mostrar placeholder con el nombre,
     igual que en el PDF — FR-001, Assumptions).

## 3. Reglas de UI que vienen directo de la spec (no son libres)

- El tipo de cliente manda sobre la casilla de retención: si es
  "particular", el control de retención se ve deshabilitado/inactivo, no
  oculto — el freelancer debe entender por qué no puede activarla (CL3).
- No hay indicador visible de "presupuesto desactualizado" tras generar el
  PDF y editar después (decisión explícita de la clarificación 5). El botón
  "Descargar PDF" siempre está disponible y regenera con los datos actuales.
- El número de presupuesto (AAAA-NNN) se muestra pero nunca es un campo
  editable — ni siquiera en el editor (FR-014).
- IVA (19 %) y los dos porcentajes de retención (11 %/10 %) son valores fijos
  en esta versión: se muestran como texto/etiqueta, no como campos
  numéricos libres (FR-013).
- Los importes en pantalla se muestran redondeados a peso colombiano entero
  (sin decimales) solo en base/IVA/retención/total; el cálculo interno usa
  precisión completa (no es una regla visual libre, viene de la
  clarificación de redondeo).

## 4. Tono visual

Profesional pero cercano — el freelancer lo usa para dar una buena imagen
ante su cliente, pero la herramienta en sí debe sentirse simple y rápida,
no corporativa ni sobrecargada. Paleta neutra que no compita con el logo
que cada freelancer sube (el logo es lo que personaliza la marca, no la UI
de la app). Tipografía legible en pantallas pequeñas, inputs grandes
(objetivo táctil ≥ 44px), poco texto de ayuda — los mensajes de validación
(cantidad/precio en cero, sin líneas para generar PDF) deben ser cortos y
accionables.

## 5. Qué NO diseñar en esta fase

Fuera de alcance según `spec.md` (Assumptions): no hay login/cuentas
múltiples, no hay selector de moneda, no hay descuentos por línea ni
globales, no hay sincronización multi-dispositivo visible en la UI (aunque
técnicamente ahora los datos vivan en un servidor, la experiencia sigue
siendo "un freelancer, una instalación").
