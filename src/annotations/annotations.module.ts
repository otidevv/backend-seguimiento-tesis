import { Module } from '@nestjs/common';
import { AnnotationsController } from './annotations.controller';
import { AnnotationsService } from './annotations.service';
import { AnnotationsGateway } from './annotations.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AnnotationsController],
  providers: [AnnotationsService, AnnotationsGateway],
  exports: [AnnotationsService],
})
export class AnnotationsModule {}
