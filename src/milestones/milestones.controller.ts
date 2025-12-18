import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('milestones')
@UseGuards(JwtAuthGuard)
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  /**
   * Crea un nuevo hito
   */
  @Post()
  create(@Body() createMilestoneDto: CreateMilestoneDto, @CurrentUser() user: any) {
    return this.milestonesService.create(createMilestoneDto, user.userId);
  }

  /**
   * Obtiene los hitos de una tesis
   */
  @Get('thesis/:thesisId')
  findByThesis(@Param('thesisId', ParseUUIDPipe) thesisId: string) {
    return this.milestonesService.findByThesis(thesisId);
  }

  /**
   * Obtiene un hito por ID
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.milestonesService.findOne(id);
  }

  /**
   * Actualiza un hito
   */
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
    @CurrentUser() user: any,
  ) {
    return this.milestonesService.update(id, updateMilestoneDto, user.userId);
  }

  /**
   * Marca un hito como completado
   */
  @Post(':id/complete')
  complete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.milestonesService.complete(id, user.userId);
  }

  /**
   * Desmarca un hito como completado
   */
  @Post(':id/uncomplete')
  uncomplete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.milestonesService.uncomplete(id, user.userId);
  }

  /**
   * Elimina un hito
   */
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.milestonesService.remove(id, user.userId);
  }

  /**
   * Reordena los hitos de una tesis
   */
  @Post('thesis/:thesisId/reorder')
  reorder(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Body() body: { milestoneIds: string[] },
    @CurrentUser() user: any,
  ) {
    return this.milestonesService.reorder(thesisId, body.milestoneIds, user.userId);
  }
}
