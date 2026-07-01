import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/authenticated-user';
import { calculateAverage } from '../common/grade.utils';
import {
  CourseOffering,
  Enrollment,
  Grade,
} from '../database/entities';
import { OfferingStatus, UserRole } from '../database/enums';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(CourseOffering)
    private readonly offeringsRepository: Repository<CourseOffering>,
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,
    @InjectRepository(Grade)
    private readonly gradesRepository: Repository<Grade>,
  ) {}

  async getDashboard(teacherId: string) {
    const offerings = await this.offeringsRepository.find({
      where: {
        teacher: { id: teacherId },
        status: OfferingStatus.ACTIVE,
      },
      relations: {
        course: true,
        term: true,
        enrollments: { student: true, grade: true },
      },
      order: { startsAt: 'ASC', course: { name: 'ASC' } },
    });
    const now = new Date();
    const currentOfferings = offerings.filter((offering) => {
      const startsAt = offering.startsAt ?? offering.term.startsAt;
      const endsAt = offering.endsAt ?? offering.term.endsAt;
      return startsAt <= now && endsAt >= now;
    });

    return {
      offerings: currentOfferings.map((offering) => ({
        id: offering.id,
        section: offering.section,
        term: offering.term.name,
        startsAt: offering.startsAt ?? offering.term.startsAt,
        endsAt: offering.endsAt ?? offering.term.endsAt,
        course: {
          code: offering.course.code,
          name: offering.course.name,
        },
        students: offering.enrollments
          .filter((enrollment) => enrollment.visibleToTeacher)
          .map((enrollment) => ({
            enrollmentId: enrollment.id,
            student: {
              id: enrollment.student.id,
              name: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
              email: enrollment.student.email,
              username: enrollment.student.username,
            },
            grades: {
              finalGrade: calculateAverage(enrollment.grade),
            },
          }))
          .sort((a, b) => a.student.name.localeCompare(b.student.name)),
      })),
    };
  }

  async updateGrade(
    enrollmentId: string,
    values: UpdateGradeDto,
    currentUser: AuthenticatedUser,
  ) {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { id: enrollmentId },
      relations: {
        offering: { teacher: true },
        grade: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Inscripción no encontrada');
    }

    if (
      currentUser.role !== UserRole.ADMIN &&
      enrollment.offering.teacher.id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'No puedes modificar las calificaciones de este grupo',
      );
    }

    const grade =
      enrollment.grade ??
      this.gradesRepository.create({
        enrollment,
        firstPartial: null,
        secondPartial: null,
        finalExam: null,
      });

    if (values.finalGrade !== undefined) {
      grade.finalExam = values.finalGrade;
    }

    const savedGrade = await this.gradesRepository.save(grade);

    return {
      finalGrade: calculateAverage(savedGrade),
    };
  }
}
