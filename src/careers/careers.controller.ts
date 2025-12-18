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
import { CareersService } from './careers.service';
import { CreateCareerDto, UpdateCareerDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('careers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CareersController {
  constructor(private readonly careersService: CareersService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createCareerDto: CreateCareerDto) {
    return this.careersService.create(createCareerDto);
  }

  @Get()
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
    @Query('facultyId') facultyId?: string,
  ) {
    return this.careersService.findAll(includeInactive || false, facultyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.careersService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCareerDto: UpdateCareerDto,
  ) {
    return this.careersService.update(id, updateCareerDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.careersService.remove(id);
  }
}
