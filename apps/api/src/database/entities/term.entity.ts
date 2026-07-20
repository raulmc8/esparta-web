import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CourseOffering } from './course-offering.entity';
import { Payment } from './payment.entity';

@Entity('terms')
export class Term {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  startsAt: Date;

  @Column()
  endsAt: Date;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => CourseOffering, (offering) => offering.term)
  offerings: CourseOffering[];

  @OneToMany(() => Payment, (payment) => payment.term)
  payments: Payment[];
}
