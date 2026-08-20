import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error: any) {
      console.error('❌ Database ulanishda xatolik:', error?.message || error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
