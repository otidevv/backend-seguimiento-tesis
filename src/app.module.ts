import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { FacultiesModule } from './faculties/faculties.module';
import { CareersModule } from './careers/careers.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { ThesesModule } from './theses/theses.module';
import { ReviewsModule } from './reviews/reviews.module';
import { DeadlinesModule } from './deadlines/deadlines.module';
import { SystemModulesModule } from './system-modules/system-modules.module';
import { MilestonesModule } from './milestones/milestones.module';
import { DocumentsModule } from './documents/documents.module';
import { CommentsModule } from './comments/comments.module';
import { StatisticsModule } from './statistics/statistics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ResolutionsModule } from './resolutions/resolutions.module';
import { AnnotationsModule } from './annotations/annotations.module';
import { SignedDocumentsModule } from './signed-documents/signed-documents.module';

@Module({
  imports: [
    // Config Module - Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Prisma Module - PostgreSQL Database
    PrismaModule,

    // Throttler Module - Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL') || 60,
          limit: configService.get<number>('THROTTLE_LIMIT') || 10,
        },
      ],
      inject: [ConfigService],
    }),

    // Feature Modules
    UsersModule,
    AuthModule,
    MailModule,
    FacultiesModule,
    CareersModule,
    EnrollmentsModule,
    ThesesModule,
    ReviewsModule,
    DeadlinesModule,
    SystemModulesModule,
    MilestonesModule,
    DocumentsModule,
    CommentsModule,
    StatisticsModule,
    NotificationsModule,
    ResolutionsModule,
    AnnotationsModule,
    SignedDocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
