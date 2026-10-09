# Quickstart Validation Guide: Cotización UX, Impuestos y Mejoras Generales

**Feature**: 006-cotizacion-ux-impuestos | **Date**: 2026-10-08

## Prerequisites

- Node.js instalado
- MySQL corriendo con la base de datos `Quotizador`
- Variables de entorno configuradas (ver `.env.example`)
- Dependencias instaladas: `npm install` desde la raíz del proyecto

## Setup

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend (dev mode)
npm run dev:frontend

# Acceder a http://localhost:5173 (Vite dev) o http://localhost:3000 (producción)
```

## Validation Scenarios

### VS-1: Gestión de clientes guardados (SC-001)

**Objetivo**: Verificar que un usuario con clientes guardados crea una cotización en menos de 2 minutos.

1. Registrarse e iniciar sesión
2. Ir a "Clientes" y crear un cliente con todos los campos (nombre, NIT, contacto, email, teléfono)
3. Subir un logo del cliente (PNG, < 2 MB)
4. Ir a "Nueva cotización"
5. **Verificar**: aparece el listado de clientes guardados con búsqueda
6. Seleccionar el cliente creado
7. **Verificar**: la vista previa muestra los datos completos del cliente y su logo
8. Cambiar a otro cliente (si hay más de uno)
9. **Verificar**: la vista previa se actualiza automáticamente

**Criterio de éxito**: Todo el flujo se completa sin errores. La selección de cliente prellea los datos instantáneamente.

---

### VS-2: Impuestos para independiente (SC-003)

**Objetivo**: Verificar cálculos de impuestos con retención en la fuente, IVA, reteIVA y reteICA.

1. En Perfil, configurar tipo de emisor como "Persona natural / Independiente"
2. Marcar como responsable de IVA
3. Crear una cotización con un servicio de $1.000.000
4. Configurar: IVA 19%, retención en la fuente 11%, reteIVA 15%, reteICA 0.966%
5. **Verificar cálculo manual**:
   - Base gravable: $1.000.000
   - IVA (19%): $190.000
   - Retención fuente (11%): -$110.000
   - ReteIVA (15% de $190.000): -$28.500
   - ReteICA (0.966%): -$9.660
   - Total neto: $1.041.840
6. **Verificar**: el desglose en la vista previa coincide exactamente

**Criterio de éxito**: Los cálculos son correctos al 100%.

---

### VS-3: Impuestos para empresa (SC-003)

**Objetivo**: Verificar configuración de impuestos para persona jurídica.

1. En Perfil, configurar tipo de emisor como "Persona jurídica / Empresa"
2. Crear una cotización con IVA 19%
3. Indicar que el cliente practica retención en la fuente
4. **Verificar**: el desglose muestra subtotal + IVA - retención = total neto
5. **Verificar**: no aparecen opciones de reteIVA ni reteICA para este tipo de emisor (o aparecen si aplica)

---

### VS-4: Compensación de retención en precio (SC-003)

**Objetivo**: Verificar que el precio se ajusta para compensar la retención.

1. Crear cotización como independiente con servicio de $1.000.000
2. Activar retención al 11%
3. Activar "Compensar retención en precio"
4. **Verificar**: el precio unitario se ajusta a $1.123.596 (≈ 1.000.000 / (1 - 0.11))
5. **Verificar**: el desglose muestra precio original + compensación
6. **Verificar**: el total neto después de retención ≈ $1.000.000

---

### VS-5: Catálogo de servicios (SC-002)

**Objetivo**: Agregar 5 servicios del catálogo en menos de 30 segundos.

1. Crear 5 servicios en el catálogo (nombre, descripción, precio)
2. Ir a "Nueva cotización"
3. En la sección de servicios, **verificar**: aparece el listado del catálogo
4. Agregar los 5 servicios con un clic cada uno
5. **Verificar**: descripción, cantidad y precio se prellenan automáticamente
6. Editar el precio de uno de los servicios en la cotización
7. **Verificar**: el catálogo no se modifica

**Criterio de éxito**: 5 servicios agregados en < 30 segundos.

---

### VS-6: Emisores múltiples — premium (SC-009)

**Objetivo**: Alternar entre emisores y ver la vista previa actualizada en < 3 segundos.

1. Con cuenta premium, ir a Perfil > Emisores
2. Crear un segundo emisor con datos diferentes (otra razón social, NIT, logo)
3. Ir a "Nueva cotización"
4. **Verificar**: aparece un selector de emisor
5. Seleccionar el segundo emisor
6. **Verificar**: la vista previa se actualiza con nombre, NIT y logo del emisor seleccionado en < 3 segundos
7. Con cuenta gratuita, **verificar**: no aparece selector de emisor

---

### VS-7: Plantillas de PDF — premium (SC-009)

**Objetivo**: Verificar selección y personalización de plantillas.

1. Como usuario gratuito, descargar PDF
2. **Verificar**: PDF con diseño profesional estándar, desglose de impuestos completo
3. Como usuario premium, acceder a opciones de PDF
4. **Verificar**: aparecen al menos 3 plantillas
5. Seleccionar "Moderna", cambiar color de encabezado a #e11d48
6. **Verificar**: vista previa refleja la plantilla y colores elegidos
7. Descargar PDF
8. **Verificar**: el PDF descargado usa la plantilla y colores seleccionados

---

### VS-8: Borrador con autoguardado (SC-004)

**Objetivo**: Verificar que el 100% de los borradores se restauran intactos.

1. Crear cotización con cliente, emisor, 3 servicios, impuestos configurados
2. **Verificar**: aparece indicador de autoguardado
3. Cerrar la pestaña sin guardar explícitamente
4. Reabrir la app, ir a "Mis cotizaciones"
5. Abrir el borrador
6. **Verificar**: todos los datos están exactamente como se dejaron (cliente, servicios, cantidades, precios, impuestos, emisor)

---

### VS-9: WhatsApp con PDF adjunto (SC-010)

**Objetivo**: Verificar compartir PDF por WhatsApp.

1. Crear cotización completa
2. Presionar botón de WhatsApp
3. **En móvil con Web Share API**: **verificar** que se abre WhatsApp con el PDF adjunto
4. **En escritorio o sin soporte**: **verificar** que se abre WhatsApp con enlace de descarga
5. Abrir el enlace de descarga
6. **Verificar**: el PDF se descarga correctamente
7. Esperar 7 días (o ajustar expiración para testing)
8. **Verificar**: el enlace ya no funciona después de expirar

---

### VS-10: 2FA (SC-008)

**Objetivo**: Activar 2FA y completar inicio de sesión con segundo factor en < 1 minuto.

1. Ir a Perfil > Seguridad
2. Activar 2FA con app de autenticación
3. **Verificar**: se muestra QR code y códigos de recuperación (mínimo 8)
4. Escanear QR con Google Authenticator (o similar)
5. Ingresar código de verificación
6. **Verificar**: 2FA activado exitosamente
7. Cerrar sesión
8. Iniciar sesión con credenciales
9. **Verificar**: se solicita código del segundo factor
10. Ingresar código de la app
11. **Verificar**: acceso exitoso

**Flujo de recuperación**:
12. Cerrar sesión, intentar login
13. Usar un código de recuperación en vez del TOTP
14. **Verificar**: acceso exitoso, se indica cuántos códigos quedan

---

### VS-11: Textos legales unificados

1. Registrarse como nuevo usuario
2. **Verificar**: un solo checkbox de aceptación de términos con enlace al documento
3. Abrir el documento
4. **Verificar**: contiene secciones de privacidad, SARLAFT, términos de uso y donaciones
5. Con usuario existente, iniciar sesión
6. **Verificar**: se solicita aceptar la nueva versión unificada

---

### VS-12: SEO, metadatos y favicon (SC-005, SC-011, SC-012)

1. Abrir la página principal sin estar logueado
2. **Verificar**: texto introductorio en español sobre PresupuestosPro
3. Inspeccionar HTML (`View Source`)
4. **Verificar**: `<title>`, `<meta name="description">`, `og:title`, `og:description`, `og:image`
5. **Verificar**: favicon visible en la pestaña del navegador
6. Ejecutar auditoría de rendimiento (Lighthouse o PageSpeed Insights)
7. **Verificar**: LCP < 2.5s, INP < 200ms, CLS < 0.1

---

### VS-13: Eliminación de cotizaciones

1. Ir a "Mis cotizaciones"
2. **Verificar**: cada cotización tiene botón de eliminar
3. Presionar eliminar en una cotización
4. **Verificar**: aparece diálogo de confirmación
5. Cancelar eliminación
6. **Verificar**: la cotización sigue en el listado
7. Presionar eliminar y confirmar
8. **Verificar**: la cotización desaparece permanentemente

---

### VS-14: Actualización de planes (SC-009)

1. Ir a la sección de Planes
2. **Verificar**: el cuadro comparativo incluye:
   - Emisores múltiples (solo premium)
   - Plantillas PDF personalizables (solo premium)
   - PDF estándar profesional (gratuita)
   - Gestión de clientes con logo (ambas, con límites)
   - Catálogo de servicios (ambas, con límites)
   - Impuestos configurables (ambas)
3. **Verificar**: se destaca visualmente la funcionalidad de emisores múltiples

---

### VS-15: Edge cases de límites de almacenamiento

1. Como usuario gratuito, crear 10 clientes
2. Intentar crear el cliente #11
3. **Verificar**: mensaje de límite alcanzado con sugerencia de premium (EC-3)
4. Repetir para servicios del catálogo (límite: 20)
5. **Verificar**: mensaje similar

---

### VS-16: Seguridad web (SC-007)

1. En formularios, intentar inyección XSS en campos de texto (ej. `<script>alert(1)</script>`)
2. **Verificar**: el input se sanitiza, no se ejecuta código
3. Verificar que todas las páginas cargan sobre HTTPS
4. Verificar headers de seguridad (CSP, X-Frame-Options, etc.)
5. Verificar que no hay secretos expuestos en el código fuente del frontend
