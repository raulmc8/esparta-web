import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CourseOffering,
  Enrollment,
  Grade,
} from '../database/entities';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseOffering, Enrollment, Grade])],
  controllers: [TeacherController],
  providers: [TeacherService],
})
export class TeacherModule {}

