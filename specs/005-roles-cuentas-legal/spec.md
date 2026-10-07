# Feature Specification: Roles, Cuentas Premium y Marco Legal

**Feature Branch**: `005-roles-cuentas-legal`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Cambios funcionales sin tocar diseño. Dos roles (usuario normal y administrador). Dos tipos de cuenta para usuario normal (gratuita y premium $20 USD/año). Administrador gestiona APIs, usuarios y configuración. Login con Google y Facebook. Política de privacidad, SARLAFT, términos de donaciones. Cuadro comparativo de cuentas. Powered by Digital Pyme Solutions."

> **Relación con specs anteriores**: Esta feature amplía la plataforma definida en spec-003 y spec-004. Se conservan los medios de monetización (Google AdSense y donaciones) definidos en spec-004. Se añade un nuevo canal de ingresos (suscripción premium) y se reestructura el modelo de usuarios con roles y tipos de cuenta.

## Clarifications

### Session 2026-10-07

- Q: ¿Qué mecanismo de envío de correo debe usar la plataforma para comunicaciones transaccionales (verificación de correo, recordatorios de suscripción)? → A: Gmail API, configurada por el administrador desde el panel (Client ID + correo remitente autorizado).
- Q: ¿Qué nivel de conformidad WCAG debe cumplir la plataforma para accesibilidad? → A: WCAG 2.1 nivel AA (contraste, navegación por teclado, compatibilidad con lectores de pantalla).
- Q: ¿Cómo debe la plataforma informar al administrador sobre errores del sistema? → A: Panel de notificaciones dentro del admin con badge de alertas no leídas (errores de API, correos fallidos, pagos fallidos).
- Q: ¿El usuario normal debe ver un historial de sus propias acciones recientes en su perfil? → A: Historial básico: últimos 5 logins y cambios de cuenta (tipo de cuenta, aceptación de términos).
- Q: ¿Los mensajes de retroalimentación al usuario deben desaparecer automáticamente o persistir? → A: Éxito y carga se auto-cierran a los 5 segundos; errores persisten hasta que el usuario los cierre.
- Q: ¿Qué debe hacer el botón de WhatsApp en una cotización? → A: Abrir WhatsApp del usuario (app o WhatsApp Web) con mensaje prellenado (texto descriptivo + enlace de descarga del PDF) mediante enlace wa.me. No requiere API de WhatsApp Business ni configuración del administrador.
- Q: ¿Debe el administrador poder ver la base de datos desde el panel de administración? → A: Sí, visor de solo lectura de tablas y registros dentro del panel de admin. Sin capacidad de escritura.
- Q: ¿La pasarela de pago para suscripciones y donaciones debe ser MercadoPago o MercadoLibre? → A: MercadoPago (Checkout Pro o enlace de pago) para suscripciones premium y para donaciones. MercadoLibre marketplace no aplica.
- Q: ¿El enlace de descarga del PDF compartido por WhatsApp debe ser público o protegido? → A: Enlace público temporal que expira en 7 días. Cualquiera con el enlace puede descargar el PDF sin necesitar cuenta.
- Q: ¿El botón de WhatsApp debe estar disponible para usuarios gratuitos o solo premium? → A: Disponible para todos los usuarios (gratuitos y premium).
- Q: ¿Los métodos de inicio de sesión (correo/contraseña, Google, Facebook) son obligatorios u opcionales para el usuario? → A: Son electivos: el usuario elige con cuál método inicia sesión. Ningún método individual es obligatorio, pero sí es obligatorio autenticarse de alguna manera para usar la aplicación.
- Q: ¿El campo de contraseña debe permitir al usuario ver la contraseña ingresada? → A: Sí. El campo de contraseña debe incluir un botón/icono de visibilidad que permita alternar entre mostrar y ocultar la contraseña.
- Q: ¿El administrador ve publicidad y tiene las mismas restricciones de almacenamiento que un usuario normal? → A: Sí. El administrador es un usuario normal con tipo de cuenta (gratuita o premium). Si es gratuito, ve publicidad y tiene las restricciones correspondientes. El rol de administrador solo otorga acceso al panel de administración, no exime de las reglas de tipo de cuenta.
- Q: ¿Si un usuario se registra con Google o Facebook (sin contraseña), puede después establecer una contraseña para también iniciar sesión con correo/contraseña? → A: Sí. El usuario puede establecer una contraseña desde su perfil para habilitar el inicio de sesión con correo/contraseña como método adicional o de respaldo.
- Q: ¿La suscripción premium se renueva automáticamente o el usuario paga manualmente cada año? → A: Ambas opciones. El usuario puede elegir renovación automática (cobro recurrente anual) o pago manual (recibe recordatorio antes de vencimiento y paga cuando desee renovar).
- Q: ¿Puede el administrador suspender o cambiar el rol de un usuario desde el panel, o la lista es solo lectura? → A: El admin puede suspender/reactivar usuarios y asignar/revocar rol de administrador. No puede eliminar cuentas de usuario.
- Q: ¿Las cotizaciones de un usuario gratuito se procesan solo en el frontend o también pasan por el backend? → A: Backend temporal. Las cotizaciones se envían al backend para todos los usuarios (necesario para generar el PDF compartible por WhatsApp), pero para usuarios gratuitos se marcan como temporales y se eliminan al cerrar sesión o después de 24 horas de inactividad.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Registro e inicio de sesión con Google y Facebook (Priority: P1)

