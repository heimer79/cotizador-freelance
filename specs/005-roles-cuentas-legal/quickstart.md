# Quickstart: Validación de Roles, Cuentas Premium y Marco Legal

**Feature**: 005-roles-cuentas-legal | **Date**: 2026-10-07

Este documento describe los escenarios de validación runnable para verificar la feature end-to-end. No incluye código de implementación completo; consultar [data-model.md](data-model.md), [contracts/api.md](contracts/api.md) y el futuro `tasks.md` para esos detalles.

---

## Prerequisites

1. Node.js 18+ instalado
2. Repositorio clonado en la rama `005-roles-cuentas-legal`
3. Variables de entorno configuradas en `app/backend/.env`:
   ```
   ADMIN_EMAIL=admin@example.com
   MERCADOPAGO_ACCESS_TOKEN=TEST-xxx
   GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=xxx
   FACEBOOK_OAUTH_APP_ID=xxx
   FACEBOOK_OAUTH_APP_SECRET=xxx
   ```
4. Dependencias instaladas:
   ```bash
   cd app && npm install
   ```

## Setup

```bash
cd app && npm start
# PresupuestosPro escuchando en el puerto 3000
```

Abrir http://localhost:3000 en navegador.

---

## Validation Scenarios

### VS-1: Registro e inicio de sesión con Google (SC-001)

**Objetivo**: Verificar que un usuario puede registrarse e iniciar sesión con Google en menos de 1 minuto.

1. Navegar a http://localhost:3000
2. Clic en "Iniciar sesión con Google"
3. Completar el flujo de consentimiento de Google
4. **Verificar**: El usuario regresa a la plataforma autenticado, con su nombre y correo de Google visibles en la barra de navegación
5. **Verificar**: En el perfil, aparece "google" como proveedor vinculado
6. Cerrar sesión → Volver a iniciar sesión con Google → **Verificar**: misma cuenta, datos intactos

### VS-2: Registro con Facebook y vinculación de cuentas (SC-001, FR-011)

1. Registrarse con correo y contraseña (correo: test@example.com)
2. Cerrar sesión
3. Clic en "Iniciar sesión con Facebook" usando una cuenta Facebook con el mismo correo (test@example.com)
4. **Verificar**: El sistema vincula ambos proveedores a la misma cuenta
5. **Verificar**: En el perfil, aparecen "email" y "facebook" como proveedores vinculados

### VS-3: Establecer contraseña desde perfil (FR-012b)

1. Iniciar sesión con Google (usuario sin contraseña)
2. Ir al perfil → "Establecer contraseña"
3. Ingresar nueva contraseña (mín. 8 caracteres)
4. **Verificar**: Mensaje de confirmación
5. Cerrar sesión → Iniciar sesión con correo y contraseña → **Verificar**: Acceso exitoso

### VS-4: Panel de administración (SC-002)

**Prerequisite**: La cuenta con `ADMIN_EMAIL` debe existir y tener rol admin.

1. Iniciar sesión como administrador
2. **Verificar**: En la barra de navegación aparece "Administración"
3. Acceder al panel → **Verificar**: Se ven 7 secciones (AdSense, Pasarelas, Auth Social, Correo, Notificaciones, Usuarios, Visor BD)
4. Ir a sección AdSense → Cambiar el identificador → Guardar
5. **Verificar**: El cambio se refleja inmediatamente sin reiniciar el servidor (SC-002)
6. **Verificar** (con otro usuario): Los cambios de configuración se aplican en la plataforma

### VS-5: Gestión de usuarios desde admin (FR-006, FR-006b, FR-006c)

1. Iniciar sesión como admin
2. Ir a Administración → Usuarios
3. **Verificar**: Se ve la lista con nombre, correo, tipo cuenta, fecha registro, estado
4. Seleccionar un usuario → Suspender → **Verificar**: Estado cambia a "suspendido"
5. **Verificar** (con ese usuario): Al intentar iniciar sesión, se muestra un mensaje de cuenta suspendida
6. Desde admin: Reactivar el usuario → **Verificar**: Puede iniciar sesión de nuevo
7. Desde admin: Asignar rol admin a otro usuario → **Verificar**: El otro usuario ahora ve "Administración" en su navbar
8. **Verificar**: El admin no puede revocar su propio rol si es el único admin → Debe ver mensaje de error (EC4)

### VS-6: Acceso denegado para usuario normal (FR-005)

