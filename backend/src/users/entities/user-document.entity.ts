import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from './user.entity';

export enum UserDocumentType {
  RG_CIN = 'rg_cin',
  RA_IDENTIDADE_FUNCIONAL = 'ra_identidade_funcional',
  COMPROVANTE_ENDERECO = 'comprovante_endereco',
}

@Entity('user_documents')
export class UserDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: UserDocumentType,
  })
  type!: UserDocumentType;

  @Column({
    name: 'file_url',
    type: 'text',
  })
  fileUrl!: string;

  @Column({
    name: 'file_public_id',
    type: 'text',
    nullable: true,
  })
  filePublicId!: string | null;

  @Column({
    name: 'original_name',
    type: 'varchar',
    length: 255,
  })
  originalName!: string;

  @Column({
    name: 'mime_type',
    type: 'varchar',
    length: 100,
  })
  mimeType!: string;

  @ManyToOne(() => User, (user) => user.documents, {
    onDelete: 'CASCADE',
  })
  user!: User;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;
}