import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async bulkSave(centerId: string, dto: BulkAttendanceDto) {
    const attendanceDate = new Date(dto.date);

    // Save or update each student's attendance record using transaction / upsert
    const operations = dto.records.map((rec) => {
      return this.prisma.attendance.upsert({
        where: {
          studentId_groupId_date: {
            studentId: rec.studentId,
            groupId: dto.groupId,
            date: attendanceDate,
          },
        },
        update: {
          status: rec.status,
          note: rec.note || null,
        },
        create: {
          studentId: rec.studentId,
          groupId: dto.groupId,
          date: attendanceDate,
          status: rec.status,
          note: rec.note || null,
          centerId,
        },
      });
    });

    await this.prisma.$transaction(operations);

    return { message: 'Davomat muvaffaqiyatli saqlandi', count: dto.records.length };
  }

  async findByGroup(centerId: string, groupId: string, from?: string, to?: string) {
    const where: any = { centerId, groupId };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    return this.prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });
  }

  async getAttendanceStats(centerId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        centerId,
        date: { gte: startDate },
      },
      select: {
        date: true,
        status: true,
        groupId: true,
        group: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Group by date (formatted YYYY-MM-DD)
    const groupedMap = new Map<string, { date: string; KELGAN: number; KELMAGAN: number; KECHIKKAN: number }>();

    for (let i = 0; i <= days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - i));
      const dateStr = d.toISOString().split('T')[0];
      groupedMap.set(dateStr, { date: dateStr, KELGAN: 0, KELMAGAN: 0, KECHIKKAN: 0 });
    }

    for (const att of attendances) {
      const dateStr = att.date.toISOString().split('T')[0];
      if (groupedMap.has(dateStr)) {
        const item = groupedMap.get(dateStr)!;
        if (att.status === 'KELGAN') item.KELGAN++;
        else if (att.status === 'KELMAGAN') item.KELMAGAN++;
        else if (att.status === 'KECHIKKAN') item.KECHIKKAN++;
      }
    }

    // Group by course/group for individual cards
    const groupStatsMap = new Map<string, { groupId: string; groupName: string; KELGAN: number; KELMAGAN: number; KECHIKKAN: number }>();
    for (const att of attendances) {
      const gId = att.groupId;
      if (!groupStatsMap.has(gId)) {
        groupStatsMap.set(gId, { groupId: gId, groupName: att.group?.name || 'Guruh', KELGAN: 0, KELMAGAN: 0, KECHIKKAN: 0 });
      }
      const gItem = groupStatsMap.get(gId)!;
      if (att.status === 'KELGAN') gItem.KELGAN++;
      else if (att.status === 'KELMAGAN') gItem.KELMAGAN++;
      else if (att.status === 'KECHIKKAN') gItem.KECHIKKAN++;
    }

    return {
      dailyChart: Array.from(groupedMap.values()),
      groupStats: Array.from(groupStatsMap.values()),
    };
  }
}
