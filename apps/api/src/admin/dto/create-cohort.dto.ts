import { IsDateString, IsString, MinLength } from 'class-validator';

export class CreateCohortDto {
  @IsString()
  @MinLength(3)
  careerName: string;

  @IsString()
  @MinLength(3)
  cohortName: string;

  @IsDateString()
  startsAt: string;
}