Como profesional que quiere usar la plataforma, quiero poder registrarme e iniciar sesión con mi cuenta de Google o de Facebook, para no tener que recordar otra contraseña y acceder más rápido.

**Why this priority**: El acceso social reduce la fricción de registro y es requisito previo para todo el sistema de roles y cuentas. Sin autenticación robusta, nada más funciona.

**Independent Test**: Se puede probar haciendo clic en "Iniciar sesión con Google" o "Iniciar sesión con Facebook", completando la autenticación externa, y verificando que el usuario queda autenticado en la plataforma con su nombre y correo.

**Acceptance Scenarios**:

1. **Given** un visitante no autenticado, **When** hace clic en "Iniciar sesión con Google", **Then** es redirigido al flujo de autenticación de Google, y al completarlo regresa a la plataforma autenticado con su nombre y correo de Google.
2. **Given** un visitante no autenticado, **When** hace clic en "Iniciar sesión con Facebook", **Then** es redirigido al flujo de autenticación de Facebook, y al completarlo regresa a la plataforma autenticado con su nombre y correo de Facebook.
3. **Given** un usuario que ya tiene cuenta con correo y contraseña, **When** inicia sesión con Google o Facebook usando el mismo correo, **Then** su cuenta existente se vincula al proveedor social y puede usar ambos métodos para ingresar.
4. **Given** un usuario autenticado con Google o Facebook, **When** cierra sesión y vuelve a iniciar sesión con el mismo proveedor, **Then** accede a su misma cuenta con todos sus datos intactos.
5. **Given** un visitante que intenta iniciar sesión social pero el servicio externo falla, **When** la autenticación no se completa, **Then** ve un mensaje claro indicando que no se pudo conectar con el proveedor y puede intentar de nuevo o usar correo y contraseña.

---

### User Story 2 — Rol de administrador: gestión de configuración y usuarios (Priority: P1)

Como administrador de la plataforma, quiero poder configurar las claves de Google AdSense, los enlaces de pasarelas de pago para donaciones (MercadoPago y PayPal), las credenciales de autenticación social (Google y Facebook) y gestionar los usuarios registrados, para operar la plataforma sin necesidad de modificar código.

**Why this priority**: Sin un panel de administración, toda la configuración requiere cambios en código y despliegues. El administrador necesita autonomía operativa desde el primer día.

**Independent Test**: Se puede probar iniciando sesión como administrador, accediendo al panel de administración, configurando cada uno de los campos (AdSense, pasarelas de pago, login social), y verificando que los cambios se reflejan en la plataforma. También probando la lista de usuarios registrados.

**Acceptance Scenarios**:

1. **Given** un usuario con rol de administrador autenticado, **When** accede al panel de administración, **Then** ve secciones para: configuración de AdSense, pasarelas de donación, autenticación social, correo electrónico (Gmail API), notificaciones del sistema, gestión de usuarios y visor de base de datos (solo lectura).
2. **Given** un administrador en la sección de AdSense, **When** ingresa o modifica el identificador de AdSense y guarda, **Then** los espacios publicitarios de la plataforma utilizan la nueva configuración.
3. **Given** un administrador en la sección de pasarelas de donación, **When** configura el enlace de MercadoPago y/o PayPal para recibir donaciones y guarda, **Then** los botones de donación de la plataforma redirigen a esas pasarelas.
4. **Given** un administrador en la sección de autenticación social, **When** configura las credenciales de la aplicación de Google y/o Facebook para login, **Then** los botones de inicio de sesión social funcionan con esas credenciales.
5. **Given** un administrador en la sección de gestión de usuarios, **When** consulta la lista de usuarios registrados, **Then** ve nombre, correo, tipo de cuenta (gratuita/premium), fecha de registro y estado de cada usuario.
6. **Given** un usuario con rol normal, **When** intenta acceder a la ruta del panel de administración, **Then** es redirigido a su vista normal sin acceder a funciones de administración.
7. **Given** un administrador revisando datos de un usuario, **When** accede a la información del usuario, **Then** solo puede ver los datos que la Ley 1581 de 2012 permite para fines de administración de la plataforma (datos proporcionados voluntariamente por el usuario para el servicio), sin acceso a contenido de cotizaciones ni datos de clientes del usuario.

---

### User Story 3 — Cuenta premium sin publicidad con almacenamiento (Priority: P2)

Como profesional que usa la plataforma frecuentemente, quiero poder suscribirme a una cuenta premium por $20 USD al año, para trabajar sin publicidad, guardar mis cotizaciones, guardar mis clientes y crear grupos de clientes.

**Why this priority**: La cuenta premium es el tercer canal de ingresos y ofrece valor tangible al usuario frecuente. Depende de que el sistema de roles y autenticación ya esté funcionando.

**Independent Test**: Se puede probar registrándose como usuario gratuito, verificando las limitaciones, suscribiéndose a premium, y verificando que la publicidad desaparece, que las cotizaciones se guardan, que los clientes persisten y que se pueden crear grupos.

**Acceptance Scenarios**:

