import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import {
  Course,
  CourseOffering,
  Enrollment,
  Grade,
  Payment,
  Term,
  User,
} from './entities';
import {
  EnrollmentStatus,
  OfferingStatus,
  PaymentStatus,
  UserRole,
} from './enums';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Term)
    private readonly termsRepository: Repository<Term>,
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    @InjectRepository(CourseOffering)
    private readonly offeringsRepository: Repository<CourseOffering>,
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Grade)
    private readonly gradesRepository: Repository<Grade>,
  ) {}

  async onApplicationBootstrap() {
    const shouldSeedDemo =
      process.env.SEED_DEMO_DATA === 'true' ||
      !process.env.DATABASE_URL ||
      process.env.NODE_ENV !== 'production';

    if (!shouldSeedDemo) {
      await this.ensureInitialProductionAdmin();
      return;
    }

    if ((await this.usersRepository.count()) > 0) {
      await this.repairDemoAccounts();
      await this.backfillMonthlyOfferingDates();
      return;
    }

    const passwordHash = await hash('Demo123!', 10);

    const [admin, teacher, paidStudent, pendingStudent] =
      await this.usersRepository.save([
        this.usersRepository.create({
          email: 'admin@universidad.mx',
          username: 'ADMIN-ESPARTA',
          passwordHash,
          firstName: 'Ariana',
          lastName: 'Landero',
          role: UserRole.ADMIN,
        }),
        this.usersRepository.create({
          email: 'maestro@universidad.mx',
          username: 'DOC-2026-0001',
          passwordHash,
          firstName: 'Carlos',
          lastName: 'Mendoza',
          role: UserRole.TEACHER,
        }),
        this.usersRepository.create({
          email: 'alumno@universidad.mx',
          username: 'ESP-2026-0001',
          passwordHash,
          firstName: 'Andrea',
          lastName: 'López',
          role: UserRole.STUDENT,
        }),
        this.usersRepository.create({
          email: 'alumno2@universidad.mx',
          username: 'ESP-2026-0002',
          passwordHash,
          firstName: 'Diego',
          lastName: 'Hernández',
          role: UserRole.STUDENT,
        }),
      ]);

    const demoTimeline = this.createDemoTimeline();

    const term = await this.termsRepository.save(
      this.termsRepository.create({
        name: demoTimeline.termName,
        startsAt: demoTimeline.termStartsAt,
        endsAt: demoTimeline.termEndsAt,
        active: true,
      }),
    );

    const courses = await this.coursesRepository.save([
      this.coursesRepository.create({
        code: 'MAT-204',
        name: 'Cálculo Integral',
      }),
      this.coursesRepository.create({
        code: 'PRO-301',
        name: 'Ingeniería de Software',
      }),
      this.coursesRepository.create({
        code: 'BD-202',
        name: 'Bases de Datos',
      }),
    ]);

    const monthlyDates = [
      demoTimeline.offerings['MAT-204'],
      demoTimeline.offerings['PRO-301'],
      demoTimeline.offerings['BD-202'],
    ];

    const offerings = await this.offeringsRepository.save(
      courses.map((course, index) =>
        this.offeringsRepository.create({
          course,
          term,
          teacher,
          section: `0${index + 1}`,
          ...monthlyDates[index],
        }),
      ),
    );

    const paidEnrollments = await this.enrollmentsRepository.save(
      offerings.map((offering) =>
        this.enrollmentsRepository.create({
          student: paidStudent,
          offering,
          status:
            offering.status === OfferingStatus.ACTIVE
              ? EnrollmentStatus.ACTIVE
              : EnrollmentStatus.COMPLETED,
        }),
      ),
    );

    const pendingEnrollments = await this.enrollmentsRepository.save(
      offerings.slice(0, 2).map((offering) =>
        this.enrollmentsRepository.create({
          student: pendingStudent,
          offering,
          status:
            offering.status === OfferingStatus.ACTIVE
              ? EnrollmentStatus.ACTIVE
              : EnrollmentStatus.COMPLETED,
        }),
      ),
    );

    const gradeValues = [
      [92, 88, 94],
      [86, 91, 89],
      [95, 90, 93],
      [78, 83, 80],
      [88, 85, 90],
    ];

    await this.gradesRepository.save(
      [...paidEnrollments, ...pendingEnrollments].map((enrollment, index) =>
        this.gradesRepository.create({
          enrollment,
          firstPartial: gradeValues[index][0],
          secondPartial: gradeValues[index][1],
          finalExam: gradeValues[index][2],
        }),
      ),
    );

    await this.paymentsRepository.save([
      this.paymentsRepository.create({
        student: paidStudent,
        term,
        status: PaymentStatus.PAID,
        amount: 24500,
        paidAt: new Date('2026-01-08T18:30:00.000Z'),
      }),
      this.paymentsRepository.create({
        student: pendingStudent,
        term,
        status: PaymentStatus.PENDING,
        amount: 24500,
        paidAt: null,
      }),
    ]);

    void admin;
  }

  private async ensureInitialProductionAdmin() {
    if ((await this.usersRepository.count()) > 0) return;

    const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const username = process.env.INITIAL_ADMIN_USERNAME?.trim().toUpperCase();
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    const firstName = process.env.INITIAL_ADMIN_FIRST_NAME?.trim();
    const lastName = process.env.INITIAL_ADMIN_LAST_NAME?.trim();

    if (!email || !username || !password || !firstName || !lastName) {
      throw new Error(
        'La base está vacía. Configura INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_PASSWORD, INITIAL_ADMIN_FIRST_NAME e INITIAL_ADMIN_LAST_NAME.',
      );
    }
    if (password.length < 10 || password === 'Demo123!') {
      throw new Error(
        'INITIAL_ADMIN_PASSWORD debe tener al menos 10 caracteres y no puede ser la contraseña demo.',
      );
    }

    await this.usersRepository.save(
      this.usersRepository.create({
        email,
        username,
        passwordHash: await hash(password, 10),
        firstName,
        lastName,
        role: UserRole.ADMIN,
        active: true,
      }),
    );
  }

  private async repairDemoAccounts() {
    const demoAccounts: Array<{
      email: string;
      role: UserRole;
      username: string;
    }> = [
      {
        email: 'admin@universidad.mx',
        role: UserRole.ADMIN,
        username: 'ADMIN-ESPARTA',
      },
      {
        email: 'maestro@universidad.mx',
        role: UserRole.TEACHER,
        username: 'DOC-2026-0001',
      },
      {
        email: 'alumno@universidad.mx',
        role: UserRole.STUDENT,
        username: 'ESP-2026-0001',
      },
      {
        email: 'alumno2@universidad.mx',
        role: UserRole.STUDENT,
        username: 'ESP-2026-0002',
      },
    ];

    for (const account of demoAccounts) {
      const user = await this.usersRepository.findOne({
        where: { email: account.email },
      });
      if (
        user &&
        (!user.active ||
          user.role !== account.role ||
          user.username !== account.username)
      ) {
        user.active = true;
        user.role = account.role;
        user.username = account.username;
        await this.usersRepository.save(user);
      }
      if (
        user &&
        account.role === UserRole.ADMIN &&
        (user.firstName !== 'Ariana' || user.lastName !== 'Landero')
      ) {
        user.firstName = 'Ariana';
        user.lastName = 'Landero';
        await this.usersRepository.save(user);
      }
    }
  }

  private async backfillMonthlyOfferingDates() {
    const offerings = await this.offeringsRepository.find({
      relations: { course: true, enrollments: true },
    });
    const datesByCode = this.createDemoTimeline().offerings;

    for (const offering of offerings) {
      if (offering.startsAt && offering.endsAt) {
        continue;
      }

      const monthlyDates = datesByCode[offering.course.code];
      if (!monthlyDates) {
        continue;
      }

      offering.startsAt = monthlyDates.startsAt;
      offering.endsAt = monthlyDates.endsAt;
      offering.status = monthlyDates.status;
      await this.offeringsRepository.save(offering);

      if (offering.enrollments.length) {
        offering.enrollments.forEach((enrollment) => {
          enrollment.status =
            monthlyDates.status === OfferingStatus.ACTIVE
              ? EnrollmentStatus.ACTIVE
              : EnrollmentStatus.COMPLETED;
        });
        await this.enrollmentsRepository.save(offering.enrollments);
      }
    }
  }

  private createDemoTimeline(reference = new Date()) {
    const offerings: Record<
      string,
      { startsAt: Date; endsAt: Date; status: OfferingStatus }
    > = {
      'MAT-204': this.createMonthWindow(
        reference,
        -2,
        OfferingStatus.COMPLETED,
      ),
      'PRO-301': this.createMonthWindow(reference, 0, OfferingStatus.ACTIVE),
      'BD-202': this.createMonthWindow(
        reference,
        -1,
        OfferingStatus.COMPLETED,
      ),
    };
    const termStartsAt = offerings['MAT-204'].startsAt;
    const termEndsAt = offerings['PRO-301'].endsAt;

    return {
      termName: `${this.formatMonthYear(termStartsAt)} - ${this.formatMonthYear(
        termEndsAt,
      )}`,
      termStartsAt,
      termEndsAt,
      offerings,
    };
  }

  private createMonthWindow(
    reference: Date,
    monthOffset: number,
    status: OfferingStatus,
  ) {
    const year = reference.getUTCFullYear();
    const month = reference.getUTCMonth() + monthOffset;

    return {
      startsAt: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
      endsAt: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
      status,
    };
  }

  private formatMonthYear(date: Date) {
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  }
}
