import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCenterDto, ChangePasswordDto } from './dto/update-center.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CentersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(centerId: string) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        registeredAt: true,
        createdAt: true,
      },
    });
    if (!center) {
      throw new NotFoundException('Markaz topilmadi');
    }
    return center;
  }

  async updateProfile(centerId: string, dto: UpdateCenterDto) {
    return this.prisma.center.update({
      where: { id: centerId },
      data: dto,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        registeredAt: true,
      },
    });
  }

  async changePassword(centerId: string, userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const isValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Eski parol noto\'g\'ri');
    }

    const newHashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    await this.prisma.center.update({
      where: { id: centerId },
      data: { password: newHashedPassword },
    });

    return { message: 'Parol muvaffaqiyatli o\'zgartirildi' };
  }
}
