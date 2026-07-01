import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
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
} from './database/entities';
import { StudentModule } from './student/student.module';
import { TeacherModule } from './teacher/teacher.module';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqljs',
      entities: [
        User,
        Career,
        Cohort,
        Term,
        Course,
        CourseOffering,
        Enrollment,
        Payment,
        Grade,
      ],
      synchronize: true,
      dropSchema: isTest,
      autoSave: !isTest,
      ...(isTest
        ? {}
        : { location: process.env.DB_PATH || 'university.sqlite' }),
    }),
    DatabaseModule,
    AuthModule,
    StudentModule,
    TeacherModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
