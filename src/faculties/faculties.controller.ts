import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { FacultiesService } from './faculties.service';
import { CreateFacultyDto, UpdateFacultyDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('faculties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacultiesController {
  constructor(private readonly facultiesService: FacultiesService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createFacultyDto: CreateFacultyDto) {
    return this.facultiesService.create(createFacultyDto);
  }

  @Get()
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    return this.facultiesService.findAll(includeInactive || false);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.facultiesService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFacultyDto: UpdateFacultyDto,
  ) {
    return this.facultiesService.update(id, updateFacultyDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.facultiesService.remove(id);
  }
}
