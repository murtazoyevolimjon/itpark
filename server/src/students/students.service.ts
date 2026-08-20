import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/create-student.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Injectable()
export class StudentsService {
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
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          studentGroups: {
            include: {
              group: {
                select: { id: true, name: true, course: { select: { id: true, name: true, price: true } } },
              },
            },
          },
          payments: {
            orderBy: { paymentDate: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    // Compute payment status for each student
    const formattedData = data.map((st) => {
      const latestPayment = st.payments[0];
      let paymentStatus = 'TOLANMAGAN';
      if (latestPayment) {
        paymentStatus = latestPayment.status;
      }
      return {
        ...st,
        paymentStatus,
      };
    });

    return { data: formattedData, total, page, limit };
  }

  async findOne(centerId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, centerId },
      include: {
        studentGroups: {
          include: {
            group: {
              include: {
                course: true,
                teacher: true,
                room: true,
              },
            },
          },
        },
        attendances: {
          orderBy: { date: 'desc' },
          take: 100,
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            course: true,
            group: true,
          },
        },
        certificates: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Talaba topilmadi');
    }

    // Compute attendance statistics
    const totalAttendances = student.attendances.length;
    const presentCount = student.attendances.filter((a) => a.status === 'KELGAN' || a.status === 'KECHIKKAN').length;
    const attendancePercentage = totalAttendances > 0 ? Math.round((presentCount / totalAttendances) * 100) : 100;

    return {
      ...student,
      attendancePercentage,
      totalAttendances,
      presentCount,
    };
  }

  async create(centerId: string, dto: CreateStudentDto) {
    const { groupId, ...studentData } = dto;

    const student = await this.prisma.student.create({
      data: {
        ...studentData,
        birthDate: new Date(studentData.birthDate),
        centerId,
      },
    });

    if (groupId) {
      await this.prisma.studentGroup.create({
        data: {
          studentId: student.id,
          groupId,
          centerId,
        },
      });
    }

    return this.findOne(centerId, student.id);
  }

  async update(centerId: string, id: string, dto: UpdateStudentDto) {
    await this.findOne(centerId, id);
    const { groupId, ...updateData } = dto;

    const formattedData: any = { ...updateData };
    if (updateData.birthDate) {
      formattedData.birthDate = new Date(updateData.birthDate);
    }

    const updated = await this.prisma.student.update({
      where: { id },
      data: formattedData,
    });

    if (groupId) {
      const existing = await this.prisma.studentGroup.findUnique({
        where: {
          studentId_groupId: {
            studentId: id,
            groupId,
          },
        },
      });
      if (!existing) {
        await this.prisma.studentGroup.create({
          data: {
            studentId: id,
            groupId,
            centerId,
          },
        });
      }
    }

    return this.findOne(centerId, updated.id);
  }

  async remove(centerId: string, id: string) {
    await this.findOne(centerId, id);
    await this.prisma.student.delete({
      where: { id },
    });
    return { message: 'Talaba muvaffaqiyatli o\'chirildi' };
  }
}