1. **Given** un usuario con cuenta gratuita, **When** busca información sobre la cuenta premium, **Then** encuentra un cuadro comparativo claro entre la cuenta gratuita y la premium, con el precio de $20 USD/año resaltado como una inversión accesible.
2. **Given** un usuario con cuenta gratuita que decide suscribirse, **When** hace clic en "Obtener Premium", **Then** es redirigido a la pasarela de pago para completar la suscripción.
3. **Given** un usuario que completó el pago de la suscripción premium, **When** regresa a la plataforma, **Then** su cuenta se actualiza a premium, la publicidad desaparece inmediatamente y se habilitan las funciones de almacenamiento.
4. **Given** un usuario premium, **When** crea una cotización, **Then** la cotización se guarda automáticamente y puede acceder a ella en cualquier momento desde su lista de cotizaciones guardadas.
5. **Given** un usuario premium, **When** crea un cliente, **Then** el cliente se guarda y persiste entre sesiones. Puede consultarlo, editarlo y usarlo en futuras cotizaciones.
6. **Given** un usuario premium, **When** quiere organizar sus clientes, **Then** puede crear grupos de clientes (por ejemplo: "Restaurantes", "Oficinas") y asignar clientes a uno o más grupos.
7. **Given** un usuario con cuenta gratuita, **When** crea una cotización, **Then** puede trabajar con ella durante la sesión activa pero NO se guarda al cerrar sesión. Ve un aviso informando que con la cuenta premium podría guardarla.
8. **Given** un usuario con cuenta gratuita, **When** intenta guardar un cliente o crear un grupo, **Then** ve un mensaje indicando que esa función está disponible en la cuenta premium, con enlace al cuadro comparativo.
9. **Given** un usuario premium cuya suscripción venció, **When** ingresa a la plataforma, **Then** ve un aviso de renovación. Sus datos guardados (cotizaciones, clientes, grupos) se mantienen accesibles en modo lectura durante 30 días. Si no renueva en 30 días, la cuenta vuelve a gratuita pero los datos se conservan 90 días adicionales antes de eliminarse.

---

### User Story 4 — Cuadro comparativo de cuentas (Priority: P2)

Como visitante o usuario gratuito, quiero ver un cuadro comparativo claro entre la cuenta gratuita y la premium, para entender qué beneficios obtengo al suscribirme y percibir el precio como accesible.

**Why this priority**: El cuadro comparativo es la pieza de conversión que motiva la suscripción premium. Es clave para la monetización pero depende de que el sistema de cuentas exista.

**Independent Test**: Se puede probar navegando a la sección de planes/precios y verificando que el cuadro muestra todas las diferencias, que el precio está resaltado y que el botón de suscripción funciona.

**Acceptance Scenarios**:

1. **Given** cualquier usuario (autenticado o no), **When** accede a la sección de planes o hace clic en "Ver planes", **Then** ve un cuadro comparativo lado a lado con las funcionalidades de la cuenta gratuita vs. la premium.
2. **Given** el cuadro comparativo visible, **When** el usuario lo revisa, **Then** muestra claramente: publicidad (gratuita: sí / premium: no), guardar cotizaciones (gratuita: no / premium: sí), guardar clientes (gratuita: no / premium: sí), grupos de clientes (gratuita: no / premium: sí), y las funcionalidades comunes a ambas cuentas.
3. **Given** el cuadro comparativo visible, **When** el usuario ve el precio, **Then** el precio de $20 USD/año está resaltado visualmente con un mensaje que comunique su accesibilidad (ejemplo: "Menos de $2 USD al mes" o equivalente en COP).

---

### User Story 5 — Aceptación de términos legales obligatoria (Priority: P1)

Como usuario que se registra o suscribe, quiero ver y aceptar la política de privacidad, los términos sobre SARLAFT/prevención de lavado de activos y la política de donaciones, porque la ley colombiana lo exige y necesito saber cómo se manejan mis datos y mi dinero.

**Why this priority**: Sin aceptación de términos legales, la plataforma opera fuera de cumplimiento legal colombiano. Es requisito bloqueante para cualquier transacción o almacenamiento de datos.

**Independent Test**: Se puede probar registrándose como usuario nuevo y verificando que no se completa el registro sin aceptar los términos. También verificando que los textos legales son accesibles desde cualquier parte de la plataforma.

**Acceptance Scenarios**:

1. **Given** un visitante que se registra (por correo o por login social), **When** completa sus datos de registro, **Then** MUST ver y aceptar explícitamente (checkbox) la política de privacidad y los términos de uso (que incluyen SARLAFT y donaciones) antes de que se cree la cuenta.
2. **Given** un usuario gratuito que se suscribe a premium, **When** inicia el proceso de suscripción, **Then** MUST aceptar los términos y condiciones de la suscripción premium antes de proceder al pago.
3. **Given** cualquier usuario autenticado, **When** busca los documentos legales, **Then** puede acceder a la política de privacidad, al texto sobre SARLAFT y prevención de lavado de activos, y a la política de donaciones desde el pie de página o la sección de configuración.
4. **Given** que los términos legales se actualizan, **When** un usuario existente ingresa a la plataforma, **Then** se le solicita aceptar los términos actualizados antes de continuar usando la plataforma.

---

### User Story 6 — Créditos "Powered by Digital Pyme Solutions" (Priority: P3)

Como propietario de la plataforma, quiero que aparezca la atribución "Creado por: Digital Pyme Solutions (DPS)" con enlace a https://digitalpymesolutions.dev/ en el pie de página, para dar crédito al equipo de desarrollo.

**Why this priority**: Es un requisito cosmético con baja complejidad técnica y sin dependencias.

**Independent Test**: Se puede probar verificando que el texto y el enlace aparecen en el pie de página de todas las pantallas.

**Acceptance Scenarios**:

