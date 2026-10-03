<!--
Sync Impact Report
- Version change: (sin versión previa) → 1.0.0
- Modified principles: N/A (primera ratificación; plantilla sin rellenar)
- Added sections:
  - Core Principles: I. Simplicidad ante todo, II. Idioma y mercado,
    III. Cero alcance fantasma, IV. Verificable por una persona no técnica,
    V. Datos del usuario con respeto
  - Governance
- Removed sections: [SECTION_2_NAME] y [SECTION_3_NAME] de la plantilla (no
  aplican en v1; se omiten en vez de rellenarse con contenido de relleno)
- Templates requiring updates: ninguno pendiente de esta sesión (los
  templates de spec/plan/tasks leen la constitution en tiempo de ejecución
  y no se modifican en este comando)
- Deferred TODOs: ninguno
-->

# PresupuestosPro Constitution

## Core Principles

### I. Simplicidad ante todo
Ante dos soluciones que cumplen el mismo requisito, se elige siempre la más
simple. PresupuestosPro está en su versión 1: no se diseña ni se construye
pensando en escalas, integraciones o casos de uso futuros que no estén
pedidos hoy. Cualquier capa de abstracción, configuración o generalización
debe justificarse por una necesidad presente en la spec, no por una
posible necesidad futura.

**Razón**: la complejidad anticipada retrasa la entrega y es la causa más
común de que un v1 nunca se termine.

### II. Idioma y mercado
Todo el producto — interfaz, mensajes, textos legales, PDFs generados y
comunicaciones al usuario — se escribe en español de Colombia. La moneda
de la aplicación es el peso colombiano (COP); no se muestran ni calculan
montos en otras monedas.

**Razón**: PresupuestosPro se dirige a freelancers colombianos; mezclar
idiomas o monedas confunde al usuario final y no aporta valor en v1.

### III. Cero alcance fantasma
No se implementa ninguna funcionalidad que no esté escrita explícitamente
en la spec de la feature en curso. Si durante el desarrollo surge una idea
nueva o una mejora, se documenta como propuesta separada (para una futura
spec) y no se construye dentro del trabajo actual.

**Razón**: el alcance fantasma infla el trabajo, introduce riesgo no
revisado y rompe la trazabilidad entre spec y código.

### IV. Verificable por una persona no técnica
Cada criterio de éxito de una feature debe poder comprobarse usando la
aplicación (haciendo clics, rellenando formularios, mirando el PDF
resultante), sin necesidad de leer código, logs ni consultar la base de
datos. Si un criterio no se puede verificar así, se reescribe hasta que
sí se pueda.

**Razón**: mantiene las specs honestas sobre lo que realmente le importa
al usuario final, y permite que cualquier persona del equipo valide el
trabajo.

### V. Datos del usuario con respeto
Solo se pide al usuario la información imprescindible para generar el
presupuesto (datos del freelancer, del cliente y de las líneas del
presupuesto). No se solicitan datos adicionales "por si acaso". No se
introducen claves, tokens ni secretos directamente en el código: viven
en variables de entorno o en un gestor de secretos, nunca en el
repositorio.

**Razón**: minimizar los datos recogidos reduce el riesgo para el usuario
y para el proyecto; los secretos en el código son una fuga de seguridad
recurrente y fácil de evitar.

## Governance

Esta constitution tiene prioridad sobre cualquier otra práctica, plantilla
o preferencia individual dentro del proyecto. Ante un conflicto entre una
spec, un plan o una implementación y esta constitution, gana la
constitution.

Cualquier modificación de estos principios se hace mediante una nueva
ejecución de `/speckit-constitution`, documentando en el Sync Impact
Report qué cambió y por qué. El versionado sigue SemVer:

- MAJOR: se elimina o se redefine de forma incompatible un principio.
- MINOR: se añade un principio o una sección nueva, o se amplía de forma
  material una guía existente.
- PATCH: aclaraciones de redacción sin cambio de significado.

Todo plan (`plan.md`) generado para una feature debe incluir una
verificación explícita de que no viola ninguno de estos principios antes
de pasar a tasks. Cualquier desviación debe justificarse por escrito en
el propio plan.

**Version**: 1.0.0 | **Ratified**: 2026-08-29 | **Last Amended**: 2026-08-29
