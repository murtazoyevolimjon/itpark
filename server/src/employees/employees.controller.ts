import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @ApiOperation({ summary: 'Barcha xodimlar ro\'yxati' })
  @Get()
  findAll(@TenantId() centerId: string, @Query() query: PaginationQueryDto) {
    return this.employeesService.findAll(centerId, query);
  }

  @ApiOperation({ summary: 'Xodimni ID bo\'yicha olish' })
  @Get(':id')
  findOne(@TenantId() centerId: string, @Param('id') id: string) {
    return this.employeesService.findOne(centerId, id);
  }

  @ApiOperation({ summary: 'Yangi xodim qo\'shish' })
  @Post()
  create(@TenantId() centerId: string, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(centerId, dto);
  }

  @ApiOperation({ summary: 'Xodim ma\'lumotlarini tahrirlash' })
  @Patch(':id')
  update(
    @TenantId() centerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(centerId, id, dto);
  }

  @ApiOperation({ summary: 'Xodimni o\'chirish' })
  @Delete(':id')
  remove(@TenantId() centerId: string, @Param('id') id: string) {
    return this.employeesService.remove(centerId, id);
  }
}
