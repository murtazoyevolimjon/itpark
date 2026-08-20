import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(centerId: string, query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { centerId };
    if (query.search) {
      where.OR = [
        { student: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { student: { lastName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.order || 'desc';
    } else {
      orderBy.paymentDate = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, phone: true } },
          course: { select: { id: true, name: true } },
          group: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(centerId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, centerId },
      include: {
        student: true,
        course: true,
        group: true,
        receivedBy: true,
      },
    });
    if (!payment) {
      throw new NotFoundException('To\'lov topilmadi');
    }
    return payment;
  }

  async create(centerId: string, userId: string, dto: CreatePaymentDto) {
    let courseId = dto.courseId;
    if (!courseId && dto.groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: dto.groupId },
      });
      if (group) courseId = group.courseId;
    }

    return this.prisma.payment.create({
      data: {
        studentId: dto.studentId,
        groupId: dto.groupId,
        courseId,
        amount: dto.amount,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        method: dto.method,
        status: dto.status || 'TOLANGAN',
        receivedById: userId,
        centerId,
      },
      include: {
        student: true,
        course: true,
        group: true,
      },
    });
  }

  async remove(centerId: string, id: string) {
    await this.findOne(centerId, id);
    await this.prisma.payment.delete({
      where: { id },
    });
    return { message: 'To\'lov muvaffaqiyatli o\'chirildi' };
  }
}
