# Tasks: PresupuestosPro v0

**Input**: Design documents from `/specs/002-presupuestos-pro/`

**Prerequisites**: plan.md (obligatorio), spec.md (obligatorio para historias de usuario), research.md, data-model.md, contracts/, quickstart.md

**Tests**: El plan (sección Testing y Principio de negocio 6) exige pruebas automáticas con `node --test` para el motor de cálculo (`tests/calculo.test.js`) y para las rutas de la API contra SQLite en memoria (`tests/api.test.js`). El resto se verifica a mano en el navegador (Principio IV).

**Organization**: Las tareas se agrupan por historia de usuario (spec.md) para que cada una se pueda implementar y probar de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (ficheros distintos, sin dependencias pendientes)
- **[Story]**: Historia a la que pertenece (US1 a US4). Solo en fases de historia.
- Todas las rutas son relativas a la raíz del repositorio `presupuestospro/`.

## Path Conventions

- Backend: `backend/` (server.js, db.js, calculo.js, numeracion.js, rutas/)
- Frontend: `frontend/src/` (App.vue, main.js, api.js, pdf.js, estilos.css, vistas/)
- Pruebas: `tests/` en la raíz (según plan.md)

---

## Phase 1: Setup (Infraestructura compartida)

**Purpose**: Inicialización de los dos paquetes npm y de la configuración del repositorio

- [ ] T001 Crear `backend/package.json` con dependencias `express` y `better-sqlite3`, y scripts `"start": "node server.js"` y `"test": "node --test ../tests/"`
- [ ] T002 [P] Crear `frontend/package.json` con dependencias `vue`, `jspdf` y `vite`, y scripts `"dev"`, `"build"` y `"preview"` (`vite`, `vite build`, `vite preview`)
- [ ] T003 [P] Crear `frontend/index.html` (punto de entrada, `lang="es-CO"`, viewport móvil) y `frontend/vite.config.js` con proxy de `/api` a `http://localhost:3000` para desarrollo
- [ ] T004 [P] Crear `.gitignore` en la raíz con `node_modules/`, `frontend/dist/` y `backend/datos/` (el fichero SQLite nunca se versiona, según plan.md)

---

## Phase 2: Foundational (Prerrequisitos bloqueantes)

**Purpose**: Base de datos, servidor Express, motor de cálculo puro y numeración. DEBE completarse antes de cualquier historia.

**⚠️ CRITICAL**: Ninguna historia puede empezar hasta que esta fase esté completa

- [ ] T005 Crear `backend/db.js`: función `abrirBaseDatos(ruta)` que abre el fichero con better-sqlite3 (por defecto `backend/datos/presupuestospro.sqlite`, creando el directorio si no existe; acepta `':memory:'` para pruebas), activa `PRAGMA foreign_keys = ON` y crea las tablas `perfil`, `clientes`, `catalogo`, `presupuestos`, `lineas_presupuesto` (con `ON DELETE CASCADE`) y `contador_presupuestos` exactamente como en `specs/002-presupuestos-pro/data-model.md`
- [ ] T006 Crear `backend/server.js` con `crearApp(db)` (exportada para las pruebas) y arranque en `process.env.PORT || 3000` solo si se ejecuta directamente: `express.json()`, `express.static` sobre `frontend/dist/`, respuesta JSON `404` para rutas `/api/*` desconocidas y manejador de errores que devuelve `{ "error": "mensaje en español" }` con `500` sin exponer stack ni SQL. Cada historia añadirá su línea `app.use('/api/...', router)` al montar su router
- [ ] T007 [P] Crear `backend/calculo.js` con funciones puras según `specs/002-presupuestos-pro/contracts/calculo.md`: `calcularBaseImponible`, `calcularIva` (19 %), `calcularRetencion` (0 si cliente `particular` o retención desactivada; 11 % o 10 % en otro caso), `calcularTotal`, `calcularPresupuesto` y `redondear` (`Math.round`, único punto de redondeo). Sin importar Express, SQLite ni el DOM
- [ ] T008 Crear `backend/numeracion.js` con `siguienteNumero(db, fecha)` que, dentro de una transacción, incrementa `ultimo_numero` de `contador_presupuestos` para el año de `fecha` (creando la fila con 0 si no existe) y devuelve `AAAA-NNN` con NNN de tres dígitos (FR-007, SC-004). Depende de T005
- [ ] T009 [P] Crear `frontend/src/api.js`: cliente `fetch` con funciones por recurso (`perfil`, `clientes`, `catalogo`, `presupuestos`, líneas) que envuelven `JSON`, y lanzan `Error` con el mensaje `error` de la respuesta cuando el status no es 2xx
- [ ] T010 [P] Crear `frontend/src/estilos.css` mobile-first: gutter lateral de 16 px, sin scroll horizontal en la página, botones y campos táctiles de al menos 44 px, tabla de líneas que se adapta a una columna en móvil, variables de color en `:root`
- [ ] T011 Crear `frontend/src/main.js` (monta la app Vue e importa `estilos.css`) y `frontend/src/App.vue` (shell con barra de navegación inferior o superior con pestañas Presupuestos, Clientes, Catálogo y Perfil, y un contenedor para la vista activa; las pestañas se añaden en cada historia)