1. Iniciar sesión como usuario normal
2. Navegar manualmente a `/admin` o la ruta del panel
3. **Verificar**: Redirigido a la vista normal, sin acceder a funciones de administración
4. **Verificar** (API): `GET /api/admin/config/adsense` responde 403

### VS-7: Cuadro comparativo de cuentas (SC-007)

1. Navegar a la sección de "Planes" (desde menú, pie de página o mensaje de restricción)
2. **Verificar**: Cuadro comparativo lado a lado: gratuita vs premium
3. **Verificar**: Muestra publicidad (sí/no), guardar cotizaciones, guardar clientes, grupos de clientes
4. **Verificar**: Precio $20 USD/año resaltado, con equivalencia "Menos de $2 USD al mes" y equivalencia en COP
5. **Verificar**: Accesible desde al menos 3 puntos de la plataforma (SC-007)

### VS-8: Suscripción premium completa (SC-004)

1. Iniciar sesión como usuario gratuito
2. Ir a "Planes" → Clic en "Obtener Premium"
3. **Verificar**: Se muestra la aceptación de términos de suscripción premium (FR-034)
4. Aceptar términos → **Verificar**: Redirección a MercadoPago
5. Completar pago en sandbox de MercadoPago
6. Regresar a la plataforma → **Verificar**: tipo_cuenta = premium, publicidad desaparece
7. Crear cotización → **Verificar**: Se guarda automáticamente y persiste al recargar
8. Crear cliente → **Verificar**: Persiste entre sesiones
9. Crear grupo de clientes → **Verificar**: Funciona correctamente

### VS-9: Restricciones de cuenta gratuita (SC-003, FR-015, FR-016, FR-017)

1. Iniciar sesión como usuario gratuito
2. Crear cotización → **Verificar**: Funciona durante la sesión
3. **Verificar**: Se muestra publicidad (AdSense)
4. Cerrar sesión → Iniciar sesión de nuevo → **Verificar**: La cotización ya NO está guardada
5. Intentar guardar un cliente → **Verificar**: Mensaje "Función disponible en cuenta premium" con enlace al cuadro comparativo
6. Intentar crear un grupo → **Verificar**: Mismo mensaje de restricción

### VS-10: Aceptación de términos legales obligatoria (SC-005)

1. Registrar un usuario nuevo (por correo o login social)
2. **Verificar**: Antes de completar el registro, aparece checkbox con enlaces a política de privacidad y términos de uso
3. Intentar registrarse sin aceptar → **Verificar**: El registro no se completa (EC5)
4. Aceptar los términos → **Verificar**: Registro exitoso

### VS-11: Re-aceptación de términos actualizados (FR-035)

1. Tener un usuario existente con términos aceptados
2. (En BD) Insertar una nueva versión de un documento legal con `activo = 1`
3. Iniciar sesión con ese usuario
4. **Verificar**: Se muestra modal pidiendo aceptar los nuevos términos antes de continuar
5. Aceptar → **Verificar**: El usuario puede continuar normalmente

### VS-12: Documentos legales accesibles (SC-006)

1. Desde cualquier pantalla, ir al pie de página
2. **Verificar**: Hay enlaces a "Política de Privacidad", "SARLAFT", "Donaciones", "Términos de Uso"
3. Clic en cada uno → **Verificar**: Se muestra el documento completo
4. **Verificar**: Accesible en máximo 2 clics desde cualquier pantalla (SC-006)

### VS-13: Compartir cotización por WhatsApp (FR-050, FR-055)

1. Iniciar sesión (gratuito o premium)
2. Crear una cotización
3. Clic en botón de WhatsApp
4. **Verificar**: Se abre WhatsApp (app o Web) con mensaje prellenado que incluye texto descriptivo y enlace de descarga
5. Copiar el enlace de descarga y abrirlo en una pestaña nueva (sin autenticación)
6. **Verificar**: El PDF se descarga correctamente

### VS-14: Enlace de PDF expirado (FR-056)

1. Obtener un enlace de compartir de VS-13
2. (En BD) Modificar `fecha_expiracion` del enlace a una fecha pasada
3. Acceder al enlace
4. **Verificar**: Mensaje "Este enlace de descarga ha expirado. Solicita un nuevo enlace al remitente."

### VS-15: Vencimiento de suscripción premium (FR-024, EC2)

