const { Resend } = require('resend');
const { SmtpService } = require('./smtp-service');
const { registrarNotificacion } = require('../models/notificacion');

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Envío transaccional: SMTP (Hostinger u otro) como primera opción, Resend como fallback.
class EmailService {
  constructor({
    apiKey = process.env.RESEND_API_KEY,
    remitente = process.env.EMAIL_REMITENTE || 'PresupuestosPro <no-responder@presupuestospro.co>',
  } = {}) {
    this.remitente = remitente;
    this.resend = apiKey ? new Resend(apiKey) : null;

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
    const smtpPort = process.env.SMTP_PORT || '465';

    this.smtp = smtpUser && smtpPass
      ? new SmtpService({ host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, remitente })
      : null;
  }

  async enviar({ para, asunto, html, texto }) {
    if (this.smtp) {
      for (let intento = 1; intento <= 3; intento++) {
        try {
          return await this.smtp.enviar({ para, asunto, html, texto });
        } catch (e) {
          if (intento === 3) {
            await registrarNotificacion({ tipo: 'correo_fallido', titulo: 'Error al enviar correo (SMTP)', descripcion: e.message }).catch(() => {});
          }
        }
      }
    }

    if (!this.resend) {
      console.log(`[correo no enviado: sin configuración] Para: ${para} | ${asunto}\n${texto}`);
      return { enviado: false };
    }

    for (let intento = 1; intento <= 3; intento++) {
      const { error } = await this.resend.emails.send({
        from: this.remitente,
        to: para,
        subject: asunto,
        html,
        text: texto,
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
      'Esta donación es voluntaria y no reembolsable.',
    ].join('\n');

    return this.enviar({
      para,
      asunto: 'Gracias por tu donación a PresupuestosPro',
      texto,
      html: texto.split('\n').map((linea) => `<p>${escapar(linea) || '&nbsp;'}</p>`).join(''),
    });
  }
}

module.exports = { EmailService };
