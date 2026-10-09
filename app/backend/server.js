require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');

const { abrirBaseDatos } = require('./db');
const {
  crearMiddlewareSesion,
  crearMiddlewareSesionExtendido,
  soloVerificadosParaEscribir,
  soloAdmin,
  verificarEstado,
  verificarPremium,
  crearMiddlewareRequiereAceptacionLegal,
  passport,
  configurarPassport
} = require('./auth');
const { EmailService } = require('./src/services/email-service');
const crearRutasAuth = require('./rutas/auth');
const crearRutasClientes = require('./rutas/clientes');
const crearRutasCatalogo = require('./rutas/catalogo');
const { crearRutasCotizaciones, crearRutasPlantillasPdf, crearRutasCompartirDescarga } = require('./rutas/cotizaciones');
const crearRutasPerfil = require('./rutas/perfil');
const crearRutasGrupos = require('./rutas/grupos');
const crearRutasConfigAds = require('./src/api/ads-config');
const { crearRutasDonaciones } = require('./src/api/donaciones');
const crearRutasWebhookDonaciones = require('./src/api/donaciones-webhook');
const crearRutasLegal = require('./src/api/legal');
const { crearRutasCrearEnlace, crearRutasAccesoEnlace } = require('./src/api/compartir');
const crearRutasAdmin = require('./src/api/admin');
const crearRutasSuscripcion = require('./src/api/suscripcion');
const { procesarTransiciones } = require('./src/models/suscripcion');
const { limpiarExpirados } = require('./src/models/enlace-temporal');

function crearApp(db, opciones = {}) {
  const app = express();
  const correo = opciones.correo || new EmailService();
  const requiereSesion = crearMiddlewareSesionExtendido(db);
  const requiereAceptacionLegal = crearMiddlewareRequiereAceptacionLegal(db);
  const estadoCheck = verificarEstado();
  const protegidas = [requiereSesion, estadoCheck, soloVerificadosParaEscribir];

  // T061: Seguridad HTTP headers (FR-044)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'unpkg.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(passport.initialize());

  app.use('/api/auth', crearRutasAuth(db, correo));
  app.use('/api/config', crearRutasConfigAds());
  app.use('/api/donaciones/webhook', crearRutasWebhookDonaciones(db, correo));
  app.use('/api/legal', crearRutasLegal(requiereSesion));
  app.use('/api/admin', requiereSesion, estadoCheck, crearRutasAdmin(db, soloAdmin()));
  app.use('/api/suscripcion', crearRutasSuscripcion(db, requiereSesion, verificarPremium(), correo));

  const protegidasConLegal = [...protegidas, requiereAceptacionLegal];
  app.use('/api/clientes', ...protegidasConLegal, crearRutasClientes(db));
  app.use('/api/catalogo', ...protegidasConLegal, crearRutasCatalogo(db));
  app.use('/api/cotizaciones', ...protegidasConLegal, crearRutasCotizaciones(db));
  app.use('/api/perfil', ...protegidasConLegal, crearRutasPerfil(db));
  app.use('/api/donaciones', requiereSesion, estadoCheck, crearRutasDonaciones(db));
  app.use('/api/grupos', ...protegidasConLegal, verificarPremium(), crearRutasGrupos(db));
  // Compartir por WhatsApp está disponible para cualquier cuenta (gratuita, premium o admin).
  app.use('/api/cotizaciones/compartir', crearRutasCrearEnlace(db, requiereSesion, (req, res, next) => next()));
  app.use('/compartir', crearRutasAccesoEnlace());
  // T038: Listado de plantillas PDF (FR-024)
  app.use('/api/plantillas-pdf', ...protegidasConLegal, crearRutasPlantillasPdf(db));
  // T046: Descarga pública por enlace temporal (FR-031)
  app.use('/api/compartir/descargar', crearRutasCompartirDescarga(db));

  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error inesperado del servidor' });
  });

  return app;
}

async function tareasPeriodicas(db, correoService) {
  // Lifecycle suscripciones
  await procesarTransiciones().catch((e) => console.error('procesarTransiciones:', e.message));
  // Limpiar PDFs expirados
  await limpiarExpirados().catch((e) => console.error('limpiarExpirados:', e.message));
  // Limpiar cotizaciones temporales (> 24h sin actividad)
  await db.run(
    `DELETE FROM cotizaciones WHERE temporal = 1 AND ultima_actividad < DATE_SUB(NOW(), INTERVAL 24 HOUR)`
  ).catch(() => {});
  // Recordatorio de renovación (10 días y 1 día antes)
  if (correoService) {
    const proximas = await db.all(
      `SELECT u.email, u.nombre_completo, s.fecha_vencimiento
       FROM suscripciones s JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.estado = 'activa'
         AND (
           (s.fecha_vencimiento BETWEEN DATE_ADD(NOW(), INTERVAL 9 DAY) AND DATE_ADD(NOW(), INTERVAL 10 DAY))
           OR
           (s.fecha_vencimiento BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 DAY))
         )
         AND NOT EXISTS (
           SELECT 1 FROM historial_actividad h WHERE h.usuario_id = s.usuario_id AND h.tipo = 'login'
             AND h.detalle = 'recordatorio_enviado' AND h.fecha > DATE_SUB(NOW(), INTERVAL 2 DAY)
         )`
    ).catch(() => []);

    for (const u of proximas) {
      await correoService.enviar({
        para: u.email,
        asunto: 'Tu suscripción Premium vence pronto — PresupuestosPro',
        texto: `Hola ${u.nombre_completo}, tu suscripción Premium vence el ${new Date(u.fecha_vencimiento).toLocaleDateString('es-CO')}. Renueva desde tu perfil.`,
        html: `<p>Hola ${u.nombre_completo},</p><p>Tu suscripción Premium vence el <strong>${new Date(u.fecha_vencimiento).toLocaleDateString('es-CO')}</strong>. <a href="${process.env.APP_URL || 'http://localhost:3000'}">Renueva desde tu perfil</a>.</p>`
      }).catch(() => {});
    }
  }
}

async function iniciar() {
  const db = await abrirBaseDatos();
  await configurarPassport(db);
  const correoService = new EmailService();
  const app = crearApp(db, { correo: correoService });
  const puerto = process.env.PORT || 3000;
  app.listen(puerto, () => {
    console.log(`PresupuestosPro escuchando en el puerto ${puerto}`);
  });
  // Ejecutar tareas periódicas al inicio y cada 6 horas
  tareasPeriodicas(db, correoService).catch(() => {});
  setInterval(() => tareasPeriodicas(db, correoService).catch(() => {}), 6 * 60 * 60 * 1000);
}

iniciar().catch((err) => {
  console.error('Error al iniciar la aplicación:', err);
  process.exit(1);
});

module.exports = { crearApp };
