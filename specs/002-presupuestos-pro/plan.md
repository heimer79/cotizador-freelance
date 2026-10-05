# Implementation Plan: PresupuestosPro v0

**Branch**: `002-presupuestos-pro` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-presupuestos-pro/spec.md`

## Summary

PresupuestosPro v0 es una aplicación web que un freelancer colombiano abre en
su navegador —móvil o escritorio— para crear presupuestos con cálculo
automático de IVA y retención en la fuente, numerarlos por año y descargarlos
como PDF. Por decisión explícita del usuario, el backend se construye con
**Node.js + Express** y los datos (perfil, clientes, catálogo, presupuestos)
se guardan en un fichero **SQLite** en el propio servidor. No hay cuentas de
usuario ni multiusuario: toda instalación sirve a un único freelancer. El
frontend se construye con **Vue 3 + Vite**, hablando con ese backend por una
API HTTP sencilla en vez de leer `localStorage`.

## Decisiones de negocio clave

1. **El dato ya no vive "en el navegador del freelancer", vive en el
   servidor donde se despliega la app.**
   Con Express + SQLite, el fichero de base de datos está en el servidor,
   no en el dispositivo del freelancer. **Consecuencia práctica para el
   negocio**: a cambio de un paso más de infraestructura, se gana lo que
   antes era una limitación aceptada — el freelancer puede entrar desde el
   celular y desde el computador y ver los mismos presupuestos, porque los
   datos ya no están atados a un solo navegador. La contrapartida es que
   **ahora hay un servidor que mantener y un sitio concreto donde vive el
   fichero de datos**: si ese servidor se pierde sin backup, se pierden
   todos los presupuestos del freelancer. Esto no es una base de datos "en
   la nube" en el sentido de un servicio gestionado (no hay Postgres/Mongo
   como servicio, no hay multiusuario, no hay nada que escalar); es un
   fichero SQLite plano en el disco del propio servidor de la app — la
   opción más simple dentro de "tener un backend", que es justo lo que se
   pidió.

2. **Publicar "enseguida" ya no significa subir ficheros a un hosting
   estático: significa desplegar un proceso Node que corre todo el
   tiempo.**
   Esto es la consecuencia directa de elegir Express: alguien tiene que
   ejecutar `node server.js` de forma continua, no solo servir ficheros.
   **Decisión de despliegue**: se documenta como asunción (ver Technical
   Context) un proveedor que ofrezca un plan simple con **disco
   persistente** — Render o Fly.io son el ejemplo recomendado, porque
   permiten desplegar una app Node con un volumen persistente para el
   fichero `.sqlite` sin administrar un servidor a mano. **Punto crítico de
   negocio**: si en el despliegue elegido el disco no es persistente entre
   reinicios/redeploys (como ocurre en plataformas pensadas solo para
   funciones sin estado), el fichero SQLite se borra y se pierden todos los
   presupuestos. Esto queda marcado como riesgo a validar antes de lanzar
   (ver el paso de validación en `quickstart.md`).

3. **El PDF sigue generándose en el navegador del freelancer, no en el
   servidor.**
   Aunque ahora hay un servidor, generar el PDF ahí añadiría una llamada de
   red de ida y vuelta para una tarea que no necesita datos del servidor
   más allá de los que la página ya tiene cargados. Se mantiene la decisión
   original: jsPDF en el navegador. **Consecuencia práctica**: el PDF se
   descarga al instante, sin depender de que el servidor esté rápido en ese
   momento.

4. **El frontend pasa de HTML/JS plano a Vue 3 con Vite.**
   Decisión explícita del usuario: en vez de mantener vanilla JS, se usa
   Vue 3 (Composition API) con Vite como build tool, por ser el framework
   mejor valorado para el tamaño de esta app (ver research.md, sección 4).
   La interfaz sigue siendo una SPA mobile-first que consume la misma API
   HTTP de Express. **Consecuencia práctica**: se suma una segunda decisión
   de complejidad (build step, componentes, reactividad de Vue) encima de
   la ya tomada (backend con base de datos), a cambio de una UI más
   mantenible a medida que crezcan las vistas (presupuestos, catálogo,
   clientes).

5. **SQLite, no un motor de base de datos cliente-servidor (Postgres/MySQL
   como servicio).**
   Para un único freelancer por instalación, sin concurrencia real, SQLite
   (un solo fichero, sin proceso de base de datos separado que administrar)
   cumple el mismo papel que un motor más pesado sin añadir una pieza más
   de infraestructura (un servidor de base de datos aparte, con su propio
   usuario/contraseña). **Consecuencia práctica**: un único proceso Node y
   un único fichero de datos; nada más que mantener en producción.

6. **Los cálculos de dinero siguen siendo la única pieza con pruebas
   automáticas obligatorias; el resto se valida a mano.**
   Esto no cambia con el cambio de stack: el riesgo real (SC-002, un total
   exacto sin desviación de redondeo) sigue estando en el cálculo, no en la
   capa de transporte HTTP. Se mantiene en un módulo puro, ahora usado
   desde las rutas de Express en vez de desde una vista del navegador.

## Technical Context

**Language/Version**: JavaScript (Node.js LTS reciente) en el backend;
JavaScript (ES2022) con **Vue 3** (Composition API) y **Vite** en el
frontend.

**Primary Dependencies**:
- Backend: **Express** (servidor HTTP y rutas de la API), **better-sqlite3**
  (driver síncrono de SQLite para Node — se prefiere sobre drivers
  asíncronos porque es más simple de usar correctamente y el volumen de
  datos de un único freelancer no tiene problema de rendimiento con
  llamadas síncronas).
- Frontend: **Vue 3** (framework de UI), **Vite** (build tool y servidor de
  desarrollo), **jsPDF** (generación de PDF en el navegador).

**Storage**: Fichero **SQLite** (`datos/presupuestospro.sqlite`) en el
servidor, con un esquema de tablas para perfil, clientes, catálogo,
presupuestos y líneas (ver `data-model.md`). Un único fichero, sin servidor
de base de datos aparte.

**Testing**: `node --test` para dos capas:
1. El motor de cálculo de impuestos y totales (funciones puras, igual que
   antes).
2. Las rutas de la API de Express, usando una base de datos SQLite temporal
   en memoria (`:memory:`) para no tocar el fichero real en cada ejecución
   de pruebas.
El resto de criterios de aceptación (formularios, PDF, navegación) se
verifica manualmente en el navegador según el Principio IV de la
constitution.

**Target Platform**: Navegador web móvil y de escritorio como cliente;
servidor Node.js desplegado en un proveedor con **disco persistente** (se
asume Render o Fly.io como opción recomendada — ver decisión de negocio 2;
pendiente de confirmación final antes del lanzamiento).

**Project Type**: Aplicación web cliente-servidor: backend Express + SQLite
expuesto como API HTTP, frontend de una sola página (SPA) con Vue 3 + Vite
que consume esa API.

**Performance Goals**: Respuesta de la API bajo 200ms para cualquier
operación (lectura/escritura de un único freelancer sobre un fichero
SQLite local al propio proceso, sin red externa de por medio); generación
de PDF en el navegador en menos de 2 segundos en un móvil de gama media.

**Constraints**: Debe funcionar completo en pantalla de móvil; el servidor
debe desplegarse con disco persistente para no perder el fichero SQLite en
cada reinicio/redeploy; sin cuentas de usuario ni autenticación (una
instalación = un freelancer, tal como pide la spec); sin servicios de base
de datos gestionados en la nube (SQLite es un fichero local al servidor,
no un servicio aparte).

**Scale/Scope**: Un freelancer por instalación del servidor; decenas o como
mucho un par de cientos de clientes, servicios y presupuestos. Sin
requisitos de concurrencia multiusuario — la API no necesita autenticación
porque solo la usa el freelancer propietario de esa instalación.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento |
|---|---|
| I. Simplicidad ante todo | ⚠️ Un solo servicio desplegable (Express sirve el build estático de Vite, sin un segundo proceso aparte), una sola base de datos en fichero (SQLite, sin motor de base de datos separado), sin colas ni microservicios, sin autenticación innecesaria. El frontend usa Vue 3 + Vite (decisión explícita del usuario, documentada en research.md sección 4) en vez de HTML/JS plano; es la única desviación de "mínima pieza posible" y queda registrada en Complexity Tracking. |
| II. Idioma y mercado | ✅ Interfaz, mensajes y PDF en español de Colombia; única moneda COP; IVA 19 % y retención 11 %/10 % fijos como pide la spec. |
| III. Cero alcance fantasma | ✅ No se añade login, multiusuario, multidivisa ni descuentos — nada que no esté en spec.md. El backend expone solo las operaciones que las vistas necesitan. |
| IV. Verificable por una persona no técnica | ✅ Los criterios de éxito (SC-001 a SC-005) siguen siendo comprobables usando la interfaz, sin mirar la base de datos directamente. |
| V. Datos del usuario con respeto | ✅ Se siguen pidiendo solo los datos de perfil/cliente/línea de la spec. No hay claves ni secretos de terceros en el código (no hay servicios externos de pago); si en el despliegue se necesitara alguna variable de entorno (p. ej. puerto, ruta del fichero SQLite), vive en configuración del servidor, nunca en el repositorio. |

**Resultado**: Una desviación registrada (frontend con framework, ver
Complexity Tracking); el resto sin violaciones. Hay además un punto a
vigilar que no es de simplicidad de diseño sino de despliegue: SQLite
necesita un disco persistente en el proveedor elegido (ver decisión de
negocio 2 y el paso de validación en `quickstart.md`); eso es una condición
de la infraestructura de hosting, no una pieza adicional que el plan haya
introducido.

## Project Structure

### Documentation (this feature)

```text
specs/002-presupuestos-pro/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── server.js                 # Arranque de Express y carga de rutas
├── db.js                      # Conexión a SQLite (better-sqlite3) y creación del esquema si no existe
├── rutas/
│   ├── perfil.js               # GET/PUT del perfil del freelancer (Historia 3)
│   ├── clientes.js             # CRUD de clientes (parte de Historia 1)
│   ├── catalogo.js             # CRUD del catálogo de servicios (Historia 4)
│   └── presupuestos.js         # CRUD de presupuestos y líneas; asigna número al crear (Historias 1 y 2)
├── calculo.js                  # Funciones puras: base, IVA, retención, total, redondeo final (sin Express ni SQLite, 100% testeable)
├── numeracion.js                # Asignación del número AAAA-NNN al guardar un presupuesto por primera vez
└── datos/
    └── presupuestospro.sqlite  # Fichero de base de datos (no se versiona en git)

