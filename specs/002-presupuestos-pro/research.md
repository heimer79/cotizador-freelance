# Research: PresupuestosPro v0

No quedan `NEEDS CLARIFICATION` pendientes de la spec: la spec resolvió sus
ambigüedades en la sesión de clarificación del 2026-10-02. El usuario además
fijó explícitamente el stack de backend (Node + Express + SQLite) tras ver
la primera versión de este plan (que proponía una app 100% cliente sin
backend). Esta fase documenta las decisiones técnicas derivadas de ese
stack, y las alternativas descartadas.

## 1. Persistencia de datos: SQLite en el servidor frente a alternativas

- **Decision**: Un único fichero SQLite en el servidor (`backend/datos/
  presupuestospro.sqlite`), accedido con **better-sqlite3** (driver
  síncrono), con tablas para perfil, clientes, catálogo, presupuestos y
  líneas.
- **Rationale**: Es la opción más simple dentro de "tener un backend con
  base de datos", que es el requisito explícito del usuario. No requiere
  levantar un proceso de base de datos aparte (como sí exigiría
  Postgres/MySQL), ni gestionar usuario/contraseña de conexión, ni un
  servicio gestionado en la nube. Para un único freelancer por instalación,
  sin concurrencia real, el driver síncrono es más simple de usar
  correctamente que uno asíncrono (sin callbacks/promesas anidadas) y no
  tiene problema de rendimiento con este volumen de datos.
- **Alternatives considered**:
  - *PostgreSQL/MySQL como servicio gestionado*: añadiría un segundo
    servicio a desplegar y pagar, pensado para concurrencia y volumen que
    esta app no tiene (un freelancer por instalación). Se descarta por
    desproporcionado.
  - *Driver asíncrono de SQLite (`node:sqlite` experimental o `sqlite3`)*:
    válido también, pero añade manejo de promesas/callbacks sin beneficio
    real aquí, ya que no hay operaciones largas ni E/S bloqueante
    significativa a esta escala. Se prefiere el driver síncrono por
    simplicidad de código.
  - *Seguir con `localStorage` en el navegador (plan original)*: ya no
    cumple el requisito explícito del usuario de tener backend con Express
    y SQLite; quedó documentado como la opción más simple posible, pero el
    usuario decidió priorizar acceso multi-dispositivo sobre esa
    simplicidad.

## 2. Backend HTTP: Express frente a alternativas

- **Decision**: **Express** como servidor HTTP y enrutador de la API REST
  interna que consume el frontend.
- **Rationale**: Es el framework de Node más extendido y simple para
  exponer rutas CRUD sencillas; no se necesita nada de lo que ofrecen
  frameworks más opinionados (NestJS, etc.) para cuatro recursos (perfil,
  clientes, catálogo, presupuestos). Fue, además, la elección explícita del
  usuario.
- **Alternatives considered**:
  - *`http` nativo de Node sin framework*: evitaría una dependencia, pero
    reimplementar enrutado, parseo de body JSON y manejo de errores a mano
    añade más código propio que usar Express. Se descarta por no aportar
    simplicidad real.
  - *Framework más completo (NestJS, Fastify con plugins, etc.)*: resuelve
    problemas de escalado (inyección de dependencias, validación
    declarativa) que esta API de cuatro recursos no tiene. Se descarta por
    el Principio I.

## 3. Despliegue: necesidad de disco persistente

- **Decision**: Documentar como asunción de despliegue un proveedor que
  soporte un **disco/volumen persistente** para el proceso Node — Render o
  Fly.io son el ejemplo recomendado por tener un plan de despliegue simple
  (sin administrar un servidor Linux a mano) y soporte de volúmenes
  persistentes a bajo costo. La elección final de proveedor no es una
  decisión de producto y puede confirmarse más adelante sin rehacer el
  diseño.
- **Rationale**: SQLite guarda su único fichero de datos en el disco del
  proceso que lo ejecuta. Muchas plataformas de despliegue "serverless" o
  de funciones sin estado (pensadas para sitios estáticos o funciones
  efímeras) **no garantizan que ese disco sobreviva** a un redeploy o a un
  reinicio del contenedor — en ese caso, el fichero SQLite se perdería y
  con él todos los presupuestos del freelancer. Esto es un riesgo real de
  negocio (pérdida de datos), no solo técnico, y por eso se documenta
  explícitamente en el plan y en Complexity Tracking.
- **Alternatives considered**:
  - *Hosting estático con funciones serverless (Vercel/Netlify Functions)*:
    descartado para este backend porque su almacenamiento es efímero por
    diseño; sería necesario sustituir SQLite por una base de datos remota,
    lo que contradice la decisión explícita de usar SQLite.
  - *VPS propio (DigitalOcean, Hetzner, etc.)*: disco persistente
    garantizado, pero exige administrar el servidor (parches, reinicios,
    backups) manualmente; se deja como alternativa válida pero con más
    carga operativa que un proveedor con "disco persistente administrado".

## 4. Frontend: Vue 3 con Vite

