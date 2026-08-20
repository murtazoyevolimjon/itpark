import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCenterDto {
  @ApiPropertyOptional({ example: 'IT-Park Academy', description: 'Markaz nomi' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'admin@itpark.uz', description: 'Email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '998901234567', description: 'Telefon raqami' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ description: 'Eski parol' })
  @IsNotEmpty({ message: 'Eski parol kiritilishi shart' })
  @IsString()
  oldPassword: string;

  @ApiPropertyOptional({ description: 'Yangi parol' })
  @IsNotEmpty({ message: 'Yangi parol kiritilishi shart' })
  @MinLength(6, { message: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' })
  newPassword: string;
}