**Checkpoint**: Fundación lista. `node --test` puede ejecutarse sobre `backend/calculo.js` y el servidor arranca vacío.

---

## Phase 3: User Story 1 - Crear un presupuesto con impuestos calculados automáticamente (Priority: P1) 🎯 MVP

**Goal**: Crear un presupuesto para un cliente, añadir líneas (manuales en esta fase), y ver base, IVA, retención y total calculados automáticamente, con retención que se aplica solo a clientes de tipo empresa.

**Independent Test**: Cliente "empresa", dos líneas (1.500.000 y 500.000 COP), retención 11 % → base 2.000.000, IVA 380.000, retención −220.000, total 2.160.000. Cambiar a 10 % → total 2.180.000. Marcar cliente "particular" → total 2.380.000. Sin líneas, el total base es 0.

### Tests for User Story 1 (requeridas por plan.md)

> Escribir estas pruebas antes de la implementación de sus módulos y comprobar que fallan.

- [ ] T012 [P] [US1] Crear `tests/calculo.test.js` con los cinco casos de `specs/002-presupuestos-pro/contracts/calculo.md` (escenario de referencia 2.000.000 + 11 % → total 2.160.000; cambio a 10 % → 2.180.000; cliente particular → retención 0 y total 2.380.000; lista vacía → base 0; redondeo único al final sobre un caso con decimales) usando `node:test` y `node:assert`
- [ ] T013 [US1] Crear `tests/api.test.js` (primera parte) que arranca `crearApp(abrirBaseDatos(':memory:'))` en un puerto efímero y prueba con `fetch` las rutas de clientes y presupuestos: copia del cliente congelada tras editar o borrar el cliente (FR-003), número `AAAA-NNN` consecutivo dentro del año (SC-004), `fechaValidez` = `fechaEmision` + 30 días (FR-008), `retencionPorcentaje` distinto de 11 o 10 rechazado con `400` (FR-013), y líneas con cantidad o precio ≤ 0 o no enteros rechazadas con `400` en español (FR-004)

### Implementation for User Story 1

