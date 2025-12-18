import { Module } from '@nestjs/common';
import { ThesesController } from './theses.controller';
import { ThesesService } from './theses.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeadlinesModule } from '../deadlines/deadlines.module';

@Module({
  imports: [NotificationsModule, DeadlinesModule],
  controllers: [ThesesController],
  providers: [ThesesService],
  exports: [ThesesService],
})
export class ThesesModule {}
