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
} from './entities';
import { SeedService } from './seed.service';

const entities = [
  User,
  Career,
  Cohort,
  Term,
  Course,
  CourseOffering,
  Enrollment,
  Payment,
  Grade,
];

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  providers: [SeedService],
})
export class DatabaseModule {}
