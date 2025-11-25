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
      subject: 'Verify your email address',
      html: `
        <h1>Email Verification</h1>
        <p>Thank you for registering. Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>This link will expire in 24 hours.</p>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      `,
    });
  }

  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to,
      subject: 'Welcome to Tesis Seguimiento',
      html: `
        <h1>Welcome, ${firstName}!</h1>
        <p>Your email has been verified successfully.</p>
        <p>You can now start using all the features of our platform.</p>
      `,
    });
  }
}
