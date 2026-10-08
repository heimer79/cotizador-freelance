const { google } = require('googleapis');

class GmailService {
  constructor({ clientId, clientSecret, refreshToken, remitente }) {
    this.remitente = remitente;
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async enviar({ para, asunto, texto, html }) {
    const contenido = [
      `From: ${this.remitente}`,
      `To: ${para}`,
      `Subject: =?utf-8?B?${Buffer.from(asunto).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      html || texto
    ].join('\r\n');

    const raw = Buffer.from(contenido).toString('base64url');
    await this.gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    return { enviado: true };
  }
}

module.exports = { GmailService };
