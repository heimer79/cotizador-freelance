const { Resend } = require('resend');

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Envío transaccional con Resend (RESEND_API_KEY). Sin clave, el correo se registra en consola
// para que el desarrollo local pueda seguir el flujo sin depender de un proveedor externo.
class EmailService {
  constructor({ apiKey = process.env.RESEND_API_KEY, remitente = process.env.EMAIL_REMITENTE || 'PresupuestosPro <no-responder@presupuestospro.co>' } = {}) {
    this.remitente = remitente;
    this.cliente = apiKey ? new Resend(apiKey) : null;
  }

  async enviar({ para, asunto, html, texto }) {
    if (!this.cliente) {
      console.log(`[correo no enviado: falta RESEND_API_KEY] Para: ${para} | ${asunto}\n${texto}`);
      return { enviado: false };
    }

    const { error } = await this.cliente.emails.send({
      from: this.remitente,
      to: para,
      subject: asunto,
      html,
      text: texto
    });

    if (error) {
      throw new Error(`Resend rechazó el correo: ${error.message}`);
    }
    return { enviado: true };
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
