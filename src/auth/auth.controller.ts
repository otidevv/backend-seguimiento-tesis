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
} from '@nestjs/common';
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
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

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
    const user = await this.usersService.verifyEmail(token);
    await this.mailService.sendWelcomeEmail(user.email, user.firstName);

    return {
      message: 'Email verified successfully',
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
}
