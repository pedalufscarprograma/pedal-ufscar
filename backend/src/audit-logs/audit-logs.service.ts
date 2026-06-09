import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditAction, AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async register(data: {
    userId?: string | null;
    userName?: string | null;
    action: AuditAction;
    entity: string;
    entityId?: string | null;
    description: string;
  }) {
    const log = this.auditRepository.create({
      userId: data.userId ?? null,
      userName: data.userName ?? null,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId ?? null,
      description: data.description,
    });

    return this.auditRepository.save(log);
  }

  async findAll() {
    return this.auditRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }
}