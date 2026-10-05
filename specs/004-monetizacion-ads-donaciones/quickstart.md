# Quickstart: Validación del Sistema de Monetización

**Feature**: 004-monetizacion-ads-donaciones | **Date**: 2026-10-05

## Prerrequisitos

1. La plataforma PresupuestosPro está corriendo localmente (backend + frontend)
2. Hay al menos un profesional registrado y autenticado (dependencia de spec-003)
3. Variables de entorno configuradas:
   - `WOMPI_PUBLIC_KEY` — llave pública de Wompi (sandbox para desarrollo)
   - `WOMPI_PRIVATE_KEY` — llave privada de Wompi (sandbox)
   - `WOMPI_INTEGRITY_SECRET` — secreto de integridad para validación de webhooks
   - `RESEND_API_KEY` — API key de Resend para emails transaccionales
   - `ADSENSE_CLIENT_ID` — ID de publisher de Google AdSense (puede ser de prueba en desarrollo)
4. Fichero `ads-config.json` presente en el directorio de configuración del backend con al menos un espacio publicitario configurado (ver [api-ads-config.md](contracts/api-ads-config.md))

## Escenarios de validación

### Escenario 1: Publicidad AdSense se muestra correctamente (SC-001)

**Setup**: Consentimiento de cookies aceptado previamente.

**Pasos**:
1. Abrir la plataforma en un navegador sin bloqueador de publicidad
2. Navegar a: lista de cotizaciones, editor de cotización, catálogo de servicios, gestión de clientes y perfil profesional
3. Verificar que en cada pantalla se muestran espacios publicitarios en las ubicaciones configuradas

**Resultado esperado**: Los anuncios de AdSense aparecen en las zonas designadas sin cubrir botones, campos de formulario ni menús.

**Verificación móvil**: Abrir en un viewport de 360px de ancho y confirmar que ningún anuncio ocupa más del 25% del área visible de la pantalla (FR-003).

---

### Escenario 2: Funcionalidad con bloqueador activo (SC-002)

**Setup**: Instalar un bloqueador de publicidad (e.g., uBlock Origin).

**Pasos**:
1. Navegar a la lista de cotizaciones
2. Crear una nueva cotización: seleccionar cliente, añadir líneas de servicio, guardar
3. Descargar el PDF de la cotización

**Resultado esperado**: Toda la funcionalidad de cotización opera normalmente. Los espacios publicitarios se colapsan o desaparecen sin dejar huecos visuales. No hay errores en consola que afecten al usuario.

---

### Escenario 3: Flujo completo de donación (SC-003)

**Setup**: Profesional autenticado, sandbox de Wompi configurado.

**Pasos**:
1. Localizar el botón de donación en el menú lateral o sección de perfil/configuración
2. Hacer clic en el botón de donación
3. Seleccionar un monto predefinido (e.g., 10.000 COP) o ingresar uno personalizado
4. Verificar que aparece el aviso de "donación no reembolsable" antes del botón de confirmar
5. Confirmar la donación → verificar redirección a la pasarela de Wompi
6. Completar el pago en la pasarela (usar tarjeta de prueba del sandbox de Wompi)
7. Regresar a la plataforma

**Resultado esperado**: Mensaje de agradecimiento en pantalla. La donación aparece en el historial con estado "exitosa". Se recibe un email de confirmación con fecha, monto y referencia de transacción.

**Verificar tiempo**: El flujo completo (paso 1 al 7) debe tomar menos de 3 minutos (SC-003).

---

### Escenario 4: Historial de donaciones (SC-004, FR-014)

**Setup**: Completar al menos 2 donaciones (1 exitosa, 1 cancelada).

**Pasos**:
1. Ir al perfil del profesional
2. Buscar la sección de historial de donaciones
3. Verificar que se listan ambas donaciones con fecha, monto y estado

**Resultado esperado**: Todas las donaciones aparecen con su estado correcto (exitosa/fallida/cancelada).

---

### Escenario 5: Límites antifraude (FR-015)

**Setup**: Profesional autenticado.

**Pasos**:
1. Completar 3 donaciones exitosas en el mismo día
2. Intentar una 4ª donación

**Resultado esperado**: El sistema muestra un mensaje indicando que podrá donar nuevamente al día siguiente.

**Variante acumulado**: Donar montos que sumen más de 200.000 COP en un día y verificar que se bloquea el siguiente intento.

---

### Escenario 6: PDF sin publicidad (SC-005)

**Pasos**:
1. Con anuncios visibles en la pantalla, abrir una cotización existente
2. Descargar el PDF

**Resultado esperado**: El PDF no contiene ningún anuncio, banner, ni referencia publicitaria o de donaciones.

---

### Escenario 7: Cookie consent (FR-020 a FR-022)

**Setup**: Limpiar localStorage del navegador para simular primer acceso.

**Pasos**:
1. Acceder a la plataforma
2. Verificar que aparece el banner de consentimiento de cookies
3. Rechazar cookies → verificar que NO se cargan anuncios de AdSense (inspeccionar network)
4. Verificar que los espacios de pauta directa (si hay anunciante configurado) SÍ se muestran
5. Ir a Configuración > Privacidad y cambiar la preferencia a "Aceptar"
6. Verificar que ahora sí se cargan los anuncios de AdSense

**Resultado esperado**: El comportamiento cambia según la preferencia del usuario. La preferencia persiste entre recargas de página.

---

### Escenario 8: Pauta directa configurable sin redespliegue (SC-007)

**Pasos**:
1. Verificar que un espacio de pauta directa muestra el contenido del anunciante actual (o AdSense como fallback)
2. Modificar el fichero `ads-config.json`: cambiar la imagen y enlace del anunciante
3. Reiniciar el servidor backend (sin rebuild del frontend)
4. Recargar la plataforma en el navegador

**Resultado esperado**: El espacio de pauta directa muestra el nuevo contenido del anunciante sin necesidad de desplegar una nueva versión.

---

### Escenario 9: Donación fallida/cancelada (FR-013)

**Pasos**:
1. Iniciar una donación
2. En la pasarela de Wompi, cancelar el pago (o usar tarjeta de prueba que falla)
3. Regresar a la plataforma

**Resultado esperado**: No se registra ningún cargo. La donación aparece en el historial como "fallida" o "cancelada". Se puede intentar de nuevo.

---

### Escenario 10: Performance de carga (SC-006)

**Setup**: Herramientas de desarrollador del navegador abiertas (pestaña Network).

**Pasos**:
1. Navegar a cualquier pantalla con publicidad
2. Observar el timing: verificar que el contenido principal de la página se renderiza antes de que se carguen los anuncios

**Resultado esperado**: La carga de publicidad no añade más de 2 segundos al tiempo de visualización del contenido principal.

## Notas

- Para desarrollo local, usar el sandbox de Wompi (llaves de prueba) y un ADSENSE_CLIENT_ID de prueba
- Los escenarios se ejecutan manualmente conforme al Principio IV de la constitution (verificable por persona no técnica)
- Los detalles de implementación de cada endpoint están en [contracts/](contracts/)
- El modelo de datos está en [data-model.md](data-model.md)