- [ ] T014 [P] [US1] Crear `backend/rutas/clientes.js` con `GET /`, `POST /`, `PUT /:id` y `DELETE /:id` según `specs/002-presupuestos-pro/contracts/api.md`, validando que `tipo` sea `empresa` o `particular` (`400` si no). Montarlo en `backend/server.js` bajo `/api/clientes`
- [ ] T015 [P] [US1] Crear `backend/rutas/presupuestos.js` con `GET /` (resumen con total calculado), `GET /:id` (presupuesto completo con `lineas[]` y `totales` desde `calcularPresupuesto`), `POST /` (copia `cliente_nombre`, `cliente_contacto`, `cliente_tipo` desde `clientes`, asigna `numero` con `siguienteNumero`, calcula `fecha_emision` y `fecha_validez`, no acepta `numero` en el body) y `PUT /:id` (acepta `clienteTipo` —`empresa` o `particular`—, `retencion_activada` y `retencion_porcentaje` —validando 11 o 10—; recalcula totales tras el cambio). Montarlo en `backend/server.js` bajo `/api/presupuestos`
- [ ] T016 [US1] Añadir a `backend/rutas/presupuestos.js` las rutas de líneas `POST /:id/lineas`, `PUT /:id/lineas/:lineaId` y `DELETE /:id/lineas/:lineaId`, con validación de `cantidad` entero ≥ 1 y `precioUnitario` entero > 0 (`400` con mensaje en español, FR-004), y devolviendo la línea o `204` con totales recalculados. Depende de T015
- [ ] T017 [US1] Completar `tests/api.test.js` con las pruebas de la fase US1 que faltan: las líneas se pueden editar y borrar y los totales cambian (FR-009), y el borrado de un cliente o de un servicio no toca presupuestos existentes. Depende de T014, T015 y T016
- [ ] T018 [P] [US1] Crear `frontend/src/vistas/ClientesView.vue`: lista de clientes, formulario de alta y edición (nombre, contacto, tipo con selector "Empresa" / "Particular") y borrado con confirmación, usando `frontend/src/api.js`
- [ ] T019 [US1] Crear `frontend/src/vistas/PresupuestosView.vue` con dos modos: listado de presupuestos (número, fecha, cliente, total) y formulario de creación (selector de cliente, casilla "Aplicar retención en la fuente" y selector 11 % / 10 %). Al guardar llama a `POST /api/presupuestos`
- [ ] T020 [US1] Ampliar `PresupuestosView.vue` con el detalle del presupuesto: editor de líneas (descripción, cantidad, precio unitario, añadir/editar/eliminar), selector de tipo de cliente ("Empresa" / "Particular") que permite cambiar `clienteTipo` mediante `PUT /api/presupuestos/:id`, y panel de totales (base, IVA, retención, total) con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`. Cambiar la retención o el tipo de cliente llama a `PUT` y refresca totales. Si el cliente es "particular", la casilla de retención se muestra desactivada con la nota de que no aplica (CL3). Depende de T019
- [ ] T021 [US1] Añadir las pestañas Presupuestos y Clientes en `frontend/src/App.vue` y montar `ClientesView.vue` y `PresupuestosView.vue` como vistas activas

**Checkpoint**: US1 completa y probada de forma independiente (escenarios 1 a 3 de spec.md y SC-002, SC-003 verificados en el navegador)

---

## Phase 4: User Story 2 - Descargar el presupuesto como PDF listo para enviar (Priority: P2)

**Goal**: Generar en el navegador un PDF con cabecera del freelancer (logo o nombre), número, fechas, cliente, tabla de líneas y desglose de importes. Bloquear el PDF si no hay líneas.

**Independent Test**: Sobre el presupuesto de US1, pulsar "Descargar PDF" y comprobar el contenido. Sin líneas, la app muestra el aviso de FR-011 y no genera nada. Tras editar una línea, el nuevo PDF refleja los importes nuevos.

### Implementation for User Story 2

- [ ] T022 [P] [US2] Crear `frontend/src/pdf.js` con `generarPdf(presupuesto, perfil)` usando jsPDF (en `frontend/package.json` según plan.md): cabecera con logo (si `perfil.logoBase64`) o con el nombre del freelancer como texto, datos del freelancer (NIT, contacto), cliente, número, fecha de emisión, fecha de validez, tabla de líneas (descripción, cantidad, precio unitario, importe) y desglose de base, IVA, retención (solo si aplica) y total. Importes con formato COP entero, sin decimales. Nombre del fichero `presupuesto-<numero>.pdf`
- [ ] T023 [US2] Añadir en `frontend/src/vistas/PresupuestosView.vue` el botón "Descargar PDF": si `lineas.length === 0` muestra el aviso "Añade al menos una línea antes de descargar el PDF" y no llama a jsPDF (FR-011); si no, pide `GET /api/presupuestos/:id` y `GET /api/perfil` y llama a `generarPdf`. Depende de T021 (vista ya montada) y de T022

**Checkpoint**: US2 completa (escenarios 1 y 2 de spec.md; quickstart pasos 7 y 8 verificados manualmente)

---

## Phase 5: User Story 3 - Configurar el perfil del freelancer (Priority: P3)

**Goal**: Guardar nombre, NIT, contacto y logo una sola vez, y reutilizarlos en el PDF.

**Independent Test**: Guardar el perfil, recargar la app y comprobar que los datos siguen ahí y aparecen en el PDF de un presupuesto nuevo.

### Tests for User Story 3

- [ ] T024 [US3] Añadir a `tests/api.test.js` las pruebas de perfil: `GET /api/perfil` devuelve `{}` cuando nunca se ha guardado, y `PUT` seguido de `GET` devuelve los mismos datos (FR-001, FR-012). Depende de T017

### Implementation for User Story 3

- [ ] T025 [P] [US3] Crear `backend/rutas/perfil.js` con `GET /` (devuelve `{}` si la fila `id = 1` no existe) y `PUT /` (upsert de la fila única `id = 1` con `nombre`, `nit`, `contacto`, `logoBase64`). Montarlo en `backend/server.js` bajo `/api/perfil`
- [ ] T026 [P] [US3] Crear `frontend/src/vistas/PerfilView.vue` con formulario de nombre, NIT, contacto y logo (selector de imagen convertido a base64 con `FileReader`, con aviso si el fichero supera 1 MB), que guarda con `PUT /api/perfil`
- [ ] T027 [US3] Añadir la pestaña Perfil en `frontend/src/App.vue`. Depende de T011 y T026

**Checkpoint**: US3 completa (escenarios 1 y 2 de spec.md; quickstart paso 4)

---

## Phase 6: User Story 4 - Mantener un catálogo de servicios reutilizables (Priority: P4)

**Goal**: Gestionar un catálogo de servicios con precio por defecto y copiarlos como líneas de un presupuesto, sin que los cambios posteriores del catálogo alteren líneas ya creadas.

**Independent Test**: Crear un servicio, añadirlo como línea a un presupuesto nuevo, editar o borrar el servicio y comprobar que la línea conserva su descripción e importe.

### Tests for User Story 4

- [ ] T028 [US4] Añadir a `tests/api.test.js` las pruebas de catálogo: `precioDefecto` ≤ 0 o no entero rechazado con `400`, y editar o borrar un servicio no cambia `descripcion` ni `precio_unitario` de líneas creadas a partir de él (FR-002, Historia 4 escenario 2). Depende de T024

### Implementation for User Story 4

- [ ] T029 [P] [US4] Crear `backend/rutas/catalogo.js` con `GET /`, `POST /`, `PUT /:id` y `DELETE /:id` según `contracts/api.md`, validando `precioDefecto` entero > 0. Montarlo en `backend/server.js` bajo `/api/catalogo`
- [ ] T030 [P] [US4] Crear `frontend/src/vistas/CatalogoView.vue` con lista, alta, edición y borrado de servicios (nombre y precio por defecto)
- [ ] T031 [US4] Añadir en `frontend/src/vistas/PresupuestosView.vue` el selector "Añadir desde catálogo": copia `nombre` y `precioDefecto` a una nueva línea con `origen: 'catalogo'` y `servicioId`, que después se puede editar sin tocar el servicio. Depende de T020 y T029
- [ ] T032 [US4] Añadir la pestaña Catálogo en `frontend/src/App.vue`. Depende de T030

**Checkpoint**: US4 completa (escenarios 1 y 2 de spec.md; quickstart paso 5)

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Verificación de criterios de éxito y de despliegue

- [ ] T033 Ejecutar `node --test tests/` desde `backend/` y comprobar que todas las pruebas de `calculo.test.js` y `api.test.js` pasan, incluido el total exacto de 2.160.000 COP (SC-002)
- [ ] T034 [P] Revisar que `backend/db.js` crea `backend/datos/` automáticamente y que el fichero `.sqlite` no entra en git (`git check-ignore backend/datos/presupuestospro.sqlite`)
- [ ] T035 [P] Revisar que no hay claves, secretos ni rutas absolutas en el código; la ruta de la base de datos y el puerto se leen de variables de entorno con valores por defecto (Principio V)
- [ ] T036 Verificar en modo de emulación móvil (y, si es posible, en un teléfono real) que formularios, botones y tabla de líneas funcionan sin scroll horizontal (quickstart paso 9)
- [ ] T037 Ejecutar la validación de persistencia de quickstart paso 10: parar y reiniciar el backend y comprobar que perfil, clientes, catálogo y presupuestos siguen disponibles. Bloquea el lanzamiento si falla en el proveedor elegido (decisión de negocio 2)
- [ ] T038 Recorrer quickstart pasos 4 a 8 de principio a fin y registrar cualquier desviación respecto a lo esperado en spec.md (SC-001: presupuesto completo y PDF en menos de 5 minutos). Verificar informalmente que las respuestas de la API se perciben instantáneas (objetivo < 200 ms, plan.md) y que el PDF se genera en menos de 2 segundos en emulación de móvil de gama media

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias
- **Foundational (Phase 2)**: Depende de Setup. BLOQUEA todas las historias
- **User Stories (Phase 3+)**: Dependen de Foundational. US1 es el MVP. US2 depende de US1 (necesita presupuestos con líneas). US3 es independiente salvo que su PDF lo usa US2 (el PDF funciona sin perfil, con valores por defecto). US4 depende de US1 (añade líneas a presupuestos)
- **Polish (Final Phase)**: Depende de las historias que se quieran entregar

### User Story Dependencies

- **US1 (P1)**: Empieza tras Foundational. Sin dependencias de otras historias
- **US2 (P2)**: Empieza tras US1 (T021)
- **US3 (P3)**: Empieza tras Foundational. Su pieza de PDF se integra en US2
- **US4 (P4)**: Empieza tras US1 (T020)

### Within Each User Story

- Pruebas (si aparecen) escritas y en rojo antes de la implementación
- Rutas de la API antes que la vista que las consume
- Ficheros que se editan en la misma tarea se ejecutan en orden, nunca en paralelo

### Parallel Opportunities

- Setup: T002, T003 y T004 en paralelo
- Foundational: T007, T009 y T010 en paralelo (T008 espera a T005)
- US1: T012, T014 y T015 en paralelo; T018 en paralelo con las tareas de backend
- US3: T025, T026 en paralelo
- US4: T029, T030 en paralelo
- Historias distintas pueden avanzar en paralelo tras Foundational si hay varias personas

---

## Parallel Example: User Story 1

```bash
# Pruebas y rutas independientes entre sí:
Task: "T012 Crear tests/calculo.test.js con los casos de contracts/calculo.md"
Task: "T014 Crear backend/rutas/clientes.js"
Task: "T015 Crear backend/rutas/presupuestos.js (cabecera y totales)"
Task: "T018 Crear frontend/src/vistas/ClientesView.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (bloquea todas las historias)
3. Completar Phase 3: User Story 1
4. **PARAR y validar**: escenarios 1 a 3 de Historia 1 y SC-002 y SC-003
5. Desplegar o mostrar si está listo

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 → cálculo de impuestos (MVP)
3. US2 → PDF descargable
4. US3 → perfil con marca
5. US4 → catálogo de servicios
6. Polish → validación de persistencia (bloqueante para lanzar) y quickstart completo

