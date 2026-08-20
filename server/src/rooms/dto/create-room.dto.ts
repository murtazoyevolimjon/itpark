import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRoomDto {
  @ApiProperty({ example: 'Lab 1', description: 'Xona nomi' })
  @IsNotEmpty({ message: 'Xona nomi kiritilishi shart' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1, description: 'Qavat' })
  @IsNotEmpty({ message: 'Qavat kiritilishi shart' })
  @Type(() => Number)
  @IsInt()
  floor: number;

  @ApiProperty({ example: '101', description: 'Xona raqami' })
  @IsNotEmpty({ message: 'Xona raqami kiritilishi shart' })
  @IsString()
  number: string;

  @ApiProperty({ example: 15, description: 'Sig\'imi (necha kishilik)' })
  @IsNotEmpty({ message: 'Sig\'imi kiritilishi shart' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity: number;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floor?: number;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;
}
