import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentStatus } from '../enums';
import { Term } from './term.entity';
import { User } from './user.entity';

@Entity('payments')
@Unique(['student', 'term'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'simple-enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'float', default: 0 })
  amount: number;

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date | null;

  @ManyToOne(() => User, (student) => student.payments, { nullable: false })
  student: User;

  @ManyToOne(() => Term, (term) => term.payments, { nullable: false })
  term: Term;

  @UpdateDateColumn()
  updatedAt: Date;
}

