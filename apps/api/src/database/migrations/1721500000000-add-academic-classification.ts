import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAcademicClassification1721500000000 implements MigrationInterface {
  name = 'AddAcademicClassification1721500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "careerId" uuid REFERENCES "careers"("id")`);
    await queryRunner.query(`ALTER TABLE "course_offerings" ADD COLUMN IF NOT EXISTS "cohortId" uuid REFERENCES "cohorts"("id")`);
    await queryRunner.query(`ALTER TABLE "course_offerings" ADD COLUMN IF NOT EXISTS "quadrimester" integer`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course_offerings" DROP COLUMN IF EXISTS "quadrimester"`);
    await queryRunner.query(`ALTER TABLE "course_offerings" DROP COLUMN IF EXISTS "cohortId"`);
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN IF EXISTS "careerId"`);
  }
}
