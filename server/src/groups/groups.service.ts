import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, UpdateGroupDto } from './dto/create-group.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async findAll(centerId: string, query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { centerId };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { course: { name: { contains: query.search, mode: 'insensitive' } } },
        { teacher: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { teacher: { lastName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.order || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          course: { select: { id: true, name: true, price: true } },
          teacher: { select: { id: true, firstName: true, lastName: true, phone: true } },
          room: { select: { id: true, name: true, number: true } },
          _count: { select: { studentGroups: true } },
        },
      }),
      this.prisma.group.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(centerId: string, id: string) {
    const group = await this.prisma.group.findFirst({
      where: { id, centerId },
      include: {
        course: true,
        teacher: true,
        room: true,
        studentGroups: {
          include: {
            student: true,
          },
          orderBy: { joinedAt: 'desc' },
        },
        attendances: {
          orderBy: { date: 'desc' },
          take: 50,
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 50,
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!group) {
      throw new NotFoundException('Guruh topilmadi');
    }
    return group;
  }

  async create(centerId: string, dto: CreateGroupDto) {
    return this.prisma.group.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        centerId,
      },
      include: {
        course: true,
        teacher: true,
        room: true,
      },
    });
  }

  async update(centerId: string, id: string, dto: UpdateGroupDto) {
    await this.findOne(centerId, id);
    const updateData: any = { ...dto };
    if (dto.startDate) {
      updateData.startDate = new Date(dto.startDate);
    }
    return this.prisma.group.update({
      where: { id },
      data: updateData,
      include: {
        course: true,
        teacher: true,
        room: true,
      },
    });
  }

  async remove(centerId: string, id: string) {
    await this.findOne(centerId, id);
    await this.prisma.group.delete({
      where: { id },
    });
    return { message: 'Guruh muvaffaqiyatli o\'chirildi' };
  }
}
