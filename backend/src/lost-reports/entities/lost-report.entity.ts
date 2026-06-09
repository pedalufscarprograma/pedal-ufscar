import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Loan } from '../../loans/entities/loan.entity';
import { User } from '../../users/entities/user.entity';

export enum LostReportType {
  THEFT = 'theft',
  ROBBERY = 'robbery',
  LOSS = 'loss',
}

export enum LostReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  REJECTED = 'rejected',
}

@Entity('lost_reports')
export class LostReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Loan, {
    eager: true,
    nullable: false,
  })
  loan!: Loan;

  @ManyToOne(() => User, {
    eager: true,
    nullable: false,
  })
  user!: User;

  @Column({
    type: 'enum',
    enum: LostReportType,
  })
  type!: LostReportType;

  @Column({
    type: 'text',
  })
  description!: string;

  @Column({
    name: 'occurrence_document_url',
    type: 'text',
    nullable: true,
  })
  occurrenceDocumentUrl!: string | null;

  @Column({
    name: 'admin_notes',
    type: 'text',
    nullable: true,
  })
  adminNotes!: string | null;

  @Column({
    type: 'enum',
    enum: LostReportStatus,
    default: LostReportStatus.PENDING,
  })
  status!: LostReportStatus;

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