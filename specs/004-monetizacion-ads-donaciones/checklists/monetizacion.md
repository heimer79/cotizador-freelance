# Checklist de Calidad de Requisitos: Sistema de Monetización — Publicidad y Donaciones

**Propósito**: Validar la calidad, completitud, claridad y consistencia de los requisitos de la feature de monetización (AdSense, pauta directa, donaciones voluntarias, consentimiento de cookies) como compuerta de release.
**Creado**: 2026-10-05
**Feature**: [spec.md](../spec.md)

**Review Ownership**: This checklist is a reviewer-owned requirements-quality review artifact. Mark an item `[x]` only when the reviewer determines the requirements-quality criterion is satisfied.
**Marker Semantics**: `[x]` means the criterion has been reviewed and satisfied for requirements quality. It does not mean implementation work is complete.

---

## Completitud de Requisitos de Pagos y Donaciones *(prioridad máxima)*

- [ ] CHK001 - ¿Están definidos los requisitos para el manejo de webhooks/callbacks de la pasarela de pago que confirman el estado de la donación? [Gap]
- [ ] CHK002 - ¿Están especificados los requisitos para el escenario en que la pasarela confirma el pago pero la plataforma falla al registrarlo (inconsistencia de estado)? [Gap, Exception Flow]
- [ ] CHK003 - ¿Están definidos los requisitos de timeout para las respuestas de la pasarela de pago? [Gap, Spec §FR-011]
- [ ] CHK004 - ¿Están especificados los requisitos para fallos parciales de pago (ej. timeout bancario después de debitar la cuenta)? [Gap, Exception Flow]
- [ ] CHK005 - ¿Están definidos los requisitos de idempotencia para el registro de donaciones, previniendo doble registro por callbacks duplicados de la pasarela? [Gap, Spec §EC4]
- [ ] CHK006 - ¿Están especificados los requisitos para qué sucede si el email de confirmación de donación falla al enviarse? [Gap, Exception Flow, Spec §FR-012]
- [ ] CHK007 - ¿Están definidos los requisitos de retención de datos para los registros de donación (cuánto tiempo se conservan)? [Gap]
- [ ] CHK008 - ¿Están especificados los requisitos para el contenido del email de confirmación más allá de "fecha, monto y referencia de transacción" (ej. nombre del donante, texto legal, formato)? [Completeness, Spec §FR-012]
- [ ] CHK009 - ¿Están definidos los requisitos para mostrar donaciones pendientes en el historial mientras se espera confirmación de la pasarela? [Coverage, Spec §FR-014]
- [ ] CHK010 - ¿Están especificados los requisitos para intentos de donación concurrentes del mismo usuario? [Gap, Coverage]

## Claridad de Requisitos de Pagos y Donaciones *(prioridad máxima)*

- [ ] CHK011 - ¿Está especificada la zona horaria utilizada para calcular el "día natural" en los límites diarios de donación (3 donaciones, 200.000 COP)? [Clarity, Spec §FR-015]
- [ ] CHK012 - ¿Está definido el comportamiento cuando un usuario intenta donar un monto que excedería el acumulado diario de 200.000 COP? (ej. ya donó 150.000 COP e intenta donar 100.000 COP) [Clarity, Spec §FR-015]
- [ ] CHK013 - ¿Está definido si la "referencia de transacción" es generada por la plataforma o proporcionada por la pasarela de pago? [Clarity, Spec §FR-012]
- [ ] CHK014 - ¿Está especificado el formato de entrada del "monto personalizado" (solo enteros, sin decimales, validación de caracteres)? [Clarity, Spec §FR-010]
- [ ] CHK015 - ¿Está cuantificado el formato de visualización de montos COP en toda la interfaz de donaciones (separador de miles, símbolo, decimales)? [Clarity, Gap]
- [ ] CHK016 - ¿Está definido qué se muestra al usuario que cierra el navegador durante el proceso de pago y regresa después? [Gap, Exception Flow]

## Cobertura de Escenarios de Pago *(prioridad máxima)*

