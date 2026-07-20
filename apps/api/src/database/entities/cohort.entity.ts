import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Career } from './career.entity';
import { User } from './user.entity';

@Entity('cohorts')
@Unique(['career', 'name'])
export class Cohort {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  startsAt: Date;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => Career, (career) => career.cohorts, { nullable: false })
  career: Career;

  @OneToMany(() => User, (user) => user.cohort)
  students: User[];
}
