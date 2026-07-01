import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class AddOfferingStudentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  studentIds: string[];
}