1. **Given** cualquier página de la plataforma, **When** el usuario hace scroll hasta el pie de página, **Then** ve el texto "Creado por: Digital Pyme Solutions (DPS)" con un enlace funcional a https://digitalpymesolutions.dev/.
2. **Given** la plataforma vista desde un dispositivo móvil (360px), **When** el usuario ve el pie de página, **Then** el crédito es legible y el enlace es funcional.

---

### Edge Cases

- EC1. Si un usuario se registra con Google usando un correo que ya existe por registro con Facebook, el sistema vincula ambos proveedores a la misma cuenta (basado en correo electrónico como identificador único).
- EC2. Si un usuario premium pierde acceso a su método de pago y no puede renovar, sus datos se mantienen en modo lectura 30 días y se conservan 90 días adicionales antes de eliminarse.
- EC3. Si la pasarela de pago para suscripción premium está fuera de servicio, el usuario ve un mensaje indicando que el servicio está temporalmente no disponible y que la plataforma gratuita sigue funcionando normalmente.
- EC4. Si un administrador intenta eliminar su propia cuenta de administrador y es el único administrador, el sistema lo impide con un mensaje explicando que debe haber al menos un administrador.
- EC5. Si un usuario rechaza los términos legales durante el registro, la cuenta no se crea y el usuario puede volver a intentarlo cuando esté dispuesto a aceptar.
- EC6. Si Facebook o Google cambian sus APIs de autenticación, la funcionalidad de login social se degrada mostrando los métodos de login alternativos (correo/contraseña y el otro proveedor social si está disponible).
- EC7. Si un usuario premium intenta guardar más de 500 cotizaciones o 200 clientes, el sistema informa el límite y sugiere archivar o eliminar registros antiguos.
- EC8. Si el servicio de Gmail API no está disponible o las credenciales configuradas son inválidas, los correos transaccionales se encolan y reintentan hasta 3 veces. El administrador ve una notificación de error en el panel. El usuario puede continuar usando la plataforma sin bloqueo.
- EC9. Si el usuario presiona el botón de WhatsApp sin tener la aplicación instalada, el enlace wa.me redirige automáticamente a WhatsApp Web o a la página de descarga de WhatsApp. La plataforma no requiere manejar este caso activamente.
- EC10. Si un destinatario accede a un enlace de descarga de PDF después de los 7 días de vigencia, ve un mensaje indicando que el enlace expiró y que debe solicitar uno nuevo al remitente.

## Requirements *(mandatory)*

### Functional Requirements

**Roles y permisos**

- **FR-001**: El sistema MUST soportar dos roles: usuario normal y administrador.
- **FR-002**: El rol de usuario normal MUST ser el rol por defecto para todo nuevo registro.
- **FR-003**: El rol de administrador MUST asignarse manualmente (por otro administrador o por configuración inicial del sistema). No se puede auto-asignar. El administrador es un usuario normal con tipo de cuenta (gratuita o premium); el rol solo otorga acceso al panel de administración, no exime de las reglas de tipo de cuenta (publicidad, almacenamiento).
- **FR-004**: Un usuario con rol de administrador MUST poder acceder a un panel de administración con las secciones: configuración de AdSense, configuración de pasarelas de donación, configuración de autenticación social, configuración de correo electrónico (Gmail API), notificaciones del sistema, gestión de usuarios y visor de base de datos (solo lectura).
- **FR-005**: Un usuario con rol normal MUST NOT poder acceder ni ver las funciones de administración.
- **FR-006**: El administrador MUST poder ver la lista de usuarios registrados con: nombre, correo, tipo de cuenta (gratuita/premium), fecha de registro y estado de la cuenta.
- **FR-006b**: El administrador MUST poder suspender y reactivar cuentas de usuario desde el panel de gestión. Un usuario suspendido MUST NOT poder iniciar sesión hasta ser reactivado.
- **FR-006c**: El administrador MUST poder asignar o revocar el rol de administrador a otros usuarios desde el panel. MUST NOT poder revocar su propio rol si es el único administrador (EC4).
- **FR-006d**: El administrador MUST NOT poder eliminar cuentas de usuario desde el panel de administración.
- **FR-007**: El administrador MUST NOT poder acceder al contenido de las cotizaciones, datos de clientes ni información financiera personal de los usuarios, en cumplimiento de la Ley 1581 de 2012 (principio de finalidad y acceso restringido).

**Autenticación social**

- **FR-008**: La plataforma MUST ofrecer inicio de sesión y registro mediante cuenta de Google.
- **FR-009**: La plataforma MUST ofrecer inicio de sesión y registro mediante cuenta de Facebook.
- **FR-010**: El inicio de sesión con correo y contraseña (método actual) MUST seguir funcionando. Los tres métodos de autenticación (correo/contraseña, Google, Facebook) son electivos: el usuario elige cuál usar, pero autenticarse es obligatorio para usar la aplicación.
- **FR-010b**: El campo de contraseña en los formularios de inicio de sesión, registro y restablecimiento MUST incluir un control de visibilidad (botón o icono) que permita al usuario alternar entre mostrar y ocultar la contraseña ingresada.
- **FR-011**: Si un usuario se registra con un proveedor social y ya existe una cuenta con ese mismo correo, el sistema MUST vincular la cuenta social a la cuenta existente.
- **FR-012**: El administrador MUST poder configurar las credenciales (Client ID, Client Secret) de Google y Facebook para autenticación social desde el panel de administración.
- **FR-012b**: Un usuario que se registró exclusivamente con un proveedor social (Google o Facebook) MUST poder establecer una contraseña desde su perfil para habilitar el inicio de sesión con correo/contraseña como método adicional o de respaldo.

