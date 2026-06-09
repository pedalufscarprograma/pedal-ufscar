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

export enum MaintenanceStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

@Entity('maintenance_records')
export class MaintenanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Equipment, { eager: true, nullable: false })
  equipment!: Equipment;

  @ManyToOne(() => User, { eager: true, nullable: true })
  reportedBy!: User | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  mechanic!: User | null;

  @Column({ name: 'problem_description', type: 'text' })
  problemDescription!: string;

  @Column({ name: 'solution_description', type: 'text', nullable: true })
  solutionDescription!: string | null;

  @Column({
    type: 'enum',
    enum: MaintenanceStatus,
    default: MaintenanceStatus.PENDING,
  })
  status!: MaintenanceStatus;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}