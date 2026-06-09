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

export enum LoanStatus {
  ACTIVE = 'active',
  RETURNED = 'returned',
  LATE = 'late',
  LOST = 'lost',
  DAMAGED = 'damaged',
  CANCELLED = 'cancelled',
}

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true, nullable: false })
  user!: User;

  // Bicicleta principal
  @ManyToOne(() => Equipment, {
    eager: true,
    nullable: false,
  })
  equipment!: Equipment;

  // Capacete entregue junto
  @ManyToOne(() => Equipment, {
    eager: true,
    nullable: true,
  })
  helmet!: Equipment | null;

  // Trava entregue junto
  @ManyToOne(() => Equipment, {
    eager: true,
    nullable: true,
  })
  lock!: Equipment | null;

  @Column({
    name: 'loan_date',
    type: 'timestamp',
  })
  loanDate!: Date;

  @Column({
    name: 'expected_return_date',
    type: 'timestamp',
  })
  expectedReturnDate!: Date;

  @Column({
    name: 'return_date',
    type: 'timestamp',
    nullable: true,
  })
  returnDate!: Date | null;

  @Column({
    type: 'enum',
    enum: LoanStatus,
    default: LoanStatus.ACTIVE,
  })
  status!: LoanStatus;

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
    name: 'return_notes',
    type: 'text',
    nullable: true,
  })
  returnNotes!: string | null;

  @Column({
    name: 'responsibility_term_accepted',
    type: 'boolean',
    default: false,
  })
  responsibilityTermAccepted!: boolean;

  @Column({
    name: 'responsibility_term_accepted_at',
    type: 'timestamp',
    nullable: true,
  })
  responsibilityTermAcceptedAt!: Date | null;

  @Column({
    name: 'responsibility_term_text',
    type: 'text',
    nullable: true,
  })
  responsibilityTermText!: string | null;

  @Column({
    name: 'signature_image',
    type: 'text',
    nullable: true,
  })
  signatureImage!: string | null;

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