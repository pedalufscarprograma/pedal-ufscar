import { IsEnum, IsOptional, IsString } from 'class-validator';

import { AuditAction } from '../entities/audit-log.entity';

export class CreateAuditLogDto {
  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsOptional()
  @IsString()
  userName?: string | null;

  @IsEnum(AuditAction)
  action!: AuditAction;

  @IsString()
  entity!: string;

  @IsOptional()
  @IsString()
  entityId?: string | null;

  @IsString()
  description!: string;
}