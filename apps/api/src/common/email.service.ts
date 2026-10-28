import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Payment, User } from '../database/entities';
import { PaymentStatus } from '../database/enums';

interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  isConfigured() {
    const smtp = this.getSmtpConfig();
    return Boolean(smtp.host && smtp.user && smtp.pass);
  }

  getFrontendUrl() {
    return (
      process.env.FRONTEND_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      'http://localhost:5173'
    ).replace(/\/$/, '');
  }

  async sendCredentials(user: User, username: string, password: string) {
    const fullName = `${user.firstName} ${user.lastName}`;
    const safeName = this.escapeHtml(fullName);
    const safeUsername = this.escapeHtml(username);
    const safePassword = this.escapeHtml(password);
    return this.sendMail({
      to: user.email,
      subject: 'Tus credenciales del Instituto Universitario Esparta',
      text: [
        `Hola ${fullName},`,
        '',
        'Tu cuenta del portal académico ya está lista.',
        '',
        `Usuario: ${username}`,
        `Contraseña temporal: ${password}`,
        '',
        `Ingresa en: ${this.getFrontendUrl()}`,
        'Por seguridad, cambia tu contraseña después de iniciar sesión.',
      ].join('\n'),
      html: `
        <p>Hola ${safeName},</p>
        <p>Tu cuenta del portal académico ya está lista.</p>
        <p><strong>Usuario:</strong> ${safeUsername}<br />
        <strong>Contraseña temporal:</strong> ${safePassword}</p>
        <p><a href="${this.getFrontendUrl()}">Entrar al portal</a></p>
        <p>Por seguridad, cambia tu contraseña después de iniciar sesión.</p>
      `,
    });
  }

  async sendPasswordReset(user: User, resetUrl: string) {
    const fullName = `${user.firstName} ${user.lastName}`;
    const safeName = this.escapeHtml(fullName);
    const safeResetUrl = this.escapeHtml(resetUrl);
    return this.sendMail({
      to: user.email,
      subject: 'Restablece tu contraseña del portal Esparta',
      text: [
        `Hola ${fullName},`,
        '',
        'Recibimos una solicitud para restablecer tu contraseña.',
        'Abre este enlace para crear una nueva contraseña:',
        resetUrl,
        '',
        'Este enlace caduca en 1 hora. Si no solicitaste el cambio, puedes ignorar este correo.',
      ].join('\n'),
      html: `
        <p>Hola ${safeName},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p><a href="${safeResetUrl}">Crear nueva contraseña</a></p>
        <p>Este enlace caduca en 1 hora. Si no solicitaste el cambio, puedes ignorar este correo.</p>
      `,
    });
  }

  async sendPaymentReceipt(payment: Payment, receiptPdf: Buffer) {
    const fullName = `${payment.student.firstName} ${payment.student.lastName}`;
    const safeName = this.escapeHtml(fullName);
    const safeTerm = this.escapeHtml(payment.term.name);
    const isPaid = payment.status === PaymentStatus.PAID;
    const status = isPaid ? 'Pago total' : 'Abono parcial';
    const amount = payment.amount.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
    const paidAt = payment.paidAt
      ? new Intl.DateTimeFormat('es-MX', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(payment.paidAt)
      : 'Sin fecha registrada';

    return this.sendMail({
      to: payment.student.email,
      subject: `Recibo de pago - ${payment.term.name}`,
      text: [
        `Hola ${fullName},`,
        '',
        `Registramos tu ${status.toLowerCase()} correspondiente al periodo ${payment.term.name}.`,
        `Monto recibido: ${amount}`,
        `Fecha de pago: ${paidAt}`,
        '',
        'Adjuntamos tu recibo en formato PDF.',
        '',
        'Instituto Universitario Esparta',
        'Campus Guatacalca',
      ].join('\n'),
      html: `
        <p>Hola ${safeName},</p>
        <p>Registramos tu <strong>${status.toLowerCase()}</strong> correspondiente al periodo <strong>${safeTerm}</strong>.</p>
        <p><strong>Monto recibido:</strong> ${amount}<br />
        <strong>Fecha de pago:</strong> ${paidAt}</p>
        <p>Adjuntamos tu recibo en formato PDF.</p>
        <p>Instituto Universitario Esparta<br />Campus Guatacalca</p>
      `,
      attachments: [
        {
          filename: `recibo-${payment.term.name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.pdf`,
          content: receiptPdf,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  private async sendMail(message: MailMessage) {
    const smtp = this.getSmtpConfig();

    if (!smtp.host || !smtp.user || !smtp.pass) {
      if (process.env.NODE_ENV !== 'test') {
        this.logger.warn(
          `SMTP incompleto; correo no enviado a ${message.to}. Asunto: ${message.subject}`,
        );
      }
      return { delivered: false };
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    await transporter.sendMail({
      from: smtp.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments,
    });

    return { delivered: true };
  }

  private getSmtpConfig() {
    const user = process.env.SMTP_USER?.trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const host =
      process.env.SMTP_HOST?.trim() ||
      (user?.toLowerCase().endsWith('@gmail.com') ? 'smtp.gmail.com' : '');

    return {
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      user,
      pass: process.env.SMTP_PASS,
      from:
        process.env.SMTP_FROM ||
        (user
          ? `Instituto Universitario Esparta <${user}>`
          : 'Instituto Universitario Esparta <no-reply@esparta.edu.mx>'),
    };
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
