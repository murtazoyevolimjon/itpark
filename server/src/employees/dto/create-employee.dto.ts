import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Farruh', description: 'Ism' })
  @IsNotEmpty({ message: 'Ism kiritilishi shart' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Karimov', description: 'Familya' })
  @IsNotEmpty({ message: 'Familya kiritilishi shart' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '998909998877', description: 'Telefon raqam' })
  @IsNotEmpty({ message: 'Telefon raqam kiritilishi shart' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Menejer', description: 'Lavozim' })
  @IsNotEmpty({ message: 'Lavozim kiritilishi shart' })
  @IsString()
  position: string;

  @ApiProperty({ example: 3500000, description: 'Maosh summasi' })
  @IsNotEmpty({ message: 'Maosh kiritilishi shart' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salary: number;

  @ApiPropertyOptional({ example: '2025-09-01', description: 'Ishga kirgan sana' })
  @IsOptional()
  @IsDateString()
  hiredAt?: string;

  @ApiPropertyOptional({ example: 'FAOL', enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salary?: number;

  @IsOptional()
  @IsDateString()
  hiredAt?: string;

  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;
}
