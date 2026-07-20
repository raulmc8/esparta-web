import { IsDateString, IsString, MinLength } from 'class-validator';

export class UpdateCohortDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsDateString()
  startsAt: string;
}
