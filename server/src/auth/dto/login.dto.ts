import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@itpark.uz', description: 'Elektron pochta' })
  @IsNotEmpty({ message: 'Email kiritilishi shart' })
  @IsEmail({}, { message: 'Noto\'g\'ri email formati' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'Parol' })
  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @IsString()
  password: string;
}
