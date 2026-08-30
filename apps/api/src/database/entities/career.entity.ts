import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Cohort } from './cohort.entity';
import { Course } from './course.entity';

@Entity('careers')
export class Career {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => Cohort, (cohort) => cohort.career)
  cohorts: Cohort[];

  @OneToMany(() => Course, (course) => course.career)
  courses: Course[];
}
