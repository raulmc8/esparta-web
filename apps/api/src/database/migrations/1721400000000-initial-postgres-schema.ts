import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPostgresSchema1721400000000
  implements MigrationInterface
{
  name = 'InitialPostgresSchema1721400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE TABLE "careers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL UNIQUE,
        "active" boolean NOT NULL DEFAULT true
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "cohorts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "startsAt" timestamp NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "careerId" uuid NOT NULL REFERENCES "careers"("id"),
        CONSTRAINT "UQ_cohorts_career_name" UNIQUE ("careerId", "name")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar NOT NULL UNIQUE,
        "username" text UNIQUE,
        "passwordHash" varchar NOT NULL,
        "resetPasswordTokenHash" text,
        "resetPasswordExpiresAt" timestamp,
        "firstName" varchar NOT NULL,
        "lastName" varchar NOT NULL,
        "role" varchar NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "cohortId" uuid REFERENCES "cohorts"("id") ON DELETE SET NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "terms" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL UNIQUE,
        "startsAt" timestamp NOT NULL,
        "endsAt" timestamp NOT NULL,
        "active" boolean NOT NULL DEFAULT true
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "courses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar NOT NULL UNIQUE,
        "name" varchar NOT NULL,
        "credits" integer NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "course_offerings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "section" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'ACTIVE',
        "startsAt" timestamp,
        "endsAt" timestamp,
        "courseId" uuid NOT NULL REFERENCES "courses"("id"),
        "termId" uuid NOT NULL REFERENCES "terms"("id"),
        "teacherId" uuid NOT NULL REFERENCES "users"("id"),
        CONSTRAINT "UQ_offerings_course_term_section" UNIQUE ("courseId", "termId", "section")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "enrollments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "status" varchar NOT NULL DEFAULT 'ACTIVE',
        "visibleToTeacher" boolean NOT NULL DEFAULT true,
        "studentId" uuid NOT NULL REFERENCES "users"("id"),
        "offeringId" uuid NOT NULL REFERENCES "course_offerings"("id"),
        "enrolledAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_enrollments_student_offering" UNIQUE ("studentId", "offeringId")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "grades" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "enrollmentId" uuid NOT NULL UNIQUE REFERENCES "enrollments"("id") ON DELETE CASCADE,
        "firstPartial" double precision,
        "secondPartial" double precision,
        "finalExam" double precision,
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "status" varchar NOT NULL DEFAULT 'PENDING',
        "amount" double precision NOT NULL DEFAULT 0,
        "paidAt" timestamp,
        "studentId" uuid NOT NULL REFERENCES "users"("id"),
        "termId" uuid NOT NULL REFERENCES "terms"("id"),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_payments_student_term" UNIQUE ("studentId", "termId")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'payments',
      'grades',
      'enrollments',
      'course_offerings',
      'courses',
      'terms',
      'users',
      'cohorts',
      'careers',
    ]) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
  }
}
