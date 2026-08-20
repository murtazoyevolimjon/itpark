import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Injectable()
export class EmployeesService {
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
        { position: { contains: query.search, mode: 'insensitive' } },
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
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(centerId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, centerId },
    });
    if (!employee) {
      throw new NotFoundException('Xodim topilmadi');
    }
    return employee;
  }

  async create(centerId: string, dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: {
        ...dto,
        hiredAt: dto.hiredAt ? new Date(dto.hiredAt) : new Date(),
        centerId,
      },
    });
  }

  async update(centerId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findOne(centerId, id);
    const updateData: any = { ...dto };
    if (dto.hiredAt) updateData.hiredAt = new Date(dto.hiredAt);

    return this.prisma.employee.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(centerId: string, id: string) {
    await this.findOne(centerId, id);
    await this.prisma.employee.delete({
      where: { id },
    });
    return { message: 'Xodim muvaffaqiyatli o\'chirildi' };
  }
}
