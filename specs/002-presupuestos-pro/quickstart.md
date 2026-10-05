# Quickstart: validar PresupuestosPro v0

Esta guía sirve para comprobar, sin leer código, que la feature cumple sus
criterios de éxito (SC-001 a SC-005 de spec.md).

## 0. Requisitos previos

- Node.js (LTS reciente) instalado, para correr el backend Express y las
  pruebas automáticas.
- Un navegador moderno (Chrome, Safari, Firefox o Edge), de escritorio o
  móvil.
- No se necesita ninguna cuenta ni servicio externo de pago. La librería
  de PDF (jsPDF) se instala como dependencia npm del frontend y se
  empaqueta con Vite; no se carga desde un CDN.

## 1. Instalar e iniciar el backend

```bash
cd backend
npm install
npm start
```

**Resultado esperado**: el servidor Express arranca (por defecto en
`http://localhost:3000`) y crea automáticamente el fichero
`backend/datos/presupuestospro.sqlite` si no existe, con las tablas vacías.

## 2. (Opcional/técnico) Verificar el motor de cálculo y la API

```bash
node --test tests/calculo.test.js tests/api.test.js
```

**Resultado esperado**: todos los casos de `contracts/calculo.md` en verde,
incluyendo el total exacto de 2.160.000 COP del escenario de referencia
(SC-002); y las pruebas de `contracts/api.md` contra una base SQLite en
memoria, también en verde.

## 3. Abrir la aplicación

Con el backend corriendo (paso 1), abrir `http://localhost:3000` en el
navegador (el propio Express sirve los ficheros estáticos del frontend).

## 4. Validar Historia 3 — Perfil del freelancer

1. Entrar a la sección "Perfil".
2. Guardar nombre, NIT, datos de contacto y un logo.
3. Cerrar la pestaña del navegador y volver a abrir la app (incluso desde
   otro dispositivo apuntando a la misma URL del servidor).
4. **Esperado**: los datos siguen ahí (SC-005) — ahora porque viven en el
   fichero SQLite del servidor, no en el navegador.

## 5. Validar Historia 4 — Catálogo de servicios

1. Entrar a "Catálogo" y crear un servicio con nombre y precio.
2. Editarlo o eliminarlo después de usarlo en un presupuesto (paso 6) y
   comprobar que el presupuesto ya creado no cambia sus importes.

## 6. Validar Historia 1 — Presupuesto con impuestos automáticos

1. Crear un cliente de tipo "empresa".
2. Crear un presupuesto nuevo para ese cliente con dos líneas:
   1.500.000 COP y 500.000 COP.
3. Activar la retención en la fuente al 11 % y guardar.
4. **Esperado**: base 2.000.000, IVA 380.000, retención −220.000, total
   2.160.000 (spec.md, Historia 1, escenario 1; SC-002).
5. Cambiar la retención a 10 %. **Esperado**: total 2.180.000 sin volver a
   escribir nada (escenario 2).
6. Marcar el cliente como "particular". **Esperado**: retención deja de
   aplicarse, total 2.380.000 (escenario 3; SC-003).
7. Crear un presupuesto nuevo sin líneas e intentar descargar el PDF.
   **Esperado**: la app lo impide y explica el motivo (escenario 4).

## 7. Validar Historia 2 — Descarga de PDF

1. Sobre el presupuesto del paso 6, pulsar "Descargar PDF".
2. **Esperado**: PDF con logo (o nombre por defecto), número de
   presupuesto, fecha de emisión, fecha de validez (+30 días), tabla de
   líneas y desglose de base/IVA/retención/total. El PDF se genera en el
   propio navegador (sin esperar al servidor) a partir de los datos leídos
   de la API.
3. Editar una línea del presupuesto y volver a descargar el PDF.
   **Esperado**: el nuevo PDF refleja los importes actualizados, sin ningún
   aviso de "desactualizado" en la interfaz.

## 8. Validar numeración (SC-004)

1. Crear un segundo presupuesto cualquiera.
2. **Esperado**: recibe el número siguiente al primero dentro del mismo año
   (p. ej. si el primero fue `2026-001`, este es `2026-002`), sin que el
   freelancer tenga que indicarlo. El contador vive en la tabla
   `contador_presupuestos` del servidor.

## 9. Validar que funciona bien en móvil

1. Repetir los pasos 4 a 7 con el navegador en modo de emulación móvil (o en
   un teléfono real apuntando a la URL pública del servidor).
2. **Esperado**: formularios, botones y la tabla de líneas son usables con
   el dedo, sin scroll horizontal ni elementos cortados.

## 10. Validar persistencia tras un reinicio/redeploy del servidor

Este paso es específico del stack Express + SQLite (no existía en la
versión 100% navegador) y es crítico para no perder datos en producción:

1. Detener el proceso del backend (`Ctrl+C`) y volver a iniciarlo
   (`npm start`), o forzar un redeploy en el proveedor elegido.
2. **Esperado**: todos los presupuestos, clientes, catálogo y perfil creados
   antes siguen disponibles — confirma que el disco donde vive
   `presupuestospro.sqlite` es realmente persistente en el entorno de
   despliegue elegido (ver decisión de negocio 2 y Complexity Tracking en
   plan.md). Si este paso falla en el proveedor de hosting elegido, **no
   se debe lanzar** hasta corregirlo: significa que cualquier redeploy
   borraría los presupuestos del freelancer.