**Tipos de cuenta — gratuita y premium**

- **FR-013**: El sistema MUST soportar dos tipos de cuenta para usuarios normales: gratuita y premium.
- **FR-014**: La cuenta gratuita MUST permitir todas las funcionalidades actuales de la plataforma (crear cotizaciones, generar PDFs, usar catálogo de servicios) durante la sesión activa.
- **FR-015**: La cuenta gratuita MUST NOT permitir guardar cotizaciones entre sesiones. Las cotizaciones se envían al backend (necesario para generar PDFs y compartir por WhatsApp) pero se marcan como temporales y se eliminan al cerrar sesión o después de 24 horas de inactividad.
- **FR-016**: La cuenta gratuita MUST NOT permitir guardar clientes de forma persistente.
- **FR-017**: La cuenta gratuita MUST NOT permitir crear grupos de clientes.
- **FR-018**: La cuenta gratuita MUST mostrar publicidad (Google AdSense) según lo definido en spec-004.
- **FR-019**: La cuenta premium MUST costar $20 USD al año. El usuario MUST poder elegir entre dos modalidades de renovación: (a) renovación automática (cobro recurrente anual mediante suscripción de MercadoPago, cancelable en cualquier momento desde el perfil) o (b) pago manual (pago único anual; el usuario recibe recordatorio por correo antes del vencimiento y renueva manualmente).
- **FR-020**: La cuenta premium MUST eliminar toda publicidad de la interfaz del usuario.
- **FR-021**: La cuenta premium MUST permitir guardar cotizaciones de forma persistente (máximo 500 cotizaciones activas).
- **FR-022**: La cuenta premium MUST permitir guardar clientes de forma persistente (máximo 200 clientes).
- **FR-023**: La cuenta premium MUST permitir crear grupos de clientes para organizar su cartera (máximo 50 grupos).
- **FR-024**: Si la suscripción premium vence y el usuario no renueva, el sistema MUST mantener los datos guardados en modo lectura durante 30 días. Si no renueva en ese plazo, los datos se conservan 90 días adicionales antes de eliminarse definitivamente.
- **FR-025**: La plataforma MUST mostrar un cuadro comparativo entre cuenta gratuita y premium, accesible desde el menú y desde los mensajes de funciones restringidas. El precio MUST resaltarse visualmente con equivalencia mensual (menos de $2 USD/mes) y equivalencia aproximada en COP.

**Configuración del administrador — pasarelas de pago**

- **FR-026**: El administrador MUST poder configurar el enlace de la pasarela de MercadoPago para recibir donaciones.
- **FR-027**: El administrador MUST poder configurar el enlace de la pasarela de PayPal para recibir donaciones.
- **FR-028**: El administrador MUST poder configurar el identificador de Google AdSense.
- **FR-029**: Los cambios de configuración del administrador MUST aplicarse sin necesidad de desplegar una nueva versión de la plataforma.

**Configuración del administrador — correo electrónico (Gmail API)**

- **FR-038**: El administrador MUST poder configurar las credenciales de Gmail API (Client ID, Client Secret) y la dirección de correo remitente autorizada desde el panel de administración.
- **FR-039**: La plataforma MUST enviar correos transaccionales mediante Gmail API para: (a) verificación de correo electrónico al registrarse; (b) recordatorio de vencimiento de suscripción premium: un primer correo 10 días antes de la fecha de vencimiento y un segundo correo 1 día antes; (c) confirmación de suscripción premium exitosa.
- **FR-040**: Si el envío de correo falla (credenciales inválidas, cuota agotada o servicio no disponible), el sistema MUST registrar el error internamente y permitir que el usuario continúe usando la plataforma. El correo fallido MUST reintentarse automáticamente hasta 3 veces con intervalos crecientes.

**Textos legales y aceptación**

- **FR-030**: La plataforma MUST mostrar una política de privacidad redactada en español de Colombia, conforme a la Ley 1581 de 2012 de Protección de Datos Personales y su decreto reglamentario 1377 de 2013, que incluya: responsable del tratamiento, finalidad del tratamiento, derechos del titular (ARCO: acceso, rectificación, cancelación, oposición), procedimiento para ejercer los derechos, vigencia de la base de datos y datos de contacto del responsable.
- **FR-031**: La plataforma MUST mostrar un texto sobre prevención de lavado de activos y financiación del terrorismo (SARLAFT) que aclare: (a) la plataforma NO es una entidad vigilada por la Superintendencia Financiera y por tanto no está obligada a implementar SARLAFT directamente; (b) las donaciones se procesan íntegramente a través de pasarelas de pago reguladas (MercadoPago, PayPal) que sí cumplen con sus propias obligaciones antilavado; (c) la plataforma no recibe, almacena ni procesa medios de pago directamente; (d) la plataforma se reserva el derecho de reportar actividad inusual a las autoridades competentes.
- **FR-032**: La plataforma MUST mostrar un texto sobre el manejo de donaciones conforme a la legislación colombiana, que aclare: (a) las donaciones son contribuciones voluntarias sin contraprestación; (b) las donaciones no son deducibles de impuestos para el donante porque la plataforma no es una entidad sin ánimo de lucro del régimen tributario especial (Art. 257 del Estatuto Tributario); (c) las donaciones constituyen ingreso gravado para la plataforma; (d) no se emite certificado de donación; (e) las donaciones no son reembolsables.
- **FR-033**: Todo usuario (gratuito o premium) MUST aceptar explícitamente la política de privacidad y los términos de uso durante el registro. Sin aceptación, la cuenta no se crea.
- **FR-034**: Al suscribirse a premium, el usuario MUST aceptar los términos y condiciones de la suscripción antes de proceder al pago.
- **FR-035**: Si los términos legales se actualizan, los usuarios existentes MUST aceptar los nuevos términos la próxima vez que inicien sesión.
- **FR-036**: Los documentos legales (política de privacidad, SARLAFT, donaciones, términos de uso) MUST ser accesibles desde el pie de página de toda pantalla de la plataforma.

**Atribución**

- **FR-037**: El pie de página de toda pantalla MUST incluir el texto "Creado por: Digital Pyme Solutions (DPS)" con enlace funcional a https://digitalpymesolutions.dev/.

**Notificaciones del sistema al administrador**

- **FR-044**: El panel de administración MUST incluir una sección de notificaciones del sistema que muestre errores y eventos relevantes: fallas de APIs externas (Google, Facebook, Gmail), correos transaccionales no enviados, errores de pasarela de pago y errores de configuración.
- **FR-045**: El panel de administración MUST mostrar un indicador visual (badge numérico) en la sección de notificaciones cuando existan alertas no leídas. El badge MUST ser visible desde cualquier sección del panel.
- **FR-046**: Cada notificación MUST incluir: tipo de error, fecha y hora, descripción del problema y estado (no leída/leída). El administrador MUST poder marcar notificaciones como leídas.

**Retroalimentación al usuario normal**

- **FR-047**: La plataforma MUST informar al usuario sobre el resultado de cada acción significativa mediante mensajes visuales claros: confirmación de éxito (registro, guardado, pago), errores (fallo de autenticación, servicio no disponible) y estados de carga (procesando pago, guardando cotización). Los mensajes de éxito y los indicadores de carga MUST auto-cerrarse a los 5 segundos. Los mensajes de error MUST persistir hasta que el usuario los cierre manualmente.
- **FR-048**: Los mensajes de error al usuario MUST ser descriptivos y orientados a la acción (qué pasó y qué puede hacer), nunca mostrar códigos técnicos ni mensajes del servidor.
- **FR-049**: El perfil del usuario normal MUST mostrar un historial básico de actividad que incluya: los últimos 5 inicios de sesión (fecha, hora y proveedor usado) y los cambios recientes en su cuenta (cambio de tipo de cuenta, aceptación de nuevos términos legales).

**Accesibilidad y usabilidad**

- **FR-041**: La plataforma MUST cumplir con el nivel de conformidad AA de las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.1. Esto incluye como mínimo: (a) contraste de color suficiente (ratio mínimo 4.5:1 para texto normal, 3:1 para texto grande); (b) toda la funcionalidad accesible mediante navegación por teclado; (c) todos los elementos interactivos con etiquetas accesibles para lectores de pantalla; (d) formularios con etiquetas asociadas y mensajes de error identificables programáticamente.
- **FR-042**: Los mensajes de error, confirmación y estado MUST ser anunciados a tecnologías asistivas mediante regiones ARIA live o roles de alerta apropiados.
- **FR-043**: Las imágenes funcionales (iconos de acción, logos con enlace) MUST tener texto alternativo descriptivo. Las imágenes decorativas MUST tener alt vacío (alt="").

**Compartir cotización por WhatsApp**

- **FR-050**: La plataforma MUST incluir un botón de compartir por WhatsApp en la vista de cotización, disponible para todos los usuarios (gratuitos y premium). Al presionarlo, MUST abrir WhatsApp del usuario (aplicación móvil o WhatsApp Web) mediante un enlace `wa.me` con un mensaje prellenado que incluya un texto descriptivo de la cotización y un enlace de descarga del PDF generado.
- **FR-051**: El botón de WhatsApp MUST funcionar sin necesidad de API de WhatsApp Business ni de configuración por parte del administrador. Es un enlace estándar `wa.me` que no requiere credenciales ni gestión en el panel de administración.
- **FR-055**: Al compartir una cotización por WhatsApp, la plataforma MUST generar un enlace público temporal de descarga del PDF. El enlace MUST ser accesible por cualquier persona sin necesidad de cuenta en la plataforma y MUST expirar automáticamente después de 7 días.
- **FR-056**: Si un destinatario intenta acceder a un enlace de descarga de PDF expirado, MUST ver un mensaje indicando que el enlace ya no está disponible y que debe solicitar uno nuevo al remitente.

**Visor de base de datos (administrador)**

- **FR-052**: El panel de administración MUST incluir una sección de visor de base de datos que permita al administrador consultar las tablas y registros del sistema en modo solo lectura, con vista paginada y búsqueda básica por campos.
- **FR-053**: El visor de base de datos MUST NOT permitir insertar, modificar ni eliminar registros. Es exclusivamente de consulta.
- **FR-054**: El visor de base de datos MUST respetar las restricciones de privacidad de FR-007: MUST NOT mostrar contenido de cotizaciones, datos de clientes del usuario ni información financiera personal. Solo MUST mostrar tablas operativas del sistema (usuarios, suscripciones, configuración, documentos legales, notificaciones, logs).

### Key Entities

- **Usuario**: Persona registrada en la plataforma. Atributos clave: nombre, correo electrónico (identificador único), rol (normal/administrador), tipo de cuenta (gratuita/premium), proveedores de autenticación vinculados (correo, Google, Facebook), fecha de registro, estado (activo/suspendido), aceptación de términos (fecha y versión aceptada).
- **Suscripción Premium**: Relación entre un usuario y su plan premium. Atributos: fecha de inicio, fecha de vencimiento, estado (activa/vencida/cancelada), referencia de transacción de la pasarela de pago.
- **Grupo de Clientes**: Agrupación lógica de clientes creada por un usuario premium. Atributos: nombre del grupo, usuario propietario, lista de clientes asignados.
- **Configuración de Plataforma**: Conjunto de parámetros editables por el administrador. Atributos: identificador AdSense, enlace pasarela MercadoPago, enlace pasarela PayPal, credenciales Google OAuth, credenciales Facebook OAuth, credenciales Gmail API (Client ID, Client Secret, correo remitente autorizado).
- **Documento Legal**: Texto legal versionado. Atributos: tipo (privacidad/SARLAFT/donaciones/términos), contenido, versión, fecha de publicación.
- **Aceptación de Términos**: Registro de la aceptación de un documento legal por un usuario. Atributos: usuario, documento legal, versión aceptada, fecha de aceptación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede registrarse e iniciar sesión con Google o Facebook en menos de 1 minuto (desde hacer clic hasta estar autenticado en la plataforma).
- **SC-002**: El administrador puede cambiar la configuración de AdSense, pasarelas de donación o autenticación social en menos de 2 minutos, y los cambios se reflejan inmediatamente sin despliegue.
- **SC-003**: Un usuario gratuito puede crear una cotización completa y descargar el PDF sin limitaciones funcionales (misma experiencia que hoy).
- **SC-004**: Un usuario premium, tras suscribirse, trabaja sin ningún anuncio visible y sus cotizaciones y clientes persisten entre sesiones indefinidamente mientras la suscripción esté activa.
- **SC-005**: El 100 % de los usuarios nuevos aceptan los términos legales antes de que su cuenta se active.
- **SC-006**: Los documentos legales son accesibles desde cualquier pantalla de la plataforma en máximo 2 clics.
- **SC-007**: El cuadro comparativo de cuentas muestra el precio en USD y equivalencia mensual, y es accesible desde al menos 3 puntos de la plataforma (menú, mensajes de restricción, pie de página o perfil).
- **SC-008**: La atribución "Creado por: Digital Pyme Solutions (DPS)" es visible en el pie de página de todas las pantallas de la plataforma.
- **SC-009**: Todas las pantallas de la plataforma pasan una auditoría WCAG 2.1 AA (verificable con herramientas como Lighthouse o axe): contraste suficiente, navegación completa por teclado, y compatibilidad con lectores de pantalla.
- **SC-010**: El administrador puede ver las notificaciones de errores del sistema (fallas de API, correos fallidos) en el panel de administración con un badge visible que indica alertas no leídas.
- **SC-011**: El usuario normal recibe retroalimentación visual clara (éxito, error o carga) para toda acción significativa (registro, login, guardado, pago, suscripción) en menos de 3 segundos.

## Textos Legales (Contenido Requerido)

### Política de Privacidad

La política de privacidad de la plataforma MUST incluir los siguientes puntos, redactados en español de Colombia conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013:

1. **Responsable del tratamiento**: Identificación de Digital Pyme Solutions (DPS) como responsable, con dirección de contacto y correo electrónico para ejercicio de derechos.
2. **Datos que se recopilan**: Nombre, correo electrónico, datos de perfil profesional (nombre del negocio, NIT/cédula, dirección, teléfono, logo — proporcionados voluntariamente por el usuario), datos de autenticación social (nombre y correo del proveedor), datos de navegación (cookies funcionales y, con consentimiento, cookies de publicidad de Google AdSense).
3. **Finalidad del tratamiento**: (a) Prestar el servicio de generación de cotizaciones; (b) gestionar la cuenta del usuario; (c) enviar comunicaciones relacionadas con el servicio (verificación de correo, recordatorios de suscripción); (d) mostrar publicidad personalizada mediante Google AdSense (solo con consentimiento); (e) procesar donaciones voluntarias a través de pasarelas de pago externas.
4. **Derechos del titular (ARCO)**: El titular tiene derecho a acceder, rectificar, cancelar (suprimir) y oponerse al tratamiento de sus datos personales, conforme al artículo 8 de la Ley 1581 de 2012.
5. **Procedimiento para ejercer los derechos**: Enviar solicitud al correo de contacto del responsable. Plazo de respuesta: 10 días hábiles para consultas, 15 días hábiles para reclamos (prorrogable 8 días más), conforme a los artículos 14 y 15 de la Ley 1581 de 2012.
6. **Transferencia de datos**: Los datos pueden ser compartidos con: Google (AdSense, autenticación, Gmail API para envío de correos transaccionales), Facebook (autenticación), pasarelas de pago (MercadoPago, PayPal — solo para procesar donaciones y suscripciones). No se venden ni comparten datos con terceros para fines no relacionados con el servicio.
7. **Vigencia**: La base de datos estará vigente mientras la plataforma esté en operación. Los datos de usuarios inactivos se eliminan según la política de retención (90 días después del vencimiento de la suscripción premium sin renovación; para cuentas gratuitas, los datos de perfil persisten mientras la cuenta exista).
8. **Cookies**: Descripción de cookies funcionales (necesarias para el servicio) y cookies de publicidad (Google AdSense, sujetas a consentimiento previo conforme a spec-004 FR-020/021/022).
9. **Autorización**: Al registrarse, el usuario autoriza el tratamiento de sus datos personales conforme a esta política. La autorización es libre, previa, expresa e informada.

