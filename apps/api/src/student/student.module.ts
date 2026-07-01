import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment, Payment } from '../database/entities';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment, Payment])],
  controllers: [StudentController],
  providers: [StudentService],
})
export class StudentModule {}

