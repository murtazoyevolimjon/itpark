import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseType, ExpenseStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
  @ApiPropertyOptional({ example: '2026-08-17', description: 'Chiqim sanasi' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ example: 1200000, description: 'Chiqim summasi' })
  @IsNotEmpty({ message: 'Summa kiritilishi shart' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'IJARA', enum: ExpenseType })
  @IsNotEmpty({ message: 'Chiqim turi kiritilishi shart' })
  @IsEnum(ExpenseType)
  type: ExpenseType;

  @ApiPropertyOptional({ example: 'Bino Egasi', description: 'Egasi / Qabul qiluvchi' })
  @IsOptional()
  @IsString()
  ownerName?: string;

  @ApiPropertyOptional({ example: 'TOLANGAN', enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional({ example: 'Avgust oyi ijara haqi', description: 'Izoh' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
