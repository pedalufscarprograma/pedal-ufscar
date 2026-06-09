import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserType {
  STUDENT = 'student',
  TEACHER = 'teacher',
  STAFF = 'staff',
  OUTSOURCED_WORKER = 'outsourced_worker',
  ADMIN = 'admin',
  OPERATOR = 'operator',
  MECHANIC = 'mechanic',
}

export enum UserStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'full_name',
    type: 'varchar',
    length: 150,
  })
  fullName!: string;

  @Column({
    type: 'varchar',
    length: 150,
    unique: true,
  })
  email!: string;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  phone!: string | null;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordHash!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: true,
  })
  cpf!: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  rg!: string | null;

  @Column({
    name: 'birth_date',
    type: 'date',
    nullable: true,
  })
  birthDate!: Date | null;

  @Column({
    name: 'birth_place',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  birthPlace!: string | null;

  @Column({
    name: 'nationality',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  nationality!: string | null;

  @Column({
    name: 'ufscar_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  ufscarNumber!: string | null;

  @Column({
    name: 'course_or_department',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  courseOrDepartment!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  address!: string | null;

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: UserType,
    default: UserType.STUDENT,
  })
  userType!: UserType;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status!: UserStatus;

  @Column({
    name: 'racial_identity',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  racialIdentity!: string | null;

  @Column({
    name: 'gender_identity',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  genderIdentity!: string | null;

  @Column({
    name: 'social_class',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  socialClass!: string | null;

  @Column({
    name: 'photo_url',
    type: 'text',
    nullable: true,
  })
  photoUrl!: string | null;

  // ===========================
  // TERMOS DE USO DO SISTEMA
  // ===========================

  @Column({
    name: 'terms_accepted',
    type: 'boolean',
    default: false,
  })
  termsAccepted!: boolean;

  @Column({
    name: 'terms_accepted_at',
    type: 'timestamp',
    nullable: true,
  })
  termsAcceptedAt!: Date | null;

  @Column({
    name: 'terms_version',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  termsVersion!: string | null;

  // ===========================
  // SUSPENSÃO AUTOMÁTICA
  // ===========================

  @Column({
    name: 'suspension_reason',
    type: 'text',
    nullable: true,
  })
  suspensionReason!: string | null;

  @Column({
    name: 'suspended_at',
    type: 'timestamp',
    nullable: true,
  })
  suspendedAt!: Date | null;

  // ===========================
  // APROVAÇÃO DE ALTERAÇÕES
  // ===========================

  @Column({
    name: 'pending_cpf',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  pendingCpf!: string | null;

  @Column({
    name: 'pending_rg',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  pendingRg!: string | null;

  @Column({
    name: 'pending_birth_date',
    type: 'date',
    nullable: true,
  })
  pendingBirthDate!: Date | null;

  @Column({
    name: 'pending_ufscar_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  pendingUfscarNumber!: string | null;

  @Column({
    name: 'has_pending_changes',
    type: 'boolean',
    default: false,
  })
  hasPendingChanges!: boolean;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;
}