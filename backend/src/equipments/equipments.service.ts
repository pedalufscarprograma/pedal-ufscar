import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';

import { CreateEquipmentDto } from './dto/create-equipment.dto';
import {
  Equipment,
  EquipmentStatus,
} from './entities/equipment.entity';

@Injectable()
export class EquipmentsService {
  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentsRepository: Repository<Equipment>,

    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(createEquipmentDto: CreateEquipmentDto) {
    const existingEquipment = await this.equipmentsRepository.findOne({
      where: {
        code: createEquipmentDto.code,
      },
    });

    if (existingEquipment) {
      throw new BadRequestException(
        'Já existe um equipamento com este código.',
      );
    }

    const equipment = this.equipmentsRepository.create({
      ...createEquipmentDto,
      status: EquipmentStatus.AVAILABLE,
    });

    const savedEquipment = await this.equipmentsRepository.save(equipment);

    await this.auditLogsService.register({
      action: AuditAction.CREATE_EQUIPMENT,
      entity: 'equipments',
      entityId: savedEquipment.id,
      description: `Equipamento cadastrado: ${savedEquipment.code} — ${savedEquipment.name}`,
    });

    return savedEquipment;
  }

  async findAll() {
    return this.equipmentsRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findAvailable() {
    return this.equipmentsRepository.find({
      where: {
        status: EquipmentStatus.AVAILABLE,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string) {
    const equipment = await this.equipmentsRepository.findOne({
      where: { id },
    });

    if (!equipment) {
      throw new NotFoundException('Equipamento não encontrado.');
    }

    return equipment;
  }

  async update(id: string, updateEquipmentDto: Partial<CreateEquipmentDto>) {
    const equipment = await this.findOne(id);

    if (
      updateEquipmentDto.code &&
      updateEquipmentDto.code !== equipment.code
    ) {
      const existingEquipment = await this.equipmentsRepository.findOne({
        where: {
          code: updateEquipmentDto.code,
        },
      });

      if (existingEquipment) {
        throw new BadRequestException(
          'Já existe outro equipamento com este código.',
        );
      }
    }

    Object.assign(equipment, {
      type: updateEquipmentDto.type ?? equipment.type,
      code: updateEquipmentDto.code ?? equipment.code,
      name: updateEquipmentDto.name ?? equipment.name,
      description:
        updateEquipmentDto.description !== undefined
          ? updateEquipmentDto.description || null
          : equipment.description,
      photoUrl:
        updateEquipmentDto.photoUrl !== undefined
          ? updateEquipmentDto.photoUrl || null
          : equipment.photoUrl,
      notes:
        updateEquipmentDto.notes !== undefined
          ? updateEquipmentDto.notes || null
          : equipment.notes,
    });

    const savedEquipment = await this.equipmentsRepository.save(equipment);

    await this.auditLogsService.register({
      action: AuditAction.UPDATE_EQUIPMENT,
      entity: 'equipments',
      entityId: savedEquipment.id,
      description: `Equipamento atualizado: ${savedEquipment.code} — ${savedEquipment.name}`,
    });

    return savedEquipment;
  }

  async updateStatus(id: string, status: EquipmentStatus) {
    const equipment = await this.findOne(id);

    equipment.status = status;

    const savedEquipment = await this.equipmentsRepository.save(equipment);

    await this.auditLogsService.register({
      action: AuditAction.UPDATE_EQUIPMENT,
      entity: 'equipments',
      entityId: savedEquipment.id,
      description: `Status do equipamento atualizado: ${savedEquipment.code} — ${savedEquipment.name} para ${status}`,
    });

    return savedEquipment;
  }
}