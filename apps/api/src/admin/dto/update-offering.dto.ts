import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class UpdateOfferingDto {
  @IsUUID()
  teacherId: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  courseCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  courseName?: string;

  @IsOptional()
  @IsUUID()
  careerId?: string;

  @IsOptional()
  @IsUUID()
  cohortId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  quadrimester?: number;
}
