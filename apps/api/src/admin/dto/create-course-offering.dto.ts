import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateCourseOfferingDto {
  @IsString()
  @MinLength(2)
  courseCode: string;

  @IsString()
  @MinLength(3)
  courseName: string;

  @IsString()
  @MinLength(1)
  section: string;

  @IsUUID()
  teacherId: string;

  @IsOptional()
  @IsUUID()
  careerId?: string;

  @IsOptional()
  @IsUUID()
  cohortId?: string;

  @IsOptional()
  @IsInt()
  quadrimester?: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  studentIds: string[];

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;
}
