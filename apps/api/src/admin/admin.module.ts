import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Course,
  CourseOffering,
  Career,
  Cohort,
  Enrollment,
  Grade,
  Payment,
  Term,
  User,
} from '../database/entities';
import { EmailService } from '../common/email.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Career,
      Cohort,
      Payment,
      Enrollment,
      Grade,
      Course,
      CourseOffering,
      Term,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, EmailService],
})
export class AdminModule {}
