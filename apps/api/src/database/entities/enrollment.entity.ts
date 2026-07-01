import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EnrollmentStatus } from '../enums';
import { CourseOffering } from './course-offering.entity';
import { Grade } from './grade.entity';
import { User } from './user.entity';

@Entity('enrollments')
@Unique(['student', 'offering'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'simple-enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  @Column({ default: true })
  visibleToTeacher: boolean;

  @ManyToOne(() => User, (student) => student.enrollments, { nullable: false })
  student: User;

  @ManyToOne(() => CourseOffering, (offering) => offering.enrollments, {
    nullable: false,
  })
  offering: CourseOffering;

  @OneToOne(() => Grade, (grade) => grade.enrollment)
  grade?: Grade;

  @CreateDateColumn()
  enrolledAt: Date;
}
