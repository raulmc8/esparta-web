import { IsDateString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { PaymentStatus } from '../../database/enums';

export class UpdatePaymentDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  paidAt?: string | null;
}
