import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/create-course.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @ApiOperation({ summary: 'Barcha kurslar ro\'yxati (sahifalash va izlash bilan)' })
  @Get()
  findAll(@TenantId() centerId: string, @Query() query: PaginationQueryDto) {
    return this.coursesService.findAll(centerId, query);
  }

  @ApiOperation({ summary: 'Kursni ID bo\'yicha olish' })
  @Get(':id')
  findOne(@TenantId() centerId: string, @Param('id') id: string) {
    return this.coursesService.findOne(centerId, id);
  }

  @ApiOperation({ summary: 'Yangi kurs yaratish' })
  @Post()
  create(@TenantId() centerId: string, @Body() dto: CreateCourseDto) {
    return this.coursesService.create(centerId, dto);
  }

  @ApiOperation({ summary: 'Kurs ma\'lumotlarini tahrirlash' })
  @Patch(':id')
  update(
    @TenantId() centerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(centerId, id, dto);
  }

  @ApiOperation({ summary: 'Kursni o\'chirish' })
  @Delete(':id')
  remove(@TenantId() centerId: string, @Param('id') id: string) {
    return this.coursesService.remove(centerId, id);
  }
}
