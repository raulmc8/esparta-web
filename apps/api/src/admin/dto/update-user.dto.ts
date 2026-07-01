import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  IsUUID,
} from 'class-validator';
import { UserRole } from '../../database/enums';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message:
      'La matrícula o usuario solo puede contener letras, números, puntos, guiones y guion bajo',
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsUUID()
  cohortId?: string;
}
