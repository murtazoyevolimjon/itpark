import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCourseDto {
  @ApiProperty({ example: 'Frontend Web Dasturlash', description: 'Kurs nomi' })
  @IsNotEmpty({ message: 'Kurs nomi kiritilishi shart' })
  @IsString()
  name: string;

  @ApiProperty({ example: 600000, description: 'Oylik narxi (so\'mda)' })
  @IsNotEmpty({ message: 'Narxi kiritilishi shart' })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Narx noldan kam bo\'lmasligi kerak' })
  price: number;

  @ApiPropertyOptional({ example: 'React + TS o\'rgatiladi', description: 'Tavsif' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