### Texto sobre SARLAFT y Prevención de Lavado de Activos

El texto MUST incluir los siguientes puntos:

1. **Naturaleza de la plataforma**: PresupuestosPro es una plataforma de generación de cotizaciones profesionales operada por Digital Pyme Solutions (DPS). NO es una entidad financiera, cooperativa, aseguradora ni ninguna de las entidades vigiladas por la Superintendencia Financiera de Colombia (SFC) obligadas a implementar el Sistema de Administración del Riesgo de Lavado de Activos y de la Financiación del Terrorismo (SARLAFT) conforme a la Circular Externa 027 de 2020 de la SFC.
2. **Donaciones y pasarelas de pago**: Las donaciones voluntarias que los usuarios realizan a favor de la plataforma se procesan íntegramente a través de pasarelas de pago reguladas (MercadoPago y PayPal). Estas pasarelas están sujetas a sus propias obligaciones de debida diligencia, conocimiento del cliente (KYC) y prevención de lavado de activos conforme a la regulación aplicable en sus jurisdicciones. La plataforma no recibe, almacena ni procesa directamente medios de pago, datos de tarjetas ni información financiera de los usuarios.
3. **Suscripciones premium**: Los pagos por suscripción premium se procesan igualmente a través de pasarelas de pago reguladas. La plataforma solo recibe confirmación de pago exitoso, no datos financieros del suscriptor.
4. **Compromiso de la plataforma**: Aunque no está legalmente obligada a implementar SARLAFT, la plataforma se compromete a: (a) no facilitar operaciones que aparenten buscar el lavado de activos o la financiación del terrorismo; (b) reportar a las autoridades competentes (UIAF — Unidad de Información y Análisis Financiero) cualquier actividad inusual detectada, como patrones de donaciones sospechosos (múltiples donaciones de alto valor en períodos cortos desde una misma cuenta); (c) cooperar con las autoridades colombianas ante cualquier requerimiento legal.
5. **Límites de donaciones**: Conforme a spec-004, las donaciones se limitan a máximo 3 por día y 200.000 COP acumulados por usuario por día, como medida preventiva adicional.

### Texto sobre Manejo de Donaciones

El texto MUST incluir los siguientes puntos conforme a la legislación colombiana:

1. **Naturaleza de las donaciones**: Las donaciones realizadas en la plataforma son contribuciones voluntarias, espontáneas y sin contraprestación, destinadas al sostenimiento y desarrollo de la plataforma PresupuestosPro.
2. **No deducibilidad tributaria**: Las donaciones realizadas a Digital Pyme Solutions (DPS) NO son deducibles de impuestos para el donante. Conforme al artículo 257 del Estatuto Tributario colombiano, el descuento tributario por donaciones aplica únicamente a donaciones realizadas a entidades sin ánimo de lucro pertenecientes al régimen tributario especial (Art. 19 E.T.) y a otras entidades específicamente señaladas por la ley. DPS no pertenece a dicho régimen.
3. **Tratamiento tributario para la plataforma**: Las donaciones recibidas constituyen ingreso gravado para DPS y se declaran conforme a las obligaciones tributarias aplicables (impuesto sobre la renta y complementarios).
4. **No emisión de certificado**: DPS no emite certificado de donación ni factura electrónica por las donaciones recibidas, dado que no son una contraprestación por bienes o servicios.
5. **Irrevocabilidad**: Las donaciones realizadas son definitivas y no reembolsables. El usuario es informado de esta condición antes de confirmar cada donación.
6. **Procesamiento del pago**: El dinero de la donación se procesa a través de MercadoPago o PayPal. DPS no recibe, maneja ni almacena directamente medios de pago. El donante está sujeto a los términos y condiciones de la pasarela de pago elegida.
7. **Mayoría de edad**: Al realizar una donación, el usuario declara ser mayor de edad y tener capacidad legal para disponer de los fondos donados.

## Assumptions

- Los cambios son exclusivamente funcionales; no se modifica el diseño visual de la plataforma.
- Se conservan los medios de monetización existentes (AdSense y donaciones) definidos en spec-004. Se añade la suscripción premium como tercer canal de ingresos.
- El primer administrador se configura durante la instalación o despliegue inicial de la plataforma (seed en base de datos o variable de entorno).
- El precio de la suscripción premium ($20 USD/año) se muestra en USD y con equivalencia aproximada en COP al usuario. La conversión exacta la realiza la pasarela de pago al momento del cobro.
- La pasarela de pago para suscripciones premium es MercadoPago exclusivamente. Las donaciones se procesan mediante MercadoPago y PayPal (ambas opcionales para el usuario). El administrador puede configurar los enlaces de cada pasarela de forma independiente.
- El correo electrónico es el identificador único del usuario. La vinculación de cuentas sociales se basa en coincidencia de correo electrónico.
- Los límites de almacenamiento para premium (500 cotizaciones, 200 clientes, 50 grupos) son un punto de partida razonable para v1. El administrador no puede cambiar estos límites desde el panel.
- Los textos legales son contenido estático versionado. El administrador no los edita desde el panel; se actualizan mediante despliegue.
- DPS no es una entidad del régimen tributario especial, por lo que las donaciones no generan beneficio tributario para el donante.
- La plataforma cumple con la Ley 1581 de 2012 en cuanto al acceso del administrador a datos de usuarios: solo puede ver datos de perfil y estado de cuenta, no el contenido generado por los usuarios (cotizaciones, clientes).
