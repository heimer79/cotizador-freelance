const nodemailer = require('nodemailer');

class SmtpService {
  constructor({ host, port, user, pass, remitente }) {
    this.remitente = remitente || user;
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });
  }

  async verificar() {
    await this.transporter.verify();
  }

  async enviar({ para, asunto, html, texto }) {
    await this.transporter.sendMail({
      from: this.remitente,
      to: para,
      subject: asunto,
      html,
      text: texto,
    });
    return { enviado: true };
  }
}

module.exports = { SmtpService };
