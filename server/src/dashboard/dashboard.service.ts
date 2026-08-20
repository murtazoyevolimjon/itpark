import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(centerId: string) {
    const [
      studentsCount,
      teachersCount,
      coursesCount,
      groupsCount,
      graduatesCount,
      certificatesCount,
    ] = await Promise.all([
      this.prisma.student.count({ where: { centerId, status: 'FAOL' } }),
      this.prisma.teacher.count({ where: { centerId, status: 'FAOL' } }),
      this.prisma.course.count({ where: { centerId, isActive: true } }),
      this.prisma.group.count({ where: { centerId, status: 'FAOL' } }),
      this.prisma.student.count({ where: { centerId, status: 'BITIRGAN' } }),
      this.prisma.certificate.count({ where: { centerId } }),
    ]);

    return {
      studentsCount,
      teachersCount,
      coursesCount,
      groupsCount,
      graduatesCount,
      certificatesCount,
    };
  }

  async getFinanceSummary(centerId: string) {
    const [payments, expenses, unpaidPayments] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { centerId, status: 'TOLANGAN' },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { centerId, status: 'TOLANGAN' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { centerId, status: 'TOLANMAGAN' },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = payments._sum.amount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const debt = unpaidPayments._sum.amount || 0;
    const netProfit = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      debt,
      netProfit,
    };
  }

  async getMonthlyIncome(centerId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { centerId, status: 'TOLANGAN' },
      select: { amount: true, paymentDate: true },
    });

    const expenses = await this.prisma.expense.findMany({
      where: { centerId, status: 'TOLANGAN' },
      select: { amount: true, date: true },
    });

    const monthsMap = new Map<string, { month: string; income: number; expense: number }>();
    const monthNames = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

    // Initialize past 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthsMap.set(key, { month: label, income: 0, expense: 0 });
    }

    for (const p of payments) {
      const d = new Date(p.paymentDate);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (monthsMap.has(key)) {
        monthsMap.get(key)!.income += p.amount;
      }
    }

    for (const e of expenses) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (monthsMap.has(key)) {
        monthsMap.get(key)!.expense += e.amount;
      }
    }

    return Array.from(monthsMap.values());
  }

  async getIncomeByCourse(centerId: string) {
    const courses = await this.prisma.course.findMany({
      where: { centerId },
      include: {
        payments: {
          where: { status: 'TOLANGAN' },
          select: { amount: true },
        },
      },
    });

    return courses.map((c) => {
      const totalIncome = c.payments.reduce((acc, p) => acc + p.amount, 0);
      return {
        courseName: c.name,
        income: totalIncome,
      };
    });
  }
}
