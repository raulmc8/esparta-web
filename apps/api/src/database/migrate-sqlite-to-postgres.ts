import '../config/load-env';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import {
  Career,
  Cohort,
  Course,
  CourseOffering,
  Enrollment,
  Grade,
  Payment,
  Term,
  User,
} from './entities';
import { InitialPostgresSchema1721400000000 } from './migrations/1721400000000-initial-postgres-schema';

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

const tables: Array<{
  name: string;
  columns: string[];
  booleans?: string[];
  sourceWhere?: string;
}> = [
  { name: 'careers', columns: ['id', 'name', 'active'], booleans: ['active'] },
  {
    name: 'cohorts',
    columns: ['id', 'name', 'startsAt', 'active', 'careerId'],
    booleans: ['active'],
  },
  {
    name: 'users',
    columns: [
      'id', 'email', 'username', 'passwordHash', 'resetPasswordTokenHash',
      'resetPasswordExpiresAt', 'firstName', 'lastName', 'role', 'active',
      'cohortId', 'createdAt', 'updatedAt',
    ],
    booleans: ['active'],
  },
  { name: 'terms', columns: ['id', 'name', 'startsAt', 'endsAt', 'active'], booleans: ['active'] },
  { name: 'courses', columns: ['id', 'code', 'name', 'credits'] },
  {
    name: 'course_offerings',
    columns: ['id', 'section', 'status', 'startsAt', 'endsAt', 'courseId', 'termId', 'teacherId'],
  },
  {
    name: 'enrollments',
    columns: ['id', 'status', 'visibleToTeacher', 'studentId', 'offeringId', 'enrolledAt'],
    booleans: ['visibleToTeacher'],
  },
  {
    name: 'grades',
    columns: ['id', 'enrollmentId', 'firstPartial', 'secondPartial', 'finalExam', 'updatedAt'],
    sourceWhere: `WHERE "enrollmentId" IN (SELECT "id" FROM "enrollments")`,
  },
  {
    name: 'payments',
    columns: ['id', 'status', 'amount', 'paidAt', 'studentId', 'termId', 'updatedAt'],
  },
];

async function migrate() {
  const sourcePath = resolve(
    process.env.SOURCE_DB_PATH || resolve(process.cwd(), 'university.sqlite'),
  );
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!existsSync(sourcePath)) {
    throw new Error(`No existe la base SQLite de origen: ${sourcePath}`);
  }
  if (!databaseUrl) {
    throw new Error('Define DATABASE_URL con la conexión de PostgreSQL');
  }

  const source = new DataSource({
    type: 'sqljs',
    location: sourcePath,
    autoSave: false,
    entities,
    synchronize: false,
  });
  const target = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    entities,
    migrations: [InitialPostgresSchema1721400000000],
    migrationsRun: true,
    synchronize: false,
  });

  await source.initialize();
  await target.initialize();
  try {
    const existingUsers = Number(
      (await target.query(`SELECT COUNT(*)::int AS count FROM "users"`))[0]
        .count,
    );
    if (existingUsers > 0 && process.env.ALLOW_NONEMPTY_TARGET !== 'true') {
      throw new Error(
        'PostgreSQL ya contiene usuarios. Usa una base vacía o define ALLOW_NONEMPTY_TARGET=true conscientemente.',
      );
    }

    await target.transaction(async (manager) => {
      for (const table of tables) {
        const rows = (await source.query(
          `SELECT ${table.columns.map(quote).join(', ')} FROM ${quote(table.name)} ${table.sourceWhere || ''}`,
        )) as Array<Record<string, unknown>>;
        for (const row of rows) {
          const values = table.columns.map((column) =>
            table.booleans?.includes(column) ? Boolean(row[column]) : row[column],
          );
          const placeholders = values.map((_, index) => `$${index + 1}`);
          await manager.query(
            `INSERT INTO ${quote(table.name)} (${table.columns.map(quote).join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (${quote('id')}) DO NOTHING`,
            values,
          );
        }
        console.log(`${table.name}: ${rows.length} registros migrados`);
      }
    });
  } finally {
    await source.destroy();
    await target.destroy();
  }
}

function quote(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

migrate()
  .then(() => console.log('Migración terminada correctamente.'))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
