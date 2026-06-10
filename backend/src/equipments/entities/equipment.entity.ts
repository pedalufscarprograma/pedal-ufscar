import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EquipmentType {
  BIKE = 'bike',
  HELMET = 'helmet',
  LOCK = 'lock',
  KEY = 'key',
}

export enum EquipmentStatus {
  AVAILABLE = 'available',
  LOANED = 'loaned',
  MAINTENANCE = 'maintenance',
  LOST = 'lost',
  DAMAGED = 'damaged',
  INACTIVE = 'inactive',
}

@Entity('equipments')
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: EquipmentType,
  })
  type!: EquipmentType;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
  })
  code!: string;

  @Column({
    type: 'varchar',
    length: 150,
  })
  name!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    name: 'photo_url',
    type: 'text',
    nullable: true,
  })
  photoUrl!: string | null;

  @Column({
    type: 'enum',
    enum: EquipmentStatus,
    default: EquipmentStatus.AVAILABLE,
  })
  status!: EquipmentStatus;

  @Column({
    name: 'is_published',
    type: 'boolean',
    default: false,
  })
  isPublished!: boolean;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes!: string | null;

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