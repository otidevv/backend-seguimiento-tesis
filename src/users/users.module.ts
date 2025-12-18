import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [EnrollmentsModule, MailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
