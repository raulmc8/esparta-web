import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Career } from './career.entity';
import { CourseOffering } from './course-offering.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  credits: number;

  @ManyToOne(() => Career, (career) => career.courses, { nullable: true })
  career: Career | null;

  @OneToMany(() => CourseOffering, (offering) => offering.course)
  offerings: CourseOffering[];
}
