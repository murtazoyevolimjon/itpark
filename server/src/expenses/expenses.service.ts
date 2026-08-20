import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/create-expense.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(centerId: string, query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { centerId };
    if (query.search) {
      where.OR = [
        { ownerName: { contains: query.search, mode: 'insensitive' } },
        { note: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.order || 'desc';
    } else {
      orderBy.date = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(centerId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, centerId },
    });
    if (!expense) {
      throw new NotFoundException('Chiqim topilmadi');
    }
    return expense;
  }

  async create(centerId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : new Date(),
        centerId,
      },
    });
  }

  async update(centerId: string, id: string, dto: UpdateExpenseDto) {
    await this.findOne(centerId, id);
    const updateData: any = { ...dto };
    if (dto.date) updateData.date = new Date(dto.date);

    return this.prisma.expense.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(centerId: string, id: string) {
    await this.findOne(centerId, id);
    await this.prisma.expense.delete({
      where: { id },
    });
    return { message: 'Chiqim muvaffaqiyatli o\'chirildi' };
  }
}
