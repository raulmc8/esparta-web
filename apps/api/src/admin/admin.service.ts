import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
import { AuthenticatedUser } from '../common/authenticated-user';
import { EmailService } from '../common/email.service';
import { calculateAverage } from '../common/grade.utils';
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
import {
  EnrollmentStatus,
  OfferingStatus,
  PaymentStatus,
  UserRole,
} from '../database/enums';
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto';
import { CreateCohortDto } from './dto/create-cohort.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { AddOfferingStudentsDto } from './dto/add-offering-students.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { UpdateStudentPaymentDto } from './dto/update-student-payment.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Career)
    private readonly careersRepository: Repository<Career>,
    @InjectRepository(Cohort)
    private readonly cohortsRepository: Repository<Cohort>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,
    @InjectRepository(Grade)
    private readonly gradesRepository: Repository<Grade>,
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    @InjectRepository(CourseOffering)
    private readonly offeringsRepository: Repository<CourseOffering>,
    @InjectRepository(Term)
    private readonly termsRepository: Repository<Term>,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
  ) {}

  async getDashboard() {
    const [users, teachers, payments, enrollmentCount, offerings] =
      await Promise.all([
      this.usersRepository.find(),
      this.usersRepository.find({
        where: { role: UserRole.TEACHER, active: true },
        order: { lastName: 'ASC', firstName: 'ASC' },
      }),
      this.paymentsRepository.find({
        relations: { student: true, term: true },
        order: { updatedAt: 'DESC' },
      }),
      this.enrollmentsRepository.count(),
      this.offeringsRepository.find({
        relations: {
          course: true,
          teacher: true,
          term: true,
          enrollments: { student: true, grade: true },
        },
        order: { startsAt: 'DESC' },
      }),
    ]);

    const paidPayments = payments.filter(
      (payment) => payment.status === PaymentStatus.PAID,
    );
    const now = new Date();
    const currentOfferings = offerings.filter((offering) =>
      this.isOfferingCurrent(offering, now),
    );

    return {
      metrics: {
        students: users.filter((user) => user.role === UserRole.STUDENT).length,
        teachers: users.filter((user) => user.role === UserRole.TEACHER).length,
        activeCourses: currentOfferings.length,
        enrollments: enrollmentCount,
        collected: paidPayments.reduce(
          (total, payment) => total + payment.amount,
          0,
        ),
        pendingPayments: payments.filter(
          (payment) => payment.status === PaymentStatus.PENDING,
        ).length,
      },
      teachers: teachers.map((teacher) => this.toSafeUser(teacher)),
      offerings: offerings.map((offering) => ({
        id: offering.id,
        section: offering.section,
        term: offering.term.name,
        status: this.getOfferingStage(offering, now),
        startsAt: offering.startsAt ?? offering.term.startsAt,
        endsAt: offering.endsAt ?? offering.term.endsAt,
        course: {
          code: offering.course.code,
          name: offering.course.name,
        },
        teacher: {
          id: offering.teacher.id,
          name: `${offering.teacher.firstName} ${offering.teacher.lastName}`,
        },
        studentCount: offering.enrollments.length,
        students: offering.enrollments
          .map((enrollment) => ({
            enrollmentId: enrollment.id,
            id: enrollment.student.id,
            firstName: enrollment.student.firstName,
            lastName: enrollment.student.lastName,
            email: enrollment.student.email,
            username: enrollment.student.username,
            active: enrollment.student.active,
            status: enrollment.status,
            visibleToTeacher: enrollment.visibleToTeacher,
            finalGrade: enrollment.grade?.finalExam ?? null,
          }))
          .sort((first, second) =>
            `${first.lastName} ${first.firstName}`.localeCompare(
              `${second.lastName} ${second.firstName}`,
              'es',
            ),
          ),
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        student: {
          id: payment.student.id,
          name: `${payment.student.firstName} ${payment.student.lastName}`,
          email: payment.student.email,
        },
        term: payment.term.name,
        status: payment.status,
        amount: payment.amount,
        paidAt: payment.paidAt,
        updatedAt: payment.updatedAt,
      })),
    };
  }

  async searchStudents(query: string) {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 2) {
      return { students: [] };
    }

    const students = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.cohort', 'cohort')
      .leftJoinAndSelect('cohort.career', 'career')
      .where('user.role = :role', { role: UserRole.STUDENT })
      .andWhere(
        `(
          LOWER(user.firstName) LIKE :query
          OR LOWER(user.lastName) LIKE :query
          OR LOWER(user.email) LIKE :query
          OR LOWER(user.username) LIKE :query
          OR LOWER(user.firstName || ' ' || user.lastName) LIKE :query
        )`,
        { query: `%${normalizedQuery}%` },
      )
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .take(12)
      .getMany();

    return { students: await this.serializeUsers(students) };
  }

  async createUser(values: CreateUserDto) {
    if (
      values.role !== UserRole.STUDENT &&
      values.role !== UserRole.TEACHER
    ) {
      throw new BadRequestException(
        'Solo se pueden crear cuentas de alumnos o docentes',
      );
    }

    const email = values.email.trim().toLowerCase();
    const existingEmail = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingEmail) {
      throw new BadRequestException('El correo ya está registrado');
    }

    const username = values.username.trim().toUpperCase();
    const existingUsername = await this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) = :username', {
        username: username.toLowerCase(),
      })
      .getOne();
    if (existingUsername) {
      throw new BadRequestException('La matrícula o usuario ya está registrado');
    }

    const temporaryPassword = `E!${randomBytes(6).toString('hex')}`;
    const passwordHash = await hash(temporaryPassword, 10);

    let cohort: Cohort | null = null;
    if (values.role === UserRole.STUDENT && values.cohortId) {
      cohort = await this.cohortsRepository.findOne({
        where: { id: values.cohortId, active: true },
        relations: { career: true },
      });
      if (!cohort) {
        throw new BadRequestException('La generación seleccionada no es válida');
      }
    }

    const user = await this.usersRepository.save(
      this.usersRepository.create({
        email,
        username,
        passwordHash,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        role: values.role,
        active: true,
        cohort,
      }),
    );

    let credentialEmail: { delivered: boolean; error?: string };
    try {
      credentialEmail = await this.emailService.sendCredentials(
        user,
        username,
        temporaryPassword,
      );
    } catch (emailError) {
      credentialEmail = {
        delivered: false,
        error:
          emailError instanceof Error
            ? emailError.message
            : 'No fue posible enviar el correo',
      };
    }

    return {
      user: {
        ...this.toSafeUser(user),
        paymentStatus: null,
      },
      credentials: {
        username,
        password: temporaryPassword,
      },
      email: credentialEmail,
    };
  }

  async listUsers(
    query: string,
    role?: UserRole.STUDENT | UserRole.TEACHER,
  ) {
    if (
      role &&
      role !== UserRole.STUDENT &&
      role !== UserRole.TEACHER
    ) {
      throw new BadRequestException('El perfil solicitado no es válido');
    }

    const normalizedQuery = query.trim().toLowerCase();
    const usersQuery = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.cohort', 'cohort')
      .leftJoinAndSelect('cohort.career', 'career')
      .where('user.role IN (:...roles)', {
        roles: role ? [role] : [UserRole.STUDENT, UserRole.TEACHER],
      });

    if (normalizedQuery) {
      usersQuery.andWhere(
        `(
          LOWER(user.firstName) LIKE :query
          OR LOWER(user.lastName) LIKE :query
          OR LOWER(user.email) LIKE :query
          OR LOWER(user.username) LIKE :query
          OR LOWER(user.firstName || ' ' || user.lastName) LIKE :query
        )`,
        { query: `%${normalizedQuery}%` },
      );
    }

    const users = await usersQuery
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .getMany();

    return { users: await this.serializeUsers(users) };
  }

  async getStudentTranscript(userId: string) {
    const student = await this.usersRepository.findOne({
      where: { id: userId, role: UserRole.STUDENT },
      relations: { cohort: { career: true } },
    });
    if (!student) {
      throw new NotFoundException('Alumno no encontrado');
    }

    const enrollments = await this.enrollmentsRepository.find({
      where: {
        student: { id: userId },
        status: Not(EnrollmentStatus.DROPPED),
      },
      relations: {
        offering: { course: true, term: true, teacher: true },
        grade: true,
      },
      order: { offering: { startsAt: 'DESC' } },
    });

    const termIds = [
      ...new Set(enrollments.map((enrollment) => enrollment.offering.term.id)),
    ];
    const payments = termIds.length
      ? await this.paymentsRepository.find({
          where: {
            student: { id: userId },
            term: { id: In(termIds) },
          },
          relations: { term: true },
        })
      : [];
    const paymentsByTerm = new Map(
      payments.map((payment) => [payment.term.id, payment]),
    );
    const now = new Date();
    const history = enrollments
      .filter(
        (enrollment) =>
          this.getOfferingStage(enrollment.offering, now) === 'COMPLETED',
      )
      .map((enrollment) => {
        const startsAt =
          enrollment.offering.startsAt ?? enrollment.offering.term.startsAt;
        const endsAt =
          enrollment.offering.endsAt ?? enrollment.offering.term.endsAt;
        const payment = paymentsByTerm.get(enrollment.offering.term.id);

        return {
          enrollmentId: enrollment.id,
          course: {
            code: enrollment.offering.course.code,
            name: enrollment.offering.course.name,
          },
          section: enrollment.offering.section,
          term: enrollment.offering.term.name,
          startsAt,
          endsAt,
          teacher: `${enrollment.offering.teacher.firstName} ${enrollment.offering.teacher.lastName}`,
          payment: payment
            ? {
                status: payment.status,
                amount: payment.amount,
                paidAt: payment.paidAt,
              }
            : {
                status: PaymentStatus.PENDING,
                amount: 0,
                paidAt: null,
              },
          canViewGrades: true,
          grades: {
            finalGrade: calculateAverage(enrollment.grade),
          },
        };
      });
    const grades = history
      .map((course) => course.grades.finalGrade)
      .filter((grade): grade is number => grade !== null);

    return {
      user: this.toSafeUser(student),
      history,
      generalAverage: grades.length
        ? (
            grades.reduce((total, grade) => total + grade, 0) / grades.length
          ).toFixed(1)
        : '—',
    };
  }

  async getAcademicStructure() {
    const careers = await this.careersRepository.find({
      where: { active: true },
      relations: { cohorts: { students: true } },
      order: { name: 'ASC' },
    });

    return {
      careers: careers.map((career) => ({
        id: career.id,
        name: career.name,
        cohorts: career.cohorts
          .filter((cohort) => cohort.active)
          .sort((first, second) => second.startsAt.getTime() - first.startsAt.getTime())
          .map((cohort) => ({
            id: cohort.id,
            name: cohort.name,
            startsAt: cohort.startsAt,
            studentCount: cohort.students.filter(
              (student) => student.role === UserRole.STUDENT,
            ).length,
          })),
      })),
    };
  }

  async createCohort(values: CreateCohortDto) {
    const careerName = values.careerName.trim();
    const cohortName = values.cohortName.trim();
    let career = await this.careersRepository
      .createQueryBuilder('career')
      .where('LOWER(career.name) = :name', { name: careerName.toLowerCase() })
      .getOne();

    if (!career) {
      career = await this.careersRepository.save(
        this.careersRepository.create({ name: careerName, active: true }),
      );
    }

    const duplicate = await this.cohortsRepository
      .createQueryBuilder('cohort')
      .leftJoin('cohort.career', 'career')
      .where('career.id = :careerId', { careerId: career.id })
      .andWhere('LOWER(cohort.name) = :name', {
        name: cohortName.toLowerCase(),
      })
      .getOne();
    if (duplicate) {
      throw new BadRequestException(
        'Esta generación ya existe dentro de la carrera',
      );
    }

    const startsAt = this.parseDateBoundary(values.startsAt, false);
    const cohort = await this.cohortsRepository.save(
      this.cohortsRepository.create({
        career,
        name: cohortName,
        startsAt,
        active: true,
      }),
    );

    return {
      id: cohort.id,
      name: cohort.name,
      startsAt: cohort.startsAt,
      studentCount: 0,
      career: { id: career.id, name: career.name },
    };
  }

  async createOffering(values: CreateCourseOfferingDto) {
    const startsAt = this.parseDateBoundary(values.startsAt, false);
    const endsAt = this.parseDateBoundary(values.endsAt, true);

    if (startsAt > endsAt) {
      throw new BadRequestException(
        'La fecha de término debe ser posterior a la fecha de inicio',
      );
    }

    const teacher = await this.usersRepository.findOne({
      where: { id: values.teacherId, role: UserRole.TEACHER, active: true },
    });
    if (!teacher) {
      throw new BadRequestException('El docente seleccionado no es válido');
    }

    const uniqueStudentIds = [...new Set(values.studentIds)];
    const students = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.id IN (:...studentIds)', { studentIds: uniqueStudentIds })
      .andWhere('user.role = :role', { role: UserRole.STUDENT })
      .andWhere('user.active = :active', { active: true })
      .getMany();

    if (students.length !== uniqueStudentIds.length) {
      throw new BadRequestException(
        'Uno o más alumnos seleccionados no son válidos',
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const courseRepository = manager.getRepository(Course);
      const offeringRepository = manager.getRepository(CourseOffering);
      const enrollmentRepository = manager.getRepository(Enrollment);
      const paymentRepository = manager.getRepository(Payment);

      const normalizedCode = values.courseCode.trim().toUpperCase();
      let course = await courseRepository.findOne({
        where: { code: normalizedCode },
      });

      if (!course) {
        course = courseRepository.create({
          code: normalizedCode,
          name: values.courseName.trim(),
          credits: 0,
        });
      } else {
        course.name = values.courseName.trim();
        course.credits = 0;
      }
      course = await courseRepository.save(course);

      const term = await this.resolveTerm(startsAt, manager);
      const duplicate = await offeringRepository.findOne({
        where: {
          course: { id: course.id },
          term: { id: term.id },
          section: values.section.trim().toUpperCase(),
        },
      });
      if (duplicate) {
        throw new BadRequestException(
          'Ya existe ese grupo para la materia en el periodo',
        );
      }

      const offering = await offeringRepository.save(
        offeringRepository.create({
          course,
          term,
          teacher,
          section: values.section.trim().toUpperCase(),
          startsAt,
          endsAt,
          status:
            endsAt < new Date()
              ? OfferingStatus.COMPLETED
              : OfferingStatus.ACTIVE,
        }),
      );

      await enrollmentRepository.save(
        students.map((student) =>
          enrollmentRepository.create({
            student,
            offering,
            status:
              offering.status === OfferingStatus.COMPLETED
                ? EnrollmentStatus.COMPLETED
                : EnrollmentStatus.ACTIVE,
          }),
        ),
      );

      const existingPayments = await paymentRepository
        .createQueryBuilder('payment')
        .leftJoinAndSelect('payment.student', 'student')
        .where('payment.termId = :termId', { termId: term.id })
        .andWhere('student.id IN (:...studentIds)', {
          studentIds: uniqueStudentIds,
        })
        .getMany();
      const studentsWithPayment = new Set(
        existingPayments.map((payment) => payment.student.id),
      );
      const missingPayments = students.filter(
        (student) => !studentsWithPayment.has(student.id),
      );

      if (missingPayments.length) {
        await paymentRepository.save(
          missingPayments.map((student) =>
            paymentRepository.create({
              student,
              term,
              status: PaymentStatus.PENDING,
              amount: 0,
              paidAt: null,
            }),
          ),
        );
      }

      return { offering, course, term };
    });

    return {
      id: result.offering.id,
      section: result.offering.section,
      startsAt: result.offering.startsAt,
      endsAt: result.offering.endsAt,
      course: {
        code: result.course.code,
        name: result.course.name,
      },
      teacher: {
        id: teacher.id,
        name: `${teacher.firstName} ${teacher.lastName}`,
      },
      studentCount: students.length,
      term: result.term.name,
    };
  }

  async updateOffering(offeringId: string, values: UpdateOfferingDto) {
    const [offering, teacher] = await Promise.all([
      this.offeringsRepository.findOne({
        where: { id: offeringId },
        relations: { course: true, teacher: true },
      }),
      this.usersRepository.findOne({
        where: { id: values.teacherId, role: UserRole.TEACHER, active: true },
      }),
    ]);
    if (!offering) {
      throw new NotFoundException('Materia no encontrada');
    }
    if (!teacher) {
      throw new BadRequestException('El docente seleccionado no es válido');
    }

    offering.teacher = teacher;
    await this.offeringsRepository.save(offering);
    return {
      id: offering.id,
      teacher: {
        id: teacher.id,
        name: `${teacher.firstName} ${teacher.lastName}`,
      },
    };
  }

  async addOfferingStudents(
    offeringId: string,
    values: AddOfferingStudentsDto,
  ) {
    const offering = await this.offeringsRepository.findOne({
      where: { id: offeringId },
      relations: { term: true },
    });
    if (!offering) {
      throw new NotFoundException('Materia no encontrada');
    }

    const studentIds = [...new Set(values.studentIds)];
    const students = await this.usersRepository.find({
      where: { id: In(studentIds), role: UserRole.STUDENT, active: true },
    });
    if (students.length !== studentIds.length) {
      throw new BadRequestException('Uno o más alumnos no son válidos');
    }

    const existing = await this.enrollmentsRepository.find({
      where: { offering: { id: offeringId }, student: { id: In(studentIds) } },
      relations: { student: true },
    });
    const existingIds = new Set(existing.map((item) => item.student.id));
    const newStudents = students.filter(
      (student) => !existingIds.has(student.id),
    );
    if (newStudents.length) {
      await this.enrollmentsRepository.save(
        newStudents.map((student) =>
          this.enrollmentsRepository.create({
            student,
            offering,
            visibleToTeacher: true,
            status:
              offering.status === OfferingStatus.COMPLETED
                ? EnrollmentStatus.COMPLETED
                : EnrollmentStatus.ACTIVE,
          }),
        ),
      );

      const existingPayments = await this.paymentsRepository.find({
        where: {
          term: { id: offering.term.id },
          student: { id: In(newStudents.map((student) => student.id)) },
        },
        relations: { student: true },
      });
      const studentsWithPayment = new Set(
        existingPayments.map((payment) => payment.student.id),
      );
      const missingPayments = newStudents.filter(
        (student) => !studentsWithPayment.has(student.id),
      );
      if (missingPayments.length) {
        await this.paymentsRepository.save(
          missingPayments.map((student) =>
            this.paymentsRepository.create({
              student,
              term: offering.term,
              status: PaymentStatus.PENDING,
              amount: 0,
              paidAt: null,
            }),
          ),
        );
      }
    }

    return { added: newStudents.length };
  }

  async removeOfferingStudent(offeringId: string, enrollmentId: string) {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { id: enrollmentId, offering: { id: offeringId } },
    });
    if (!enrollment) {
      throw new NotFoundException('Inscripción no encontrada');
    }
    await this.enrollmentsRepository.remove(enrollment);
    return { id: enrollmentId, deleted: true };
  }

  async updateEnrollment(
    enrollmentId: string,
    changes: UpdateEnrollmentDto,
  ) {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { id: enrollmentId },
      relations: { grade: true },
    });
    if (!enrollment) {
      throw new NotFoundException('Inscripción no encontrada');
    }

    if (changes.visibleToTeacher !== undefined) {
      enrollment.visibleToTeacher = changes.visibleToTeacher;
      await this.enrollmentsRepository.save(enrollment);
    }

    let finalGrade = enrollment.grade?.finalExam ?? null;
    if (changes.finalGrade !== undefined) {
      const grade =
        enrollment.grade ??
        this.gradesRepository.create({
          enrollment,
          firstPartial: null,
          secondPartial: null,
          finalExam: null,
        });
      grade.finalExam = changes.finalGrade;
      finalGrade = (await this.gradesRepository.save(grade)).finalExam;
    }

    return {
      enrollmentId,
      visibleToTeacher: enrollment.visibleToTeacher,
      finalGrade,
    };
  }

  async updateUser(
    userId: string,
    changes: UpdateUserDto,
    currentUser: AuthenticatedUser,
  ) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: { cohort: { career: true } },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (
      user.id === currentUser.id &&
      (changes.active === false ||
        (changes.role && changes.role !== UserRole.ADMIN))
    ) {
      throw new BadRequestException(
        'No puedes desactivar ni retirar tu propio acceso administrativo',
      );
    }

    if (changes.email) {
      user.email = changes.email.trim().toLowerCase();
    }
    if (changes.username !== undefined) {
      user.username = changes.username.trim().toUpperCase();
    }
    if (changes.firstName !== undefined) {
      user.firstName = changes.firstName.trim();
    }
    if (changes.lastName !== undefined) {
      user.lastName = changes.lastName.trim();
    }
    if (changes.role !== undefined) {
      if (
        changes.role !== UserRole.STUDENT &&
        changes.role !== UserRole.TEACHER &&
        user.id !== currentUser.id
      ) {
        throw new BadRequestException('El perfil seleccionado no es válido');
      }
      user.role = changes.role;
    }
    if (changes.active !== undefined) {
      user.active = changes.active;
    }
    if (changes.cohortId !== undefined) {
      if (user.role !== UserRole.STUDENT) {
        throw new BadRequestException(
          'Solo los alumnos pueden asignarse a una generación',
        );
      }
      const cohort = await this.cohortsRepository.findOne({
        where: { id: changes.cohortId, active: true },
        relations: { career: true },
      });
      if (!cohort) {
        throw new BadRequestException('La generación seleccionada no es válida');
      }
      user.cohort = cohort;
    }
    if (changes.role === UserRole.TEACHER) {
      user.cohort = null;
    }

    try {
      return this.toSafeUser(await this.usersRepository.save(user));
    } catch {
      throw new BadRequestException(
        'El correo, matrícula o usuario ya está registrado',
      );
    }
  }

  async updateStudentPayment(
    userId: string,
    changes: UpdateStudentPaymentDto,
  ) {
    const student = await this.usersRepository.findOne({
      where: { id: userId, role: UserRole.STUDENT },
    });
    if (!student) {
      throw new NotFoundException('Alumno no encontrado');
    }

    const enrollments = await this.enrollmentsRepository.find({
      where: {
        student: { id: userId },
        status: Not(EnrollmentStatus.DROPPED),
      },
      relations: { offering: { term: true } },
    });
    const terms = [
      ...new Map(
        enrollments.map((enrollment) => [
          enrollment.offering.term.id,
          enrollment.offering.term,
        ]),
      ).values(),
    ];

    if (!terms.length) {
      const activeTerms = await this.termsRepository.find({
        where: { active: true },
        order: { startsAt: 'DESC' },
      });
      const now = new Date();
      const currentTerm =
        activeTerms.find(
          (term) => term.startsAt <= now && term.endsAt >= now,
        ) ?? activeTerms[0];
      if (currentTerm) {
        terms.push(currentTerm);
      }
    }

    if (!terms.length) {
      throw new BadRequestException(
        'No existe un periodo académico para registrar el pago',
      );
    }

    const existingPayments = await this.paymentsRepository.find({
      where: {
        student: { id: userId },
        term: { id: In(terms.map((term) => term.id)) },
      },
      relations: { term: true },
    });
    const paymentsByTerm = new Map(
      existingPayments.map((payment) => [payment.term.id, payment]),
    );

    const savedPayments = await this.paymentsRepository.save(
      terms.map((term) => {
        const payment =
          paymentsByTerm.get(term.id) ??
          this.paymentsRepository.create({
            student,
            term,
            amount: 0,
          });
        payment.status = changes.status;
        payment.paidAt =
          changes.status === PaymentStatus.PAID
            ? payment.paidAt ?? new Date()
            : null;
        return payment;
      }),
    );

    return {
      userId,
      status: changes.status,
      periodsUpdated: savedPayments.length,
    };
  }

  async deleteUser(userId: string, currentUser: AuthenticatedUser) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.id === currentUser.id || user.role === UserRole.ADMIN) {
      throw new BadRequestException(
        'No puedes eliminar una cuenta administrativa desde esta sección',
      );
    }

    if (user.role === UserRole.TEACHER) {
      const assignedOfferings = await this.offeringsRepository.find({
        where: { teacher: { id: user.id } },
        relations: { course: true, term: true },
        order: { startsAt: 'DESC' },
        take: 3,
      });
      if (assignedOfferings.length) {
        const offeringNames = assignedOfferings
          .map(
            (offering) =>
              `${offering.course.name} (${offering.section}, ${offering.term.name})`,
          )
          .join(', ');
        throw new BadRequestException(
          `No se puede eliminar este docente porque está asignado a ${offeringNames}. Primero cambia el maestro responsable en la materia y después vuelve a eliminarlo.`,
        );
      }
    }

    await this.dataSource.transaction(async (manager) => {
      if (user.role === UserRole.STUDENT) {
        const payments = await manager.getRepository(Payment).find({
          where: { student: { id: user.id } },
        });
        const enrollments = await manager.getRepository(Enrollment).find({
          where: { student: { id: user.id } },
        });
        if (payments.length) {
          await manager.getRepository(Payment).remove(payments);
        }
        if (enrollments.length) {
          await manager.getRepository(Enrollment).remove(enrollments);
        }
      }
      await manager.getRepository(User).remove(user);
    });

    return { id: user.id, deleted: true };
  }

  async updatePayment(paymentId: string, changes: UpdatePaymentDto) {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
      relations: { student: true, term: true },
    });

    if (!payment) {
      throw new NotFoundException('Registro de pago no encontrado');
    }

    payment.status = changes.status;
    if (changes.paidAt) {
      payment.paidAt = this.parsePaymentDate(changes.paidAt);
    } else if (changes.status === PaymentStatus.PAID && !payment.paidAt) {
      payment.paidAt = new Date();
    }

    if (changes.amount !== undefined) {
      payment.amount = changes.amount;
    }

    const savedPayment = await this.paymentsRepository.save(payment);

    return {
      id: savedPayment.id,
      status: savedPayment.status,
      amount: savedPayment.amount,
      paidAt: savedPayment.paidAt,
      updatedAt: savedPayment.updatedAt,
    };
  }

  private toSafeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      active: user.active,
      cohort: user.cohort
        ? {
            id: user.cohort.id,
            name: user.cohort.name,
            startsAt: user.cohort.startsAt,
            career: {
              id: user.cohort.career.id,
              name: user.cohort.career.name,
            },
          }
        : null,
      createdAt: user.createdAt,
    };
  }

  private async serializeUsers(users: User[]) {
    const studentIds = users
      .filter((user) => user.role === UserRole.STUDENT)
      .map((user) => user.id);
    if (!studentIds.length) {
      return users.map((user) => ({
        ...this.toSafeUser(user),
        paymentStatus: null,
      }));
    }

    const [enrollments, payments] = await Promise.all([
      this.enrollmentsRepository.find({
        where: {
          student: { id: In(studentIds) },
          status: Not(EnrollmentStatus.DROPPED),
        },
        relations: { student: true, offering: { term: true } },
      }),
      this.paymentsRepository.find({
        where: { student: { id: In(studentIds) } },
        relations: { student: true, term: true },
        order: { updatedAt: 'DESC' },
      }),
    ]);

    const termIdsByStudent = new Map<string, Set<string>>();
    for (const enrollment of enrollments) {
      const termIds =
        termIdsByStudent.get(enrollment.student.id) ?? new Set<string>();
      termIds.add(enrollment.offering.term.id);
      termIdsByStudent.set(enrollment.student.id, termIds);
    }

    const paymentsByStudent = new Map<string, Payment[]>();
    for (const payment of payments) {
      const studentPayments =
        paymentsByStudent.get(payment.student.id) ?? [];
      studentPayments.push(payment);
      paymentsByStudent.set(payment.student.id, studentPayments);
    }

    return users.map((user) => {
      if (user.role !== UserRole.STUDENT) {
        return { ...this.toSafeUser(user), paymentStatus: null };
      }

      const studentPayments = paymentsByStudent.get(user.id) ?? [];
      const enrolledTermIds = termIdsByStudent.get(user.id);
      const relevantPayments = enrolledTermIds?.size
        ? [...enrolledTermIds].map((termId) =>
            studentPayments.find((payment) => payment.term.id === termId),
          )
        : studentPayments.slice(0, 1);
      const paymentStatus = relevantPayments.length
        ? relevantPayments.every(
            (payment) => payment?.status === PaymentStatus.PAID,
          )
          ? PaymentStatus.PAID
          : relevantPayments.some(
                (payment) => payment?.status === PaymentStatus.OVERDUE,
              )
            ? PaymentStatus.OVERDUE
            : PaymentStatus.PENDING
        : null;

      return { ...this.toSafeUser(user), paymentStatus };
    });
  }

  private isOfferingCurrent(offering: CourseOffering, now: Date) {
    const startsAt = offering.startsAt ?? offering.term.startsAt;
    const endsAt = offering.endsAt ?? offering.term.endsAt;
    return (
      offering.status === OfferingStatus.ACTIVE &&
      startsAt <= now &&
      endsAt >= now
    );
  }

  private getOfferingStage(offering: CourseOffering, now: Date) {
    const startsAt = offering.startsAt ?? offering.term.startsAt;
    const endsAt = offering.endsAt ?? offering.term.endsAt;
    if (offering.status === OfferingStatus.COMPLETED || endsAt < now) {
      return 'COMPLETED';
    }
    if (startsAt > now) {
      return 'UPCOMING';
    }
    return 'ACTIVE';
  }

  private parseDateBoundary(value: string, endOfDay: boolean) {
    const dateOnly = value.slice(0, 10);
    const date = new Date(
      `${dateOnly}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`,
    );
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Las fechas de la materia no son válidas');
    }
    return date;
  }

  private parsePaymentDate(value: string) {
    const date = new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('La fecha de pago no es válida');
    }
    return date;
  }

  private async resolveTerm(startsAt: Date, manager: DataSource['manager']) {
    const termRepository = manager.getRepository(Term);
    const terms = await termRepository.find();
    const matchingTerm = terms.find(
      (term) => term.startsAt <= startsAt && term.endsAt >= startsAt,
    );
    if (matchingTerm) {
      return matchingTerm;
    }

    const year = startsAt.getUTCFullYear();
    const firstSemester = startsAt.getUTCMonth() < 6;
    const name = firstSemester
      ? `Enero - Junio ${year}`
      : `Julio - Diciembre ${year}`;
    const existingByName = await termRepository.findOne({ where: { name } });
    if (existingByName) {
      return existingByName;
    }

    return termRepository.save(
      termRepository.create({
        name,
        startsAt: new Date(
          `${year}-${firstSemester ? '01-01' : '07-01'}T00:00:00.000Z`,
        ),
        endsAt: new Date(
          `${year}-${firstSemester ? '06-30' : '12-31'}T23:59:59.999Z`,
        ),
        active: true,
      }),
    );
  }
}
