import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/create-expense.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @ApiOperation({ summary: 'Barcha chiqimlar ro\'yxati' })
  @Get()
  findAll(@TenantId() centerId: string, @Query() query: PaginationQueryDto) {
    return this.expensesService.findAll(centerId, query);
  }

  @ApiOperation({ summary: 'Chiqimni ID bo\'yicha olish' })
  @Get(':id')
  findOne(@TenantId() centerId: string, @Param('id') id: string) {
    return this.expensesService.findOne(centerId, id);
  }

  @ApiOperation({ summary: 'Yangi chiqim qo\'shish' })
  @Post()
  create(@TenantId() centerId: string, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(centerId, dto);
  }

  @ApiOperation({ summary: 'Chiqimni tahrirlash' })
  @Patch(':id')
  update(
    @TenantId() centerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(centerId, id, dto);
  }

  @ApiOperation({ summary: 'Chiqimni o\'chirish' })
  @Delete(':id')
  remove(@TenantId() centerId: string, @Param('id') id: string) {
    return this.expensesService.remove(centerId, id);
  }
}
