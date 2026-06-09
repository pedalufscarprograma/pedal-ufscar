import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WeekDay {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

@Entity('operating_hours')
export class OperatingHour {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'day_of_week',
    type: 'int',
    unique: true,
  })
  dayOfWeek!: WeekDay;

  @Column({
    name: 'is_open',
    type: 'boolean',
    default: true,
  })
  isOpen!: boolean;

  @Column({
    name: 'open_time',
    type: 'varchar',
    length: 5,
    nullable: true,
  })
  openTime!: string | null;

  @Column({
    name: 'close_time',
    type: 'varchar',
    length: 5,
    nullable: true,
  })
  closeTime!: string | null;

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