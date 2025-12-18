import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to,
      subject: 'Verifica tu correo electronico - SeguiTesis',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a365d; margin: 0;">SeguiTesis</h1>
            <p style="color: #718096; margin: 5px 0;">Sistema de Seguimiento de Tesis</p>
          </div>

          <div style="background-color: #f7fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #2d3748; margin-top: 0;">Verificacion de Correo Electronico</h2>
            <p style="color: #4a5568; line-height: 1.6;">
              Gracias por registrarte en SeguiTesis. Para completar tu registro y activar tu cuenta,
              por favor haz clic en el siguiente boton:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}"
                 style="background-color: #3182ce; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 6px; font-weight: bold;
                        display: inline-block;">
                Verificar mi correo
              </a>
            </div>

            <p style="color: #718096; font-size: 14px;">
              Si el boton no funciona, copia y pega el siguiente enlace en tu navegador:
            </p>
            <p style="color: #3182ce; font-size: 12px; word-break: break-all;">
              ${verificationUrl}
            </p>
          </div>

          <div style="text-align: center; color: #a0aec0; font-size: 12px;">
            <p>Si no creaste una cuenta en SeguiTesis, puedes ignorar este correo.</p>
            <p>Este enlace expirara en 24 horas.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p>Universidad Nacional Amazonica de Madre de Dios</p>
          </div>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to,
      subject: 'Recuperacion de contraseñae - SeguiTesis',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a365d; margin: 0;">SeguiTesis</h1>
            <p style="color: #718096; margin: 5px 0;">Sistema de Seguimiento de Tesis</p>
          </div>

          <div style="background-color: #f7fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #2d3748; margin-top: 0;">Recuperacion de Contraseña</h2>
            <p style="color: #4a5568; line-height: 1.6;">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta.
              Haz clic en el siguiente boton para crear una nueva contraseña:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #e53e3e; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 6px; font-weight: bold;
                        display: inline-block;">
                Restablecer contraseña
              </a>
            </div>

            <p style="color: #718096; font-size: 14px;">
              Si el boton no funciona, copia y pega el siguiente enlace en tu navegador:
            </p>
            <p style="color: #3182ce; font-size: 12px; word-break: break-all;">
              ${resetUrl}
            </p>
          </div>

          <div style="text-align: center; color: #a0aec0; font-size: 12px;">
            <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.</p>
            <p style="color: #e53e3e; font-weight: bold;">Este enlace expirara en 1 hora.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p>Universidad Nacional Amazonica de Madre de Dios</p>
          </div>
        </div>
      `,
    });
  }

  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to,
      subject: 'Bienvenido a SeguiTesis',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a365d; margin: 0;">SeguiTesis</h1>
            <p style="color: #718096; margin: 5px 0;">Sistema de Seguimiento de Tesis</p>
          </div>

          <div style="background-color: #f0fff4; border-radius: 8px; padding: 30px; margin-bottom: 20px; border-left: 4px solid #38a169;">
            <h2 style="color: #276749; margin-top: 0;">¡Bienvenido, ${firstName}!</h2>
            <p style="color: #4a5568; line-height: 1.6;">
              Tu correo electronico ha sido verificado exitosamente. Ya puedes acceder a todas
              las funcionalidades de la plataforma.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${frontendUrl}/login"
                 style="background-color: #38a169; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 6px; font-weight: bold;
                        display: inline-block;">
                Iniciar sesion
              </a>
            </div>

            <p style="color: #4a5568; line-height: 1.6;">
              Con SeguiTesis podras:
            </p>
            <ul style="color: #4a5568; line-height: 1.8;">
              <li>Gestionar tu proyecto de tesis</li>
              <li>Subir y organizar documentos</li>
              <li>Comunicarte con tu asesor</li>
              <li>Dar seguimiento a tus avances</li>
            </ul>
          </div>

          <div style="text-align: center; color: #a0aec0; font-size: 12px;">
            <p>¿Tienes preguntas? Contacta a soporte@unamad.edu.pe</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p>Universidad Nacional Amazonica de Madre de Dios</p>
          </div>
        </div>
      `,
    });
  }
}
