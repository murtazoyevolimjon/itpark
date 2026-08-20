import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeacherSalaryType, ActiveStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateTeacherDto {
  @ApiProperty({ example: 'Alisher', description: 'Ism' })
  @IsNotEmpty({ message: 'Ism kiritilishi shart' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Qodirov', description: 'Familya' })
  @IsNotEmpty({ message: 'Familya kiritilishi shart' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '998901234567', description: 'Telefon raqam' })
  @IsNotEmpty({ message: 'Telefon raqam kiritilishi shart' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'AD1234567', description: 'Passport seriyasi' })
  @IsOptional()
  @IsString()
  passportSeries?: string;

  @ApiProperty({ example: 'FIXED', enum: TeacherSalaryType })
  @IsNotEmpty({ message: 'Maosh turi kiritilishi shart' })
  @IsEnum(TeacherSalaryType)
  salaryType: TeacherSalaryType;

  @ApiProperty({ example: 4500000, description: 'Maosh qiymati (belgilangan summa yoki foiz)' })
  @IsNotEmpty({ message: 'Maosh miqdori kiritilishi shart' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salaryValue: number;

  @ApiPropertyOptional({ example: 'FAOL', enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;
}

export class UpdateTeacherDto {
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
  passportSeries?: string;

  @IsOptional()
  @IsEnum(TeacherSalaryType)
  salaryType?: TeacherSalaryType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salaryValue?: number;

  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;
}
