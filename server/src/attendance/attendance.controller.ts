import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @ApiOperation({ summary: 'Bitta guruh uchun bir kunlik davomatni birdan saqlash' })
  @Post('bulk')
  bulkSave(@TenantId() centerId: string, @Body() dto: BulkAttendanceDto) {
    return this.attendanceService.bulkSave(centerId, dto);
  }

  @ApiOperation({ summary: 'Guruh bo\'yicha davomat tarixini olish' })
  @Get('group/:groupId')
  findByGroup(
    @TenantId() centerId: string,
    @Param('groupId') groupId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.findByGroup(centerId, groupId, from, to);
  }

  @ApiOperation({ summary: 'Oxirgi N kunlik davomat statistikasi' })
  @Get('stats')
  getStats(@TenantId() centerId: string, @Query('days') days?: number) {
    return this.attendanceService.getAttendanceStats(centerId, days ? Number(days) : 30);
  }
}