frontend/
├── index.html                  # Punto de entrada de Vite
├── vite.config.js              # Configuración de build/dev server
├── src/
│   ├── main.js                  # Arranque de la app Vue y montaje en el DOM
│   ├── App.vue                  # Shell de la SPA (layout y enrutado entre vistas)
│   ├── api.js                   # Cliente HTTP ligero (fetch) hacia la API de Express
│   ├── pdf.js                   # Construcción del PDF con jsPDF a partir de un presupuesto ya calculado
│   ├── estilos.css              # Estilos mobile-first; un solo archivo (sin preprocesador)
│   └── vistas/
│       ├── PerfilView.vue        # Vista de configuración del perfil del freelancer
│       ├── ClientesView.vue      # Alta/edición de clientes
│       ├── CatalogoView.vue      # CRUD del catálogo de servicios
│       └── PresupuestosView.vue  # Crear/editar presupuesto, líneas, descarga de PDF

tests/
├── calculo.test.js            # Pruebas automáticas (node --test) del motor de cálculo e impuestos
└── api.test.js                 # Pruebas automáticas de las rutas de Express contra SQLite en memoria
```

**Structure Decision**: `backend/` y `frontend/` son carpetas de código
separadas por claridad, pero se despliegan como **un único servicio**: en
producción, Express sirve el build estático generado por Vite
(`frontend/dist/`) con `express.static`, además de exponer la API bajo
`/api/*`. No hay un segundo proceso, ni un segundo hosting, ni nada que
coordinar en el despliegue — es el mismo patrón de "un solo servicio
(servidor+frontend)" validado como simple, solo que ahora el frontend tiene
un paso de build previo (Vite) en vez de ser servido tal cual.
`backend/calculo.js` se mantiene sin dependencias de Express ni de la base
de datos para poder probarse con `node --test` de forma aislada.

## Complexity Tracking

| Violación | Por qué es necesaria | Alternativa más simple descartada |
|---|---|---|
| Frontend con framework (Vue 3) y build step (Vite) en vez de HTML/JS plano | Decisión explícita del usuario tras valorar los frameworks de frontend mejor valorados (ver research.md, sección 4); prioriza mantenibilidad y reactividad de la UI sobre la mínima pieza posible, de forma análoga a cuando ya priorizó backend con base de datos sobre `localStorage`. | HTML/CSS/JS vanilla sin build (decisión original del plan) — se descartó porque el usuario pidió explícitamente un framework de frontend bien valorado. |
