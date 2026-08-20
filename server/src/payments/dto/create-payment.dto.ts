import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Talaba ID' })
  @IsNotEmpty({ message: 'Talaba kiritilishi shart' })
  @IsString()
  studentId: string;

  @ApiPropertyOptional({ description: 'Guruh ID' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Kurs ID' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ example: 600000, description: 'To\'lov summasi' })
  @IsNotEmpty({ message: 'Summa kiritilishi shart' })
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Summa 0 dan katta bo\'lishi kerak' })
  amount: number;

  @ApiPropertyOptional({ example: '2026-08-17', description: 'To\'lov sanasi' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiProperty({ example: 'NAQD', enum: PaymentMethod })
  @IsNotEmpty({ message: 'To\'lov usuli kiritilishi shart' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ example: 'TOLANGAN', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
