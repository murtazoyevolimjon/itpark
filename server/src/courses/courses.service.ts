import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/create-course.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async findAll(centerId: string, query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { centerId };
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.order || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: { groups: true },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(centerId: string, id: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, centerId },
      include: {
        groups: true,
      },
    });
    if (!course) {
      throw new NotFoundException('Kurs topilmadi');
    }
    return course;
  }

  async create(centerId: string, dto: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        ...dto,
        centerId,
      },
    });
  }

  async update(centerId: string, id: string, dto: UpdateCourseDto) {
    await this.findOne(centerId, id);
    return this.prisma.course.update({
      where: { id },
      data: dto,
    });
  }

  async remove(centerId: string, id: string) {
    await this.findOne(centerId, id);
    await this.prisma.course.delete({
      where: { id },
    });
    return { message: 'Kurs muvaffaqiyatli o\'chirildi' };
  }
}