1. Tener un usuario premium con cotizaciones y clientes guardados
2. (En BD) Cambiar `fecha_vencimiento` de la suscripción a fecha pasada y `estado` a 'vencida'
3. Iniciar sesión → **Verificar**: Aviso de renovación visible
4. **Verificar**: Datos accesibles en modo lectura (puede ver pero no crear/editar)
5. (En BD) Cambiar `estado` a 'gracia', simular 30 días → 'retencion', simular 90 días
6. **Verificar**: Datos eliminados, cuenta vuelve a gratuita

### VS-16: Créditos "Powered by Digital Pyme Solutions" (SC-008)

1. Navegar a cualquier pantalla de la plataforma
2. Hacer scroll hasta el pie de página
3. **Verificar**: Texto "Creado por: Digital Pyme Solutions (DPS)" visible
4. **Verificar**: Enlace funcional a https://digitalpymesolutions.dev/
5. **Verificar**: Legible en móvil (360px) (FR-037)

### VS-17: Notificaciones del sistema al admin (SC-010)

1. Iniciar sesión como admin
2. Ir al panel de administración
3. **Verificar**: Se ve la sección de notificaciones con badge numérico (si hay alertas)
4. Provocar un error (e.g. configurar credenciales Gmail inválidas e intentar enviar correo)
5. **Verificar**: Aparece una notificación nueva con tipo, fecha, descripción
6. Marcar como leída → **Verificar**: El badge se actualiza

### VS-18: Retroalimentación al usuario (SC-011, FR-047, FR-048)

1. Realizar acciones como usuario normal: registrarse, guardar perfil, pagar suscripción
2. **Verificar**: Cada acción muestra mensaje de éxito, error o carga
3. **Verificar**: Mensajes de éxito se auto-cierran a los 5 segundos
4. **Verificar**: Mensajes de error persisten hasta cerrarlos manualmente
5. **Verificar**: Errores son descriptivos y orientados a la acción (no códigos técnicos)

### VS-19: Historial de actividad del usuario (FR-049)

1. Iniciar sesión (con diferentes proveedores si es posible)
2. Ir al perfil → Sección de historial
3. **Verificar**: Últimos 5 logins con fecha, hora y proveedor
4. **Verificar**: Cambios recientes de cuenta (si aplica)

### VS-20: Accesibilidad WCAG 2.1 AA (SC-009)

1. Ejecutar Lighthouse o axe en las pantallas principales
2. **Verificar**: Contraste suficiente (4.5:1 texto normal, 3:1 texto grande)
3. **Verificar**: Navegación completa por teclado (Tab, Enter, Escape)
4. **Verificar**: Elementos interactivos con etiquetas accesibles
5. **Verificar**: Mensajes de feedback anunciados por ARIA live regions (FR-042)
6. **Verificar**: Botón de visibilidad de contraseña accesible (FR-010b)

---

## Automated Test Commands

```bash
# Unit and integration tests
cd app && node --test tests/auth-social.test.js
cd app && node --test tests/suscripcion.test.js
cd app && node --test tests/admin.test.js
cd app && node --test tests/legal.test.js

# All tests
cd app && npm test
```

---

## Checklist de Validación Completa

| # | Escenario | SC/FR | Resultado |
|---|-----------|-------|-----------|
| VS-1 | Login Google | SC-001 | ☐ |
| VS-2 | Login Facebook + vinculación | SC-001, FR-011 | ☐ |
| VS-3 | Establecer contraseña | FR-012b | ☐ |
| VS-4 | Panel admin | SC-002 | ☐ |
| VS-5 | Gestión usuarios | FR-006 | ☐ |
| VS-6 | Acceso denegado | FR-005 | ☐ |
| VS-7 | Cuadro comparativo | SC-007 | ☐ |
| VS-8 | Suscripción premium | SC-004 | ☐ |
| VS-9 | Restricciones gratuita | SC-003 | ☐ |
| VS-10 | Aceptación términos | SC-005 | ☐ |
| VS-11 | Re-aceptación | FR-035 | ☐ |
| VS-12 | Documentos legales | SC-006 | ☐ |
| VS-13 | WhatsApp compartir | FR-050 | ☐ |
| VS-14 | Enlace expirado | FR-056 | ☐ |
| VS-15 | Vencimiento premium | FR-024 | ☐ |
| VS-16 | Créditos DPS | SC-008 | ☐ |
| VS-17 | Notificaciones admin | SC-010 | ☐ |
| VS-18 | Retroalimentación | SC-011 | ☐ |
| VS-19 | Historial actividad | FR-049 | ☐ |
| VS-20 | Accesibilidad | SC-009 | ☐ |
