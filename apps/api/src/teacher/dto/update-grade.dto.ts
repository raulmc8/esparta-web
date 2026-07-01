import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateGradeDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  finalGrade?: number;
}