- [ ] CHK017 - ¿Están definidos los requisitos para el flujo de donación cuando la sesión del usuario expira durante el proceso de pago? [Gap, Exception Flow]
- [ ] CHK018 - ¿Están especificados los requisitos para prevenir que usuarios no autenticados accedan al flujo de donación? [Coverage, Gap]
- [ ] CHK019 - ¿Están definidos los requisitos para el aviso de "no reembolsable" en cuanto a posición exacta, tamaño y prominencia visual respecto al botón de confirmar? [Clarity, Spec §FR-010]
- [ ] CHK020 - ¿Están especificados los requisitos de accesibilidad (WCAG) para el formulario de donación y la interacción con la pasarela? [Gap, NFR]

## Completitud de Requisitos de Publicidad (AdSense)

- [ ] CHK021 - ¿Están definidas las ubicaciones específicas (posiciones en el layout) de los espacios publicitarios en cada una de las 5 pantallas listadas en FR-001? [Completeness, Spec §FR-001]
- [ ] CHK022 - ¿Están especificadas las dimensiones o restricciones de tamaño de los espacios publicitarios para cada ubicación? [Gap, Spec §FR-001]
- [ ] CHK023 - ¿Están definidos los requisitos para el número máximo de espacios publicitarios por pantalla? [Gap]
- [ ] CHK024 - ¿Están especificados los requisitos para el comportamiento de los espacios publicitarios durante la navegación entre pantallas de la SPA (recarga, transición)? [Gap]
- [ ] CHK025 - ¿Están definidos los requisitos para pantallas no listadas en FR-001 pero mencionadas en EC6 (login, registro)? EC6 dice que usuarios no autenticados ven ads, pero FR-001 no lista esas pantallas. [Conflict, Spec §FR-001 vs §EC6]
- [ ] CHK026 - ¿Están especificados los requisitos de comportamiento de los ads cuando la cuenta de AdSense es suspendida (mencionado en EC1 pero sin plan de recuperación)? [Coverage, Spec §EC1]

## Completitud de Requisitos de Pauta Directa

- [ ] CHK027 - ¿Están definidos los requisitos de formato, dimensiones y peso máximo de las imágenes de pauta directa? [Gap, Spec §FR-008]
- [ ] CHK028 - ¿Está especificada la lógica de decisión de fallback (cuándo mostrar AdSense vs cuándo ocultar el espacio) cuando no hay anunciante? [Clarity, Spec §FR-007]
- [ ] CHK029 - ¿Están definidos los requisitos de quién puede actualizar la configuración de pauta directa y cómo se autentica esa acción? [Gap, Spec §FR-008]
- [ ] CHK030 - ¿Están especificados los requisitos de validación del contenido de pauta directa (enlaces rotos, imágenes inválidas)? [Gap]

## Completitud de Requisitos de Privacidad y Cookies

- [ ] CHK031 - ¿Están definidos los requisitos para el contenido/redacción específica del banner de consentimiento de cookies? [Completeness, Spec §FR-020]
- [ ] CHK032 - ¿Están especificados los requisitos del mecanismo de persistencia de consentimiento (qué cookies se establecen, expiración, almacenamiento)? [Gap, Spec §FR-022]
- [ ] CHK033 - ¿Están definidos los requisitos para la ubicación y acceso a la "configuración de privacidad" donde el usuario cambia su preferencia? [Gap, Spec §FR-022]
- [ ] CHK034 - ¿Están especificados los requisitos de accesibilidad del banner de cookies (navegación por teclado, lectores de pantalla)? [Gap, NFR]
- [ ] CHK035 - ¿Está definido el comportamiento de la pauta directa cuando el usuario rechaza cookies de publicidad? FR-021 dice que pauta directa "puede seguir mostrándose" — ¿es obligatorio o opcional? [Ambiguity, Spec §FR-021]

## Consistencia entre Requisitos

- [ ] CHK036 - ¿Son consistentes las pantallas donde se muestran anuncios entre FR-001 (5 pantallas nombradas) y EC6 (login/registro también muestran ads)? [Conflict, Spec §FR-001 vs §EC6]
- [ ] CHK037 - ¿Son consistentes los límites de monto de donación entre FR-010 (máximo 500.000 COP por donación) y FR-015 (máximo 200.000 COP acumulado por día)? ¿Es intencionalmente posible un monto unitario mayor que el límite diario? [Consistency, Spec §FR-010 vs §FR-015]
- [ ] CHK038 - ¿Es consistente la mención de Nequi como método de pago en el plan (Wompi) con los requisitos del spec que solo listan "tarjetas y PSE"? [Consistency, Plan §Technical Context vs Spec §FR-011]
- [ ] CHK039 - ¿Son consistentes los requisitos de posición del botón de donación ("menú lateral o sección de configuración/perfil" en FR-009) con la User Story 2 que dice lo mismo? ¿Se define cuál de las dos ubicaciones es la elegida? [Ambiguity, Spec §FR-009]

## Calidad de Criterios de Éxito

- [ ] CHK040 - ¿Se puede medir objetivamente SC-001 ("se muestran correctamente")? ¿Qué constituye "correctamente"? [Measurability, SC-001]
- [ ] CHK041 - ¿Está definido el punto de inicio exacto para medir SC-003 ("menos de 3 minutos" para completar donación)? [Clarity, SC-003]
- [ ] CHK042 - ¿Está definida la metodología para medir SC-006 ("no añade más de 2 segundos")? ¿Qué herramienta, condición de red, dispositivo? [Measurability, SC-006]
- [ ] CHK043 - ¿Están definidos criterios de éxito para el flujo de consentimiento de cookies? [Gap]
- [ ] CHK044 - ¿Están definidos criterios de éxito para el flujo de configuración de pauta directa? [Gap]

## Cobertura de Casos Borde

- [ ] CHK045 - ¿Están definidos los requisitos para el escenario de rechazo de cookies Y bloqueador de publicidad activo simultáneamente? [Coverage, Gap]
- [ ] CHK046 - ¿Están definidos los requisitos para donaciones desde múltiples dispositivos del mismo usuario en el mismo día (conteo del límite diario)? [Coverage, Gap]
- [ ] CHK047 - ¿Están definidos los requisitos para la visualización de la interfaz cuando todos los espacios publicitarios están ocultos (cookies rechazadas + sin pauta directa)? [Coverage, Gap]

## Requisitos No Funcionales

- [ ] CHK048 - ¿Están especificados los requisitos de rendimiento para la API de donaciones (tiempo de respuesta)? El plan menciona 200ms pero el spec no lo define. [Gap, NFR]
- [ ] CHK049 - ¿Están especificados los requisitos de impacto de la carga de ads en Core Web Vitals (CLS, LCP) más allá de FR-018 ("carga asíncrona")? [Gap, Spec §FR-018]
- [ ] CHK050 - ¿Están definidos los requisitos de seguridad para la comunicación con la pasarela de pago (HTTPS, validación de certificados, integridad de datos)? [Gap, NFR]

## Dependencias y Supuestos

- [ ] CHK051 - ¿Está validado el supuesto de que las donaciones "no reembolsables" cumplen con la Ley 1480 de 2011 (Estatuto del Consumidor colombiano)? [Assumption]
- [ ] CHK052 - ¿Está verificado el tratamiento tributario asumido ("ingreso gravado, sin factura DIAN ni documento equivalente") con la normativa vigente de la DIAN? [Assumption]
- [ ] CHK053 - ¿Están documentados los requisitos de qué sucede si la pasarela de pago elegida (Wompi) cambia su API o sus tarifas? [Dependency, Gap]
- [ ] CHK054 - ¿Están documentados los requisitos de qué sucede si Google suspende la cuenta de AdSense permanentemente (no solo una falla temporal)? [Dependency, Gap]

## Notes

- Mark items `[x]` only after review confirms the requirement-quality criterion is satisfied
- Leave items unchecked when they still require clarification, correction, or reviewer evaluation
- `/speckit-implement` reads checklist checkbox state as a gate and must not modify markers
- `checklists/requirements.md` has a separate built-in lifecycle maintained by `/speckit-specify` and `/speckit-clarify`
- Los ítems de pagos/donaciones (CHK001–CHK020) tienen prioridad máxima por riesgo financiero
- Traceability: 85% de los ítems incluyen referencia a sección del spec, marcador [Gap], [Conflict], [Ambiguity] o [Assumption]
