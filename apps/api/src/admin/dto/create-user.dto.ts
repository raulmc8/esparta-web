import {
  IsEmail,
  IsEnum,
  IsString,
  IsOptional,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../database/enums';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message:
      'La matrícula o usuario solo puede contener letras, números, puntos, guiones y guion bajo',
  })
  username: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  role: UserRole.STUDENT | UserRole.TEACHER;

  @IsOptional()
  @IsUUID()
  cohortId?: string;
}
