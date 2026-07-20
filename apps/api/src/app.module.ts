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
import { InitialPostgresSchema1721400000000 } from './database/migrations/1721400000000-initial-postgres-schema';

const isTest = process.env.NODE_ENV === 'test';
const isPostgres = Boolean(process.env.DATABASE_URL);
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
  imports: [
    TypeOrmModule.forRoot(
      isPostgres
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities,
            migrations: [InitialPostgresSchema1721400000000],
            migrationsRun: true,
            synchronize: false,
            ssl:
              process.env.DATABASE_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false,
          }
        : {
            type: 'sqljs',
            entities,
            synchronize: true,
            dropSchema: isTest,
            autoSave: !isTest,
            ...(isTest
              ? {}
              : { location: process.env.DB_PATH || 'university.sqlite' }),
          },
    ),
    DatabaseModule,
    AuthModule,
    StudentModule,
    TeacherModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
