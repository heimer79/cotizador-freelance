const { Resend } = require('resend');
const { GmailService } = require('./gmail-service');
const { registrarNotificacion } = require('../models/notificacion');

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Envío transaccional con Gmail API (si está configurado) o Resend como fallback.
class EmailService {
  constructor({ apiKey = process.env.RESEND_API_KEY, remitente = process.env.EMAIL_REMITENTE || 'PresupuestosPro <no-responder@presupuestospro.co>' } = {}) {
    this.remitente = remitente;
    this.cliente = apiKey ? new Resend(apiKey) : null;
    this._gmailService = null;
  }

  async _obtenerGmail() {
    if (this._gmailService !== null) return this._gmailService;
    try {
      const config = require('../models/configuracion-plataforma');
      const clientId = await config.obtener('gmail_client_id');
      const clientSecret = await config.obtener('gmail_client_secret');
      const refreshToken = await config.obtener('gmail_refresh_token');
      const remitente = await config.obtener('gmail_correo_remitente');
      if (clientId && clientSecret && refreshToken && remitente) {
        this._gmailService = new GmailService({ clientId, clientSecret, refreshToken, remitente });
      } else {
        this._gmailService = false;
      }
    } catch {
      this._gmailService = false;
    }
    return this._gmailService;
  }

  async enviar({ para, asunto, html, texto }) {
    const gmail = await this._obtenerGmail();
    if (gmail) {
      for (let intento = 1; intento <= 3; intento++) {
        try {
          return await gmail.enviar({ para, asunto, html, texto });
        } catch (e) {
          if (intento === 3) {
            await registrarNotificacion({ tipo: 'correo_fallido', titulo: 'Error al enviar correo (Gmail)', descripcion: e.message }).catch(() => {});
            break;
          }
        }
      }
    }

    if (!this.cliente) {
      console.log(`[correo no enviado: sin configuración] Para: ${para} | ${asunto}\n${texto}`);
      return { enviado: false };
    }

    for (let intento = 1; intento <= 3; intento++) {
      const { error } = await this.cliente.emails.send({
        from: this.remitente,
        to: para,
        subject: asunto,
        html,
        text: texto
      });
      if (!error) return { enviado: true };
      if (intento === 3) {
        await registrarNotificacion({ tipo: 'correo_fallido', titulo: 'Error al enviar correo (Resend)', descripcion: error.message }).catch(() => {});
        throw new Error(`No se pudo enviar el correo: ${error.message}`);
      }
    }
    return { enviado: false };
  }

  enviarConfirmacionDonacion({ para, nombre, monto, referencia, fecha }) {
    const montoFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(monto);
    const fechaFormateada = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(fecha));
    const texto = [
      `Hola ${nombre},`,
      '',
      'Gracias por apoyar PresupuestosPro. Recibimos tu donación voluntaria:',
      `Monto: ${montoFormateado}`,
      `Fecha: ${fechaFormateada}`,
      `Referencia: ${referencia}`,
      '',
      'Esta donación es voluntaria y no reembolsable.'
    ].join('\n');

    return this.enviar({
      para,
      asunto: 'Gracias por tu donación a PresupuestosPro',
      texto,
      html: texto.split('\n').map((linea) => `<p>${escapar(linea) || '&nbsp;'}</p>`).join('')
    });
  }
}

module.exports = { EmailService };
