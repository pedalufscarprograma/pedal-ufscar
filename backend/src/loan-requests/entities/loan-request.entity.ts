import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Equipment } from '../../equipments/entities/equipment.entity';
import { User } from '../../users/entities/user.entity';

export enum LoanRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  CONVERTED_TO_LOAN = 'converted_to_loan',
}

@Entity('loan_requests')
export class LoanRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, {
    eager: true,
    nullable: false,
  })
  user!: User;

  @ManyToOne(() => Equipment, {
    eager: true,
    nullable: false,
  })
  equipment!: Equipment;

  @Column({
    name: 'expected_return_date',
    type: 'timestamp',
  })
  expectedReturnDate!: Date;

  @Column({
    type: 'enum',
    enum: LoanRequestStatus,
    default: LoanRequestStatus.PENDING,
  })
  status!: LoanRequestStatus;

  @Column({
    type: 'text',
    nullable: true,
  })
  purpose!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes!: string | null;

  @Column({
    name: 'admin_notes',
    type: 'text',
    nullable: true,
  })
  adminNotes!: string | null;

  @Column({
    name: 'reviewed_at',
    type: 'timestamptz',
    nullable: true,
  })
  reviewedAt!: Date | null;

  @ManyToOne(() => User, {
    eager: true,
    nullable: true,
  })
  reviewedBy!: User | null;

  @Column({
    name: 'pickup_date',
    type: 'date',
    nullable: true,
  })
  pickupDate!: Date | null;

  @Column({
    name: 'pickup_start_time',
    type: 'varchar',
    length: 5,
    nullable: true,
  })
  pickupStartTime!: string | null;

  @Column({
    name: 'pickup_end_time',
    type: 'varchar',
    length: 5,
    nullable: true,
  })
  pickupEndTime!: string | null;

  @Column({
    name: 'pickup_expired_at',
    type: 'timestamptz',
    nullable: true,
  })
  pickupExpiredAt!: Date | null;

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