import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Get,
  Query,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

@Controller('auth')
export class AuthController {
  private readonly externalTeacherApiUrl: string;
  private readonly externalApiToken: string;

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.externalTeacherApiUrl = this.configService.get<string>(
      'EXTERNAL_TEACHER_API_URL',
      'https://daa-documentos.unamad.edu.pe:8081/api/data/teacher',
    );
    this.externalApiToken = this.configService.get<string>('EXTERNAL_API_TOKEN', '');
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.refreshAccessToken(
      refreshTokenDto.refreshToken,
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: any,
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    return await this.authService.logout(
      user.userId,
      refreshTokenDto.refreshToken,
    );
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: any) {
    return await this.authService.logoutAll(user.userId);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return await this.authService.requestPasswordReset(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return await this.authService.resetPassword(token, newPassword);
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token de verificacion no proporcionado');
    }

    const user = await this.usersService.verifyEmail(token);

    // Enviar correo de bienvenida (no debe fallar la verificacion si el correo falla)
    try {
      await this.mailService.sendWelcomeEmail(user.email, user.firstName);
    } catch (error) {
      console.error('Error al enviar correo de bienvenida:', error);
      // No lanzar error, la verificacion fue exitosa
    }

    return {
      message: 'Correo verificado exitosamente',
    };
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body('email') email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return {
        message: 'If the email exists, a verification link will be sent',
      };
    }

    if (user.isEmailVerified) {
      return {
        message: 'Email is already verified',
      };
    }

    const crypto = await import('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await this.usersService.setEmailVerificationToken(
      user.id,
      verificationToken,
    );
    await this.mailService.sendEmailVerification(user.email, verificationToken);

    return {
      message: 'Verification email sent',
    };
  }

  @Get('lookup-dni/:dni')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @HttpCode(HttpStatus.OK)
  async lookupDni(@Param('dni') dni: string) {
    // Validar formato de DNI
    if (!/^\d{8}$/.test(dni)) {
      throw new BadRequestException('El DNI debe tener exactamente 8 dígitos');
    }

    // 1. Primero consultar la API de docentes
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.externalApiToken) {
        headers['Authorization'] = `Bearer ${this.externalApiToken}`;
      }

      const teacherResponse = await fetch(`${this.externalTeacherApiUrl}/${dni}`, { headers });

      if (teacherResponse.ok) {
        const teacherData = await teacherResponse.json();

        // Si encontramos al docente, devolver sus datos con email
        if (teacherData && teacherData.name) {
          return {
            dni: teacherData.dni,
            firstName: teacherData.name,
            paternalSurname: teacherData.paternalSurname,
            maternalSurname: teacherData.maternalSurname,
            email: teacherData.email, // Email institucional del docente
            isTeacher: true,
          };
        }
      }
    } catch {
      // Si falla la API de docentes, continuar con RENIEC
    }

    // 2. Si no es docente, consultar API de RENIEC
    try {
      const response = await fetch(`https://apidatos.unamad.edu.pe/api/consulta/${dni}`);

      if (!response.ok) {
        throw new NotFoundException('No se encontró información para este DNI');
      }

      const data = await response.json();

      if (!data || !data.NOMBRES) {
        throw new NotFoundException('No se encontró información para este DNI');
      }

      // Retornar solo los campos necesarios
      return {
        dni: data.DNI,
        firstName: data.NOMBRES,
        paternalSurname: data.AP_PAT,
        maternalSurname: data.AP_MAT,
        isTeacher: false,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al consultar el servicio de RENIEC');
    }
  }
}
