import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { AttendanceService } from '../attendance/attendance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly attendanceService: AttendanceService,
  ) {}

  @ApiOperation({ summary: 'Asosiy ko\'rsatgichlar va statistika soni' })
  @Get('stats')
  getStats(@TenantId() centerId: string) {
    return this.dashboardService.getStats(centerId);
  }

  @ApiOperation({ summary: 'Davomat statistikasi (kunlar bo\'yicha)' })
  @Get('attendance')
  getAttendance(@TenantId() centerId: string, @Query('days') days?: number) {
    return this.attendanceService.getAttendanceStats(centerId, days ? Number(days) : 30);
  }
}

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: 'Moliya umumiy xulosasi (Kirim, Chiqim, Qarz, Sof Foyda)' })
  @Get('summary')
  getSummary(@TenantId() centerId: string) {
    return this.dashboardService.getFinanceSummary(centerId);
  }

  @ApiOperation({ summary: 'Oylik daromad va chiqimlar grafigi' })
  @Get('monthly-income')
  getMonthlyIncome(@TenantId() centerId: string) {
    return this.dashboardService.getMonthlyIncome(centerId);
  }

  @ApiOperation({ summary: 'Kurslar bo\'yicha daromad grafigi' })
  @Get('income-by-course')
  getIncomeByCourse(@TenantId() centerId: string) {
    return this.dashboardService.getIncomeByCourse(centerId);
  }
}
