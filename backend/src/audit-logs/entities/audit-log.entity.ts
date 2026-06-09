import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditAction {
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  APPROVE_USER = 'APPROVE_USER',
  SUSPEND_USER = 'SUSPEND_USER',
  BLOCK_USER = 'BLOCK_USER',
  CANCEL_USER = 'CANCEL_USER',

  ACCEPT_TERMS = 'ACCEPT_TERMS',

  CREATE_EQUIPMENT = 'CREATE_EQUIPMENT',
  UPDATE_EQUIPMENT = 'UPDATE_EQUIPMENT',

  CREATE_LOAN = 'CREATE_LOAN',
  RETURN_LOAN = 'RETURN_LOAN',

  CREATE_MAINTENANCE = 'CREATE_MAINTENANCE',
  FINISH_MAINTENANCE = 'FINISH_MAINTENANCE',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: true,
  })
  userId!: string | null;

  @Column({
    name: 'user_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  userName!: string | null;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action!: AuditAction;

  @Column({
    type: 'varchar',
    length: 80,
  })
  entity!: string;

  @Column({
    name: 'entity_id',
    type: 'uuid',
    nullable: true,
  })
  entityId!: string | null;

  @Column({
    type: 'text',
  })
  description!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;
}