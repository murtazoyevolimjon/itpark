import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingCenter = await this.prisma.center.findUnique({
      where: { email: dto.email },
    });
    if (existingCenter) {
      throw new BadRequestException('Bunday email bilan o\'quv markazi allaqachon ro\'yxatdan o\'tgan');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const center = await this.prisma.center.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        fullName: `${dto.name} Admin`,
        email: dto.email,
        password: hashedPassword,
        role: Role.OWNER,
        centerId: center.id,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, center.id);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        centerId: center.id,
        centerName: center.name,
      },
      tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { center: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email yoki parol noto\'g\'ri');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email yoki parol noto\'g\'ri');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.centerId);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        centerId: user.centerId,
        centerName: user.center.name,
      },
      tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-token-key-2026',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { center: true },
      });

      if (!user) {
        throw new UnauthorizedException('Foydalanuvchi topilmadi');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role, user.centerId);

      return {
        tokens,
      };
    } catch (e) {
      throw new UnauthorizedException('Yaroqsiz refresh token');
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { center: true },
    });

    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      centerId: user.centerId,
      center: {
        id: user.center.id,
        name: user.center.name,
        email: user.center.email,
        phone: user.center.phone,
        registeredAt: user.center.registeredAt,
      },
    };
  }

  private async generateTokens(userId: string, email: string, role: string, centerId: string) {
    const payload = { sub: userId, email, role, centerId };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'super-secret-access-token-key-2026',
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-token-key-2026',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
