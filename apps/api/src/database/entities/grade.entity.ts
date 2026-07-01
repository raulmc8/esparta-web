import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Enrollment } from './enrollment.entity';

@Entity('grades')
export class Grade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Enrollment, (enrollment) => enrollment.grade, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  enrollment: Enrollment;

  @Column({ type: 'float', nullable: true })
  firstPartial: number | null;

  @Column({ type: 'float', nullable: true })
  secondPartial: number | null;

  @Column({ type: 'float', nullable: true })
  finalExam: number | null;

  @UpdateDateColumn()
  updatedAt: Date;
}

