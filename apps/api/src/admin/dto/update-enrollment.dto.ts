import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsBoolean()
  visibleToTeacher?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  finalGrade?: number;
}
