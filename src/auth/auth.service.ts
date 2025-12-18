import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService, // Usado para password reset
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      // El correo de verificacion se envia automaticamente en usersService.create()
      const user = await this.usersService.create(registerDto);

      const { password, ...result } = user;

      return {
        user: result,
        message: 'Usuario registrado exitosamente. Revisa tu correo para verificar tu cuenta.',
      };
    } catch (error) {
      this.logger.error('Error en registro:', error);
      if (error instanceof ConflictException) {
        throw error;
      }
      // Re-throw con mensaje mas descriptivo
      throw new ConflictException(error.message || 'Error al crear la cuenta. Intenta nuevamente.');
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Debes verificar tu correo electronico antes de iniciar sesion. Revisa tu bandeja de entrada.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tu cuenta esta inactiva. Contacta al administrador.');
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      (user as any).roles,
      (user as any).facultyId ?? undefined,
    );

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    // Find the refresh token in database
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: { token: refreshToken, isRevoked: false },
      include: { user: { include: { roles: true } } },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(
      tokenRecord.user.id,
      tokenRecord.user.email,
      tokenRecord.user.roles,
      tokenRecord.user.facultyId ?? undefined,
    );

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    // Save new refresh token
    await this.saveRefreshToken(tokenRecord.user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    // Revoke the refresh token
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: { token: refreshToken, userId },
    });

    if (tokenRecord) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true },
      });
    }

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    // Revoke all refresh tokens for the user
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    return { message: 'Logged out from all devices' };
  }

  private async generateTokens(
    userId: string,
    email: string,
    roles: any[],
    facultyId?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const roleNames = roles.map((role) => role.name);

    const payload: JwtPayload = {
      sub: userId,
      email,
      roles: roleNames,
      facultyId,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'default-secret',
      expiresIn: (this.configService.get<string>('JWT_EXPIRATION') ||
        '15m') as any,
    });

    // Generate refresh token
    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'default-refresh-secret',
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION') ||
        '7d') as any,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async saveRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    const expiresAt = new Date();
    const expirationStr =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
    const expirationDays = parseInt(expirationStr.replace('d', ''));
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists
      return {
        message: 'Si el correo existe, se enviara un enlace de recuperacion',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

    await this.usersService.setPasswordResetToken(email, resetToken, expiresAt);

    // Send password reset email
    try {
      await this.mailService.sendPasswordResetEmail(user.email, resetToken);
      this.logger.log(`Correo de recuperacion enviado a ${user.email}`);
    } catch (emailError) {
      this.logger.error(`Error al enviar correo de recuperacion a ${user.email}:`, emailError);
    }

    return {
      message: 'Si el correo existe, se enviara un enlace de recuperacion',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    await this.usersService.resetPassword(token, newPassword);

    return {
      message: 'Password reset successfully',
    };
  }
}
