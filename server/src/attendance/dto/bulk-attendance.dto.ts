import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceItemDto {
  @ApiProperty({ description: 'Talaba ID' })
  @IsNotEmpty({ message: 'Talaba ID kiritilishi shart' })
  @IsString()
  studentId: string;

  @ApiProperty({ example: 'KELGAN', enum: AttendanceStatus })
  @IsNotEmpty({ message: 'Status kiritilishi shart' })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ example: 'Kechikib keldi', description: 'Izoh' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkAttendanceDto {
  @ApiProperty({ description: 'Guruh ID' })
  @IsNotEmpty({ message: 'Guruh ID kiritilishi shart' })
  @IsString()
  groupId: string;

  @ApiProperty({ example: '2026-08-17', description: 'Davomat sanasi' })
  @IsNotEmpty({ message: 'Sana kiritilishi shart' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: [AttendanceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  records: AttendanceItemDto[];
}
