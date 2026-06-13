import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Loan } from './loan.entity';
import { User } from '../../users/entities/user.entity';

export enum LoanRenewalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('loan_renewals')
export class LoanRenewal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Loan, {
    eager: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  loan!: Loan;

  @ManyToOne(() => User, {
    eager: true,
    nullable: false,
  })
  requestedBy!: User;

  @ManyToOne(() => User, {
    eager: true,
    nullable: true,
  })
  reviewedBy!: User | null;

  @Column({
    name: 'old_expected_return_date',
    type: 'timestamp',
  })
  oldExpectedReturnDate!: Date;

  @Column({
    name: 'requested_return_date',
    type: 'timestamp',
  })
  requestedReturnDate!: Date;

  @Column({
    name: 'approved_return_date',
    type: 'timestamp',
    nullable: true,
  })
  approvedReturnDate!: Date | null;

  @Column({
    type: 'enum',
    enum: LoanRenewalStatus,
    default: LoanRenewalStatus.PENDING,
  })
  status!: LoanRenewalStatus;

  @Column({
    name: 'request_reason',
    type: 'text',
    nullable: true,
  })
  requestReason!: string | null;

  @Column({
    name: 'review_notes',
    type: 'text',
    nullable: true,
  })
  reviewNotes!: string | null;

  @Column({
    name: 'reviewed_at',
    type: 'timestamp',
    nullable: true,
  })
  reviewedAt!: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;
}