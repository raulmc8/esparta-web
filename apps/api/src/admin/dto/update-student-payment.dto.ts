import { IsEnum } from 'class-validator';
import { PaymentStatus } from '../../database/enums';

export class UpdateStudentPaymentDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}
