import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { UserRole } from '../enums';
import { CourseOffering } from './course-offering.entity';
import { Enrollment } from './enrollment.entity';
import { Payment } from './payment.entity';
import { Cohort } from './cohort.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'text', unique: true, nullable: true })
  username: string | null;

  @Column()
  passwordHash: string;

  @Column({ type: 'text', nullable: true })
  resetPasswordTokenHash: string | null;

  @Column({ type: Date, nullable: true })
  resetPasswordExpiresAt: Date | null;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'simple-enum', enum: UserRole })
  role: UserRole;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => Cohort, (cohort) => cohort.students, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  cohort: Cohort | null;

  @OneToMany(() => CourseOffering, (offering) => offering.teacher)
  teachingAssignments: CourseOffering[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
  enrollments: Enrollment[];

  @OneToMany(() => Payment, (payment) => payment.student)
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
