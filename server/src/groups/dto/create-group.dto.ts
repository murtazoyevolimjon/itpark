import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupDay, GroupStatus } from '@prisma/client';

export class CreateGroupDto {
  @ApiProperty({ example: '#1 guruh', description: 'Guruh nomi' })
  @IsNotEmpty({ message: 'Guruh nomi kiritilishi shart' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Kurs ID' })
  @IsNotEmpty({ message: 'Kurs kiritilishi shart' })
  @IsString()
  courseId: string;

  @ApiProperty({ description: 'Ustoz ID' })
  @IsNotEmpty({ message: 'Ustoz kiritilishi shart' })
  @IsString()
  teacherId: string;

  @ApiProperty({ description: 'Xona ID' })
  @IsNotEmpty({ message: 'Xona kiritilishi shart' })
  @IsString()
  roomId: string;

  @ApiProperty({ example: ['DUSH', 'CHOR', 'JU'], enum: GroupDay, isArray: true })
  @IsArray()
  @IsEnum(GroupDay, { each: true, message: 'Noto\'g\'ri dars kuni' })
  days: GroupDay[];

  @ApiProperty({ example: '09:00', description: 'Boshlanish vaqti' })
  @IsNotEmpty({ message: 'Boshlanish vaqti kiritilishi shart' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '11:00', description: 'Tugash vaqti' })
  @IsNotEmpty({ message: 'Tugash vaqti kiritilishi shart' })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ example: 'FAOL', enum: GroupStatus })
  @IsOptional()
  @IsEnum(GroupStatus)
  status?: GroupStatus;

  @ApiProperty({ example: '2026-02-01', description: 'Darslar boshlanish sanasi' })
  @IsNotEmpty({ message: 'Boshlanish sanasi kiritilishi shart' })
  @IsDateString()
  startDate: string;
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(GroupDay, { each: true })
  days?: GroupDay[];

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsEnum(GroupStatus)
  status?: GroupStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}
