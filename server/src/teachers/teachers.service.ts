import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto, UpdateTeacherDto } from './dto/create-teacher.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async findAll(centerId: string, query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { centerId };
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.order || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: { select: { groups: true } },
        },
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(centerId: string, id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, centerId },
      include: {
        groups: {
          include: {
            course: true,
            room: true,
            _count: { select: { studentGroups: true } },
          },
        },
      },
    });
    if (!teacher) {
      throw new NotFoundException('Ustoz topilmadi');
    }
    return teacher;
  }

  async create(centerId: string, dto: CreateTeacherDto) {
    return this.prisma.teacher.create({
      data: {
        ...dto,
        centerId,
      },
    });
  }

  async update(centerId: string, id: string, dto: UpdateTeacherDto) {
    await this.findOne(centerId, id);
    return this.prisma.teacher.update({
      where: { id },
      data: dto,
    });
  }

  async remove(centerId: string, id: string) {
    await this.findOne(centerId, id);
    await this.prisma.teacher.delete({
      where: { id },
    });
    return { message: 'Ustoz muvaffaqiyatli o\'chirildi' };
  }
}
