import { IsOptional, IsUUID, Matches } from 'class-validator';

export class CreateStudentPaymentDto {
  @IsUUID()
  studentId: string;

  @IsOptional()
  @IsUUID()
  termId?: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period?: string;
}
