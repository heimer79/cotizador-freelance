# Data Model: PresupuestosPro v0

Todas las entidades se guardan en tablas de un único fichero **SQLite**
(`backend/datos/presupuestospro.sqlite`), accedido desde el backend Express
con `better-sqlite3`. No hay servicio de base de datos aparte: es un
fichero en el disco del servidor.

## perfil

Tabla de una sola fila (singleton), identificada siempre con `id = 1`.
Cabecera de todos los presupuestos.

| Columna | Tipo SQLite | Obligatorio | Notas |
|---|---|---|---|
| id | INTEGER PRIMARY KEY | Sí | Siempre `1` |
| nombre | TEXT | No | Si está vacío, el PDF usa un valor por defecto (ver Assumptions de spec.md) |
| nit | TEXT | No | NIT o documento de identidad, texto libre |
| contacto | TEXT | No | Teléfono/correo, texto libre |
| logo_base64 | TEXT | No | Imagen del logo codificada; si no existe, el PDF muestra el nombre como cabecera |

**Reglas**: no tiene estados ni transiciones; `PUT /api/perfil` sobrescribe
la fila completa (FR-001). Editarlo afecta solo a presupuestos **nuevos**
que se creen después (Historia 3, escenario 2) — los presupuestos ya
emitidos tienen su propia copia de los datos relevantes en el momento de
creación (ver `presupuestos` más abajo).

## clientes

| Columna | Tipo SQLite | Obligatorio | Notas |
|---|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | Sí | |
| nombre | TEXT | Sí | Nombre o razón social |
| contacto | TEXT | No | Teléfono/correo |
| tipo | TEXT CHECK (`'empresa'` o `'particular'`) | Sí | Determina si la retención puede aplicarse (FR-003, FR-006) |

**Reglas**: `DELETE /api/clientes/:id` o una edición **no** afectan a los
presupuestos ya creados con ese cliente, porque el presupuesto guarda su
propia copia de estos datos (columnas `cliente_*` en `presupuestos`, ver
abajo) en el momento de crearse (FR-003, clarificación de spec.md).

## catalogo

| Columna | Tipo SQLite | Obligatorio | Notas |
|---|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | Sí | |
| nombre | TEXT | Sí | Nombre del servicio |
| precio_defecto | INTEGER | Sí | > 0, entero en COP (FR-002, FR-004) |

**Reglas**: editar o eliminar un servicio del catálogo no afecta a las
líneas de presupuesto ya creadas a partir de él (Historia 4, escenario 2)
— la línea copia `descripcion` y `precio_unitario` al añadirse, sin
referenciar al catálogo en vivo.

## presupuestos

| Columna | Tipo SQLite | Obligatorio | Notas |
|---|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | Sí | |
| numero | TEXT (`AAAA-NNN`) | Sí, único | Asignado de forma inmutable al crear la fila (FR-007, FR-014); nunca se actualiza después |
| fecha_emision | TEXT (ISO date) | Sí | Fecha de creación/guardado inicial |
| fecha_validez | TEXT (ISO date) | Sí | `fecha_emision + 30 días naturales` (FR-008) |
| cliente_id | INTEGER | Sí | Referencia lógica a `clientes.id` (para poder reabrir el presupuesto desde el listado y enlazarlo con su cliente original). **Sin constraint FOREIGN KEY** en el esquema: el borrado de un cliente (`DELETE /api/clientes/:id`) devuelve `204` sin que SQLite lo impida, y el presupuesto conserva la referencia como valor histórico junto con las columnas `cliente_*` copiadas |
| cliente_nombre | TEXT | Sí | Copia congelada del cliente en el momento de crear (FR-003) |
| cliente_contacto | TEXT | No | Copia congelada |
| cliente_tipo | TEXT | Sí | Copia inicial desde `clientes.tipo` al crear el presupuesto; editable después mediante `PUT /api/presupuestos/:id` con `clienteTipo` para permitir el cambio de tipo sin crear un presupuesto nuevo (Historia 1, escenario 3). Esta columna, no la tabla `clientes`, es la que usa el cálculo de retención |
| retencion_activada | INTEGER (0/1) | Sí | Casilla del freelancer; se ignora si `cliente_tipo = 'particular'` (FR-006) |
| retencion_porcentaje | INTEGER (`11` o `10`) DEFAULT `11` | Sí | Siempre presente; cuando `retencion_activada = 0` se almacena igualmente (por defecto `11`) pero el cálculo lo ignora. Las dos únicas opciones fijas (FR-013) |

