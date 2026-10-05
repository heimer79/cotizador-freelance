const path = require('path');
const express = require('express');

const { abrirBaseDatos } = require('./db');
const { crearMiddlewareSesion, soloVerificadosParaEscribir } = require('./auth');
const { EmailService } = require('./src/services/email-service');
const crearRutasAuth = require('./rutas/auth');
const crearRutasClientes = require('./rutas/clientes');
const crearRutasCatalogo = require('./rutas/catalogo');
const crearRutasCotizaciones = require('./rutas/cotizaciones');
const crearRutasPerfil = require('./rutas/perfil');
const crearRutasConfigAds = require('./src/api/ads-config');
const { crearRutasDonaciones } = require('./src/api/donaciones');
const crearRutasWebhookDonaciones = require('./src/api/donaciones-webhook');

function crearApp(db, opciones = {}) {
  const app = express();
  const correo = opciones.correo || new EmailService();
  const requiereSesion = crearMiddlewareSesion(db);
  const protegidas = [requiereSesion, soloVerificadosParaEscribir];

  app.use(express.json({ limit: '2mb' }));

  // Públicas: autenticación, configuración de publicidad y webhook de la pasarela (valida su firma).
  app.use('/api/auth', crearRutasAuth(db, correo));
  app.use('/api/config', crearRutasConfigAds());
  app.use('/api/donaciones/webhook', crearRutasWebhookDonaciones(db, correo));

  app.use('/api/clientes', ...protegidas, crearRutasClientes(db));
  app.use('/api/catalogo', ...protegidas, crearRutasCatalogo(db));
  app.use('/api/cotizaciones', ...protegidas, crearRutasCotizaciones(db));
  app.use('/api/perfil', ...protegidas, crearRutasPerfil(db));
  app.use('/api/donaciones', requiereSesion, crearRutasDonaciones(db));

  app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error inesperado del servidor' });
  });

  return app;
}

if (require.main === module) {
  const db = abrirBaseDatos();
  const app = crearApp(db);
  const puerto = process.env.PORT || 3000;
  app.listen(puerto, () => {
    console.log(`PresupuestosPro escuchando en el puerto ${puerto}`);
  });
}

module.exports = { crearApp };
