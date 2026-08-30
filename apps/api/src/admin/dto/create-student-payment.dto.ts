import { IsUUID } from 'class-validator';

export class CreateStudentPaymentDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  termId: string;
}
