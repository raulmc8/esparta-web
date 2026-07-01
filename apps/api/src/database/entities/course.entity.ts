import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CourseOffering } from './course-offering.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ default: 6 })
  credits: number;

  @OneToMany(() => CourseOffering, (offering) => offering.course)
  offerings: CourseOffering[];
}

