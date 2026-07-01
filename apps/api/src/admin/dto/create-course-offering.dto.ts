import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCourseOfferingDto {
  @IsString()
  @MinLength(2)
  courseCode: string;

  @IsString()
  @MinLength(3)
  courseName: string;

  @IsInt()
  @Min(1)
  @Max(20)
  credits: number;

  @IsString()
  @MinLength(1)
  section: string;

  @IsUUID()
  teacherId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  studentIds: string[];

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;
}

