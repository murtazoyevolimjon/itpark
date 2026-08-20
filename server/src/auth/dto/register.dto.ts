import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'IT-Park Academy', description: 'Markaz nomi' })
  @IsNotEmpty({ message: 'Markaz nomi kiritilishi shart' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'admin@itpark.uz', description: 'Elektron pochta' })
  @IsNotEmpty({ message: 'Email kiritilishi shart' })
  @IsEmail({}, { message: 'Noto\'g\'ri email formati' })
  email: string;

  @ApiProperty({ example: '998901234567', description: 'Telefon raqam' })
  @IsNotEmpty({ message: 'Telefon raqam kiritilishi shart' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'password123', description: 'Parol (kamida 6 ta belgi)' })
  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @MinLength(6, { message: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' })
  password: string;
}