**Totales** (no se guardan como columnas; se recalculan en cada lectura con
`backend/calculo.js` a partir de `lineas_presupuesto`, para que editar una
línea después siempre recalcule correctamente — FR-009):

- `baseImponible` = suma de `cantidad × precio_unitario` de todas las líneas del presupuesto, con precisión completa.
- `iva` = redondeo final de `baseImponible × 19%`.
- `retencion` = redondeo final de `baseImponible × retencion_porcentaje%` si aplica; si no, `0`.
- `total` = redondeo final de `baseImponible + iva − retencion`.

**Reglas de numeración** (FR-007): `numero` se asigna una sola vez, al
insertar la fila (`POST /api/presupuestos`), nunca al generar el PDF. El
`NNN` es un contador que arranca en `001` cada año natural nuevo (ver
`backend/numeracion.js` y la tabla `contador_presupuestos` abajo).

**Estados**: sin máquina de estados formal. Un presupuesto es "incompleto"
mientras no tiene filas en `lineas_presupuesto` (no se puede generar PDF —
FR-011) y "completo" en cuanto tiene al menos una. No existe una columna
de "modificado tras generar el PDF" (clarificación de spec.md, escenario
negativo B): el backend no necesita rastrear ese estado.

## lineas_presupuesto

| Columna | Tipo SQLite | Obligatorio | Notas |
|---|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | Sí | |
| presupuesto_id | INTEGER | Sí | Referencia a `presupuestos.id` (`ON DELETE CASCADE`) |
| descripcion | TEXT | Sí | Copiada del catálogo o escrita a mano (FR-004) |
| cantidad | INTEGER | Sí | ≥ 1, entero (FR-004) |
| precio_unitario | INTEGER | Sí | > 0, entero en COP (FR-004) |
| origen | TEXT (`'catalogo'` o `'manual'`) | Sí | Solo informativo; no cambia el cálculo (CL2) |
| servicio_id | INTEGER NULL | No | Referencia a `catalogo.id` si aplica; no se vuelve a leer en el futuro (el precio ya quedó copiado) |

**Validación** (FR-004): la ruta `POST/PUT` de líneas rechaza `cantidad` o
`precio_unitario` en cero o negativos antes de insertar/actualizar.

## contador_presupuestos

| Columna | Tipo SQLite | Obligatorio | Notas |
|---|---|---|---|
| anio | TEXT PRIMARY KEY | Sí | p. ej. `"2026"` |
| ultimo_numero | INTEGER | Sí | Último `NNN` usado ese año; el siguiente presupuesto usa `ultimo_numero + 1` |

## Relaciones

```
perfil (1 fila fija)
clientes (0..N) ──copiado-a-creación──> presupuestos.cliente_* (nombre/contacto/tipo)
catalogo (0..N) ──copiado-a-creación──> lineas_presupuesto (cuando origen = 'catalogo')
presupuestos (1) ──contiene (FK + ON DELETE CASCADE)──> lineas_presupuesto (0..N, pero ≥1 para generar PDF)
contador_presupuestos (1 fila por año) ──alimenta──> presupuestos.numero al crearse
```

Las columnas `cliente_*` en `presupuestos` son deliberadamente una copia,
no una referencia en vivo (ni siquiera un `JOIN` a `clientes` en tiempo de
lectura): esto es lo que garantiza, a nivel de esquema, que editar o
eliminar un cliente no cambie nunca los datos de un presupuesto ya emitido
(FR-003). Lo mismo aplica a `descripcion`/`precio_unitario` en
`lineas_presupuesto` frente a `catalogo` (Historia 4, escenario 2).
