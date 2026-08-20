import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({ summary: 'Barcha to\'lovlar ro\'yxati' })
  @Get()
  findAll(@TenantId() centerId: string, @Query() query: PaginationQueryDto) {
    return this.paymentsService.findAll(centerId, query);
  }

  @ApiOperation({ summary: 'To\'lovni ID bo\'yicha olish' })
  @Get(':id')
  findOne(@TenantId() centerId: string, @Param('id') id: string) {
    return this.paymentsService.findOne(centerId, id);
  }

  @ApiOperation({ summary: 'Yangi to\'lov qo\'shish' })
  @Post()
  create(
    @TenantId() centerId: string,
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(centerId, user.id, dto);
  }

  @ApiOperation({ summary: 'To\'lovni o\'chirish' })
  @Delete(':id')
  remove(@TenantId() centerId: string, @Param('id') id: string) {
    return this.paymentsService.remove(centerId, id);
  }
}
