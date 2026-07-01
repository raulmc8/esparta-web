import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { calculateAverage } from '../common/grade.utils';
import {
  CourseOffering,
  Enrollment,
  Payment,
} from '../database/entities';
import {
  EnrollmentStatus,
  OfferingStatus,
  PaymentStatus,
} from '../database/enums';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {}

  async getDashboard(studentId: string) {
    const enrollments = await this.enrollmentsRepository.find({
      where: {
        student: { id: studentId },
        status: Not(EnrollmentStatus.DROPPED),
      },
      relations: {
        offering: { course: true, term: true, teacher: true },
        grade: true,
      },
      order: { offering: { startsAt: 'DESC' } },
    });

    const termIds = [...new Set(enrollments.map((item) => item.offering.term.id))];
    const payments = termIds.length
      ? await this.paymentsRepository.find({
          where: {
            student: { id: studentId },
            term: { id: In(termIds) },
          },
          relations: { term: true },
        })
      : [];

    const paymentsByTerm = new Map(
      payments.map((payment) => [payment.term.id, payment]),
    );

    const now = new Date();
    const serializedEnrollments = enrollments.map((enrollment) => {
      const payment = paymentsByTerm.get(enrollment.offering.term.id);
      return this.serializeEnrollment(enrollment, payment);
    });

    return {
      currentCourses: serializedEnrollments.filter(({ offering }) =>
        this.isOfferingCurrent(offering, now),
      ).map(({ offering: _offering, ...course }) => course),
      history: serializedEnrollments.filter(({ offering }) =>
        this.isOfferingHistorical(offering, now),
      ).map(({ offering: _offering, ...course }) => course),
    };
  }

  private serializeEnrollment(enrollment: Enrollment, payment?: Payment) {
    const canViewGrades = payment?.status === PaymentStatus.PAID;
    const startsAt =
      enrollment.offering.startsAt ?? enrollment.offering.term.startsAt;
    const endsAt =
      enrollment.offering.endsAt ?? enrollment.offering.term.endsAt;

    return {
      offering: enrollment.offering,
      enrollmentId: enrollment.id,
      course: {
        code: enrollment.offering.course.code,
        name: enrollment.offering.course.name,
        credits: enrollment.offering.course.credits,
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
      canViewGrades,
      grades: canViewGrades
        ? {
            finalGrade: calculateAverage(enrollment.grade),
          }
        : null,
    };
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

  private isOfferingHistorical(offering: CourseOffering, now: Date) {
    const endsAt = offering.endsAt ?? offering.term.endsAt;
    return offering.status === OfferingStatus.COMPLETED || endsAt < now;
  }
}
