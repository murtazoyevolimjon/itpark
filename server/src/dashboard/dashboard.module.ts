import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController, FinanceController } from './dashboard.controller';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [AttendanceModule],
  controllers: [DashboardController, FinanceController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
