import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { OfferingStatus } from '../enums';
import { Course } from './course.entity';
import { Cohort } from './cohort.entity';
import { Enrollment } from './enrollment.entity';
import { Term } from './term.entity';
import { User } from './user.entity';

@Entity('course_offerings')
@Unique(['course', 'term', 'section'])
export class CourseOffering {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  section: string;

  @Column({
    type: 'simple-enum',
    enum: OfferingStatus,
    default: OfferingStatus.ACTIVE,
  })
  status: OfferingStatus;

  @Column({ type: Date, nullable: true })
  startsAt: Date | null;

  @Column({ type: Date, nullable: true })
  endsAt: Date | null;

  @ManyToOne(() => Course, (course) => course.offerings, { nullable: false })
  course: Course;

  @ManyToOne(() => Term, (term) => term.offerings, { nullable: false })
  term: Term;

  @ManyToOne(() => User, (teacher) => teacher.teachingAssignments, {
    nullable: false,
  })
  teacher: User;

  @ManyToOne(() => Cohort, { nullable: true })
  cohort: Cohort | null;

  @Column({ type: 'integer', nullable: true })
  quadrimester: number | null;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.offering)
  enrollments: Enrollment[];
}
