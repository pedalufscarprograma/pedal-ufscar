import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';

import {
  Equipment,
  EquipmentStatus,
} from '../equipments/entities/equipment.entity';
import { User } from '../users/entities/user.entity';

import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { FinishMaintenanceDto } from './dto/finish-maintenance.dto';
import {
  MaintenanceRecord,
  MaintenanceStatus,
} from './entities/maintenance-record.entity';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceRecord)
    private readonly maintenanceRepository: Repository<MaintenanceRecord>,

    @InjectRepository(Equipment)
    private readonly equipmentsRepository: Repository<Equipment>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateMaintenanceDto) {
    const equipment = await this.equipmentsRepository.findOne({
      where: { id: dto.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException('Equipamento não encontrado.');
    }

    if (equipment.status === EquipmentStatus.LOANED) {
      throw new BadRequestException(
        'Não é possível colocar em manutenção um equipamento emprestado.',
      );
    }

    let reportedBy: User | null = null;

    if (dto.reportedById) {
      reportedBy = await this.usersRepository.findOne({
        where: { id: dto.reportedById },
      });
    }

    const record = this.maintenanceRepository.create({
      equipment,
      reportedBy,
      problemDescription: dto.problemDescription,
      status: MaintenanceStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    equipment.status = EquipmentStatus.MAINTENANCE;

    await this.equipmentsRepository.save(equipment);

    const savedRecord = await this.maintenanceRepository.save(record);

    await this.auditLogsService.register({
      action: AuditAction.CREATE_MAINTENANCE,
      entity: 'maintenance',
      entityId: savedRecord.id,
      description: `Manutenção iniciada: ${equipment.code} — ${equipment.name}. Problema: ${dto.problemDescription}`,
    });

    return savedRecord;
  }

  async findAll() {
    return this.maintenanceRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findActive() {
    return this.maintenanceRepository.find({
      where: {
        status: MaintenanceStatus.IN_PROGRESS,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async finish(id: string, dto: FinishMaintenanceDto) {
    const record = await this.maintenanceRepository.findOne({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Registro de manutenção não encontrado.');
    }

    if (record.status !== MaintenanceStatus.IN_PROGRESS) {
      throw new BadRequestException('Esta manutenção já foi finalizada.');
    }

    let mechanic: User | null = null;

    if (dto.mechanicId) {
      mechanic = await this.usersRepository.findOne({
        where: { id: dto.mechanicId },
      });
    }

    record.mechanic = mechanic;
    record.solutionDescription = dto.solutionDescription;
    record.status = MaintenanceStatus.FINISHED;
    record.finishedAt = new Date();

    record.equipment.status = EquipmentStatus.AVAILABLE;

    await this.equipmentsRepository.save(record.equipment);

    const savedRecord = await this.maintenanceRepository.save(record);

    await this.auditLogsService.register({
      action: AuditAction.FINISH_MAINTENANCE,
      entity: 'maintenance',
      entityId: savedRecord.id,
      description: `Manutenção finalizada: ${record.equipment.code} — ${record.equipment.name}. Solução: ${dto.solutionDescription}`,
    });

    return savedRecord;
  }
}