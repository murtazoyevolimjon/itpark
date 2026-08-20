import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/create-student.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @ApiOperation({ summary: 'Barcha talabalar ro\'yxati' })
  @Get()
  findAll(@TenantId() centerId: string, @Query() query: PaginationQueryDto) {
    return this.studentsService.findAll(centerId, query);
  }

  @ApiOperation({ summary: 'Talabani ID bo\'yicha olish (barcha guruhlari, davomati va to\'lovlari bilan)' })
  @Get(':id')
  findOne(@TenantId() centerId: string, @Param('id') id: string) {
    return this.studentsService.findOne(centerId, id);
  }

  @ApiOperation({ summary: 'Yangi talaba qo\'shish' })
  @Post()
  create(@TenantId() centerId: string, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(centerId, dto);
  }

  @ApiOperation({ summary: 'Talaba ma\'lumotlarini tahrirlash' })
  @Patch(':id')
  update(
    @TenantId() centerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(centerId, id, dto);
  }

  @ApiOperation({ summary: 'Talabani o\'chirish' })
  @Delete(':id')
  remove(@TenantId() centerId: string, @Param('id') id: string) {
    return this.studentsService.remove(centerId, id);
  }
}
