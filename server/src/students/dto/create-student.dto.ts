import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentGender, StudentStatus } from '@prisma/client';

export class CreateStudentDto {
  @ApiProperty({ example: 'Sardor', description: 'Ism' })
  @IsNotEmpty({ message: 'Ism kiritilishi shart' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Yusupov', description: 'Familya' })
  @IsNotEmpty({ message: 'Familya kiritilishi shart' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '2005-04-15', description: 'Tug\'ilgan kuni' })
  @IsNotEmpty({ message: 'Tug\'ilgan kun kiritilishi shart' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ example: '998901234567', description: 'Telefon raqam' })
  @IsNotEmpty({ message: 'Telefon raqam kiritilishi shart' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: '998902223344', description: 'Otasining telefoni' })
  @IsOptional()
  @IsString()
  fatherPhone?: string;

  @ApiPropertyOptional({ example: '998903334455', description: 'Onasining telefoni' })
  @IsOptional()
  @IsString()
  motherPhone?: string;

  @ApiPropertyOptional({ example: 'AD1234567', description: 'Passport seriyasi' })
  @IsOptional()
  @IsString()
  passportSeries?: string;

  @ApiProperty({ example: 'ERKAK', enum: StudentGender })
  @IsNotEmpty({ message: 'Jinsi kiritilishi shart' })
  @IsEnum(StudentGender)
  gender: StudentGender;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isSchoolStudent?: boolean;

  @ApiPropertyOptional({ example: 'FAOL', enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({ description: 'Biriktiriladigan guruh ID' })
  @IsOptional()
  @IsString()
  groupId?: string;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  fatherPhone?: string;

  @IsOptional()
  @IsString()
  motherPhone?: string;

  @IsOptional()
  @IsString()
  passportSeries?: string;

  @IsOptional()
  @IsEnum(StudentGender)
  gender?: StudentGender;

  @IsOptional()
  @IsBoolean()
  isSchoolStudent?: boolean;

  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @IsOptional()
  @IsString()
  groupId?: string;
}
