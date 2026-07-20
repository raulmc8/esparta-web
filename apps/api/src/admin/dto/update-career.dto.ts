import { IsString, MinLength } from 'class-validator';

export class UpdateCareerDto {
  @IsString()
  @MinLength(3)
  name: string;
}
