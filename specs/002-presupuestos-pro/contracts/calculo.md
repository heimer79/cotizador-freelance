# Contrato: Motor de cálculo (`backend/calculo.js`)

Este es el módulo más importante del producto: aquí vive toda la lógica de
dinero (base, IVA, retención, total). Es deliberadamente un conjunto de
**funciones puras** (mismos datos de entrada → siempre el mismo resultado,
sin tocar Express ni SQLite), para poder probarlo con `node --test` sin
levantar un servidor ni una base de datos.

Las rutas de `backend/rutas/presupuestos.js` son las únicas que llaman a
este módulo: leen las líneas desde SQLite, le pasan los datos a
`calcularPresupuesto`, y devuelven el resultado en la respuesta HTTP (ver
`contracts/api.md`). El módulo en sí no sabe que existe una base de datos.

## Funciones

```text
calcularBaseImponible(lineas: LineaPresupuesto[]): integer
```
Suma `cantidad × precioUnitario` de todas las líneas, con precisión
completa (sin redondear). Devuelve `0` si `lineas` está vacío.

```text
calcularIva(baseImponible: integer): integer
```
Devuelve `redondear(baseImponible × 0.19)`. El 19 % es fijo (FR-013).

```text
calcularRetencion(baseImponible: integer, tipoCliente: "empresa"|"particular", retencionActivada: boolean, retencionPorcentaje: 11|10): integer
```
- Devuelve `0` si `tipoCliente === "particular"`, **sin importar** el valor
  de `retencionActivada` (FR-006, CL3: el tipo de cliente manda).
- Devuelve `0` si `retencionActivada === false`.
- En caso contrario, devuelve `redondear(baseImponible × retencionPorcentaje / 100)`.

```text
calcularTotal(baseImponible: integer, iva: integer, retencion: integer): integer
```
Devuelve `redondear(baseImponible + iva − retencion)`.

```text
calcularPresupuesto(presupuesto: Presupuesto): { baseImponible, iva, retencion, total }
```
Función de conveniencia que encadena las cuatro anteriores a partir de un
`Presupuesto` completo (incluye su `clienteSnapshot.tipo`). Es la única
función que el resto de la app (vistas, PDF) debería llamar directamente.

```text
redondear(valor: number): integer
```
Redondeo al peso colombiano entero más cercano (`Math.round`). Es el único
punto del código donde ocurre un redondeo — nunca se redondea línea por
línea (clarificación de spec.md).

## Casos de prueba obligatorios (`tests/calculo.test.js`)

Estos casos vienen directamente de los Acceptance Scenarios de spec.md y
**deben** pasar antes de considerar cerrada esta pieza:

1. Base 2.000.000, cliente empresa, retención 11 % → IVA 380.000,
   retención −220.000, total 2.160.000 (Historia 1, escenario 1; SC-002).
2. Mismo caso cambiando retención a 10 % → total 2.180.000 (Historia 1,
   escenario 2).
3. Mismo caso con cliente "particular" (retención activada igualmente) →
   retención 0, total 2.380.000 (Historia 1, escenario 3; SC-003).
4. Lista de líneas vacía → `baseImponible = 0` (usado por la UI para
   bloquear la generación de PDF, FR-011).
5. Caso de redondeo no exacto (p. ej. una base que al 19 % da un decimal)
   para confirmar que se redondea solo una vez, al final, y no por línea.

## Reglas del contrato

- Ninguna función de este módulo accede a SQLite, a Express ni al DOM/
  `jsPDF`. Esto es lo que permite probarlo con `node --test` sin levantar
  un servidor ni un fichero de base de datos.
- Ninguna función de este módulo valida `cantidad`/`precioUnitario` > 0:
  esa validación de entrada ocurre en la ruta (`backend/rutas/presupuestos.js`)
  antes de insertar la línea en SQLite, no aquí (separación entre "validar
  entrada del usuario" y "calcular con datos ya válidos").
