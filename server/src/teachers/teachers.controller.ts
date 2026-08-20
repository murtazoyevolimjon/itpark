import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto, UpdateTeacherDto } from './dto/create-teacher.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @ApiOperation({ summary: 'Barcha ustozlar ro\'yxati' })
  @Get()
  findAll(@TenantId() centerId: string, @Query() query: PaginationQueryDto) {
    return this.teachersService.findAll(centerId, query);
  }

  @ApiOperation({ summary: 'Ustozni ID bo\'yicha olish' })
  @Get(':id')
  findOne(@TenantId() centerId: string, @Param('id') id: string) {
    return this.teachersService.findOne(centerId, id);
  }

  @ApiOperation({ summary: 'Yangi ustoz yaratish' })
  @Post()
  create(@TenantId() centerId: string, @Body() dto: CreateTeacherDto) {
    return this.teachersService.create(centerId, dto);
  }

  @ApiOperation({ summary: 'Ustoz ma\'lumotlarini tahrirlash' })
  @Patch(':id')
  update(
    @TenantId() centerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachersService.update(centerId, id, dto);
  }

  @ApiOperation({ summary: 'Ustozni o\'chirish' })
  @Delete(':id')
  remove(@TenantId() centerId: string, @Param('id') id: string) {
    return this.teachersService.remove(centerId, id);
  }
}
