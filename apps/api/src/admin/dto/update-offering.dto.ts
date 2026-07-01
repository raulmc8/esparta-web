import { IsUUID } from 'class-validator';

export class UpdateOfferingDto {
  @IsUUID()
  teacherId: string;
}
