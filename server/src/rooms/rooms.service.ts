import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/create-room.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async findAll(centerId: string, query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { centerId };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { number: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.order || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: { select: { groups: true } },
        },
      }),
      this.prisma.room.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(centerId: string, id: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, centerId },
      include: { groups: true },
    });
    if (!room) {
      throw new NotFoundException('Xona topilmadi');
    }
    return room;
  }

  async create(centerId: string, dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: {
        ...dto,
        centerId,
      },
    });
  }

  async update(centerId: string, id: string, dto: UpdateRoomDto) {
    await this.findOne(centerId, id);
    return this.prisma.room.update({
      where: { id },
      data: dto,
    });
  }

  async remove(centerId: string, id: string) {
    await this.findOne(centerId, id);
    await this.prisma.room.delete({
      where: { id },
    });
    return { message: 'Xona muvaffaqiyatli o\'chirildi' };
  }
}
