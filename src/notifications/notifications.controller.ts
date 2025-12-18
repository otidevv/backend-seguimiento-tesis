import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Obtiene las notificaciones del usuario actual
   */
  @Get()
  findMyNotifications(
    @CurrentUser() user: any,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.notificationsService.findByUser(user.userId, limit || 20);
  }

  /**
   * Obtiene solo las notificaciones no leídas
   */
  @Get('unread')
  findUnread(@CurrentUser() user: any) {
    return this.notificationsService.findUnreadByUser(user.userId);
  }

  /**
   * Cuenta las notificaciones no leídas
   */
  @Get('unread/count')
  countUnread(@CurrentUser() user: any) {
    return this.notificationsService.countUnread(user.userId);
  }

  /**
   * Marca una notificación como leída
   */
  @Post(':id/read')
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  @Post('read-all')
  markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  /**
   * Elimina una notificación
   */
  @Delete(':id')
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.delete(id, user.userId);
  }

  /**
   * Elimina todas las notificaciones leídas
   */
  @Delete('read')
  deleteAllRead(@CurrentUser() user: any) {
    return this.notificationsService.deleteAllRead(user.userId);
  }
}