- **Decision**: **Vue 3** (Composition API) con **Vite** como build tool
  para el frontend, comunicándose con la API de Express mediante `fetch`.
  Reemplaza la decisión anterior de HTML/CSS/JS vanilla sin build.
- **Rationale**: Decisión explícita del usuario tras ver la primera versión
  de este plan (que proponía vanilla JS). Entre los frameworks de frontend
  más valorados, Vue 3 ofrece el mejor equilibrio para este caso concreto:
  - Curva de aprendizaje baja y plantillas declarativas (`<template>`) que
    encajan bien con las ~5 vistas de esta v1 (perfil, clientes, catálogo,
    presupuestos, PDF), sin la sobrecarga conceptual de JSX o de un store
    de estado complejo.
  - Reactividad fina (`ref`/`computed`) adecuada para recalcular totales
    (base, IVA, retención) en tiempo real según cambian las líneas del
    presupuesto — justo el caso de uso central de la Historia 1.
  - Ecosistema maduro y con buena valoración en encuestas de desarrolladores
    (State of JS, Stack Overflow), sin el peso de configuración que exige
    un proyecto React equivalente (routing, gestión de estado, etc. suelen
    ser decisiones aparte en React; en Vue, Vue Router y Pinia son oficiales
    y mínimos).
  - Vite da una experiencia de desarrollo rápida (HMR) y un build de
    producción simple (estáticos servidos por el propio Express o por un
    hosting estático aparte).
- **Alternatives considered**:
  - *React*: mayor ecosistema y oferta de desarrolladores, pero exige más
    piezas propias (routing, gestión de estado) para una app de 4-5
    pantallas; JSX añade una capa de indirección que no aporta valor aquí.
  - *Svelte/SvelteKit*: el mejor valorado en satisfacción de desarrolladores
    en varias encuestas recientes y compila a JS sin runtime pesado, pero
    ecosistema más pequeño y menos predecible a futuro para quien no tiene
    experiencia previa con él. Se descarta por preferir la madurez y
    documentación de Vue para un proyecto de aprendizaje/producción mixto.
  - *Vanilla JS sin framework (decisión anterior)*: era la opción más
    simple posible (Principio I), pero el usuario decidió priorizar
    productividad y mantenibilidad de la UI (componentes, reactividad)
    sobre esa simplicidad mínima, de forma análoga a como ya priorizó
    backend con base de datos sobre `localStorage`.

## 5. Generación de PDF: se mantiene en el navegador

- **Decision**: jsPDF sigue ejecutándose en el navegador del freelancer,
  no en el servidor Express.
- **Rationale**: Generar el PDF en el servidor añadiría una llamada de red
  de ida y vuelta, y el servidor no necesita participar: todos los datos
  del presupuesto ya están disponibles en el navegador tras consultarlo a
  la API. Mantener esto en el cliente conserva la respuesta instantánea
  que pide la experiencia de usuario (Historia 2).
- **Alternatives considered**: generación de PDF en el servidor con una
  librería Node (p. ej. PDFKit) — descartada por añadir latencia de red y
  carga al servidor para una tarea que no la necesita.

## 6. Redondeo de dinero: sin cambios

- **Decision**: Idéntica a la versión anterior del plan — redondeo único,
  al final, sobre base/IVA/retención/total, nunca línea por línea.
- **Rationale**: Esta regla viene de la clarificación de spec.md, no del
  stack técnico; el cambio de backend no la afecta. Se implementa en
  `backend/calculo.js`, que se mantiene libre de Express y de SQLite para
  seguir siendo 100% testeable con `node --test` sin levantar un servidor
  ni un fichero de base de datos.

## 7. Alcance de las pruebas automáticas

- **Decision**: `node --test` para dos capas:
  1. `backend/calculo.js` (igual que antes: funciones puras de impuestos y
     totales).
  2. Las rutas de la API de Express (`backend/rutas/*.js`), ejercitadas
     contra una base SQLite en memoria (`:memory:`) creada de cero en cada
     ejecución de pruebas, para no depender del fichero de datos real ni
     dejar residuos entre ejecuciones.
- **Rationale**: Con un backend real ahora existe una segunda superficie de
  riesgo silencioso: una ruta que guarda mal un dato, o que no aplica una
  regla de negocio (p. ej. no congelar el `clienteSnapshot`, o reasignar un
  número de presupuesto ya emitido). Probar las rutas contra una base en
  memoria es barato (no añade dependencias nuevas, `better-sqlite3` ya
  soporta `:memory:` de forma nativa) y cubre ese riesgo sin necesitar un
  framework de testing adicional. El resto (frontend, PDF) sigue
  validándose a mano según el Principio IV.
- **Alternatives considered**:
  - *Mockear la base de datos en las pruebas de rutas*: se descarta — una
    base de datos en memoria real (mismo motor SQLite) da más confianza de
    que el esquema y las consultas SQL funcionan de verdad, sin el riesgo
    de que un mock oculte un error que solo aparecería contra SQLite real.
  - *Pruebas end-to-end sobre el navegador (Playwright/Cypress)*: se
    descarta por las mismas razones que en la versión anterior del plan —
    desproporcionado para el tamaño actual del producto.