---

## Notes

- [P] = ficheros distintos, sin dependencias pendientes
- [Story] vincula cada tarea con su historia de spec.md para trazabilidad
- Cada historia debe poder probarse por separado en el checkpoint correspondiente
- Commit tras cada tarea o grupo lógico
- Evitar: tareas vagas, dos tareas que editan el mismo fichero en paralelo, dependencias entre historias que rompan la independencia

## Registro de correcciones aplicadas (speckit-analyze 2026-10-02)

- **Ubicación de pruebas**: quickstart.md corregido de `backend/tests/` a `tests/` (raíz), alineado con plan.md.
- **jsPDF**: quickstart.md corregido de "CDN público" a "dependencia npm empaquetada con Vite", alineado con plan.md.
- **Frontend**: contracts/api.md corregido de "sin framework" a "Vue 3 + Vite", alineado con plan.md y research.md §4.
- **Tipo de cliente editable en presupuesto**: contracts/api.md, T015 y T020 actualizados para permitir cambiar `clienteTipo` en `PUT /api/presupuestos/:id`, habilitando el escenario de aceptación 3 de US1.
- **FK `cliente_id`**: data-model.md aclara que `presupuestos.cliente_id` es referencia lógica sin constraint FK, permitiendo borrar clientes sin error de SQLite.
- **`retencion_porcentaje` default**: data-model.md aclara que la columna siempre está presente con DEFAULT 11, incluso cuando la retención está desactivada.
- **Versión**: plan.md corregido de "v1" a "v0".
- **FR-010 logo por defecto**: spec.md aclara inline que el fallback es "el nombre del freelancer como cabecera de texto".
- **Performance**: T038 incorpora validación informal de los objetivos de rendimiento del plan (API < 200ms, PDF < 2s).
