import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

import { CreateEquipmentDto } from './dto/create-equipment.dto';

import {
  Equipment,
  EquipmentStatus,
  EquipmentType,
} from './entities/equipment.entity';

@Injectable()
export class EquipmentsService {
  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentsRepository: Repository<Equipment>,

    private readonly auditLogsService: AuditLogsService,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createEquipmentDto: CreateEquipmentDto) {
    const existingEquipment =
      await this.equipmentsRepository.findOne({
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
      type: createEquipmentDto.type,
      code: createEquipmentDto.code,
      name: createEquipmentDto.name,
      description: createEquipmentDto.description || null,
      photoUrl: createEquipmentDto.photoUrl || null,
      photoPublicId: createEquipmentDto.photoPublicId || null,
      notes: createEquipmentDto.notes || null,
      status: EquipmentStatus.AVAILABLE,
      isPublished: false,
    });

    const savedEquipment =
      await this.equipmentsRepository.save(equipment);

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
        type: EquipmentType.BIKE,
        status: EquipmentStatus.AVAILABLE,
        isPublished: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string) {
    const equipment =
      await this.equipmentsRepository.findOne({
        where: { id },
      });

    if (!equipment) {
      throw new NotFoundException(
        'Equipamento não encontrado.',
      );
    }

    return equipment;
  }

  async update(
    id: string,
    updateEquipmentDto: Partial<CreateEquipmentDto>,
  ) {
    const equipment = await this.findOne(id);

    if (
      updateEquipmentDto.code &&
      updateEquipmentDto.code !== equipment.code
    ) {
      const existingEquipment =
        await this.equipmentsRepository.findOne({
          where: {
            code: updateEquipmentDto.code,
          },
        });

      if (
        existingEquipment &&
        existingEquipment.id !== equipment.id
      ) {
        throw new BadRequestException(
          'Já existe outro equipamento com este código.',
        );
      }
    }

    const oldPhotoPublicId = equipment.photoPublicId;

    const isReplacingPhoto =
      updateEquipmentDto.photoPublicId !== undefined &&
      updateEquipmentDto.photoPublicId !==
        equipment.photoPublicId;

    Object.assign(equipment, {
      type:
        updateEquipmentDto.type ??
        equipment.type,

      code:
        updateEquipmentDto.code ??
        equipment.code,

      name:
        updateEquipmentDto.name ??
        equipment.name,

      description:
        updateEquipmentDto.description !== undefined
          ? updateEquipmentDto.description || null
          : equipment.description,

      photoUrl:
        updateEquipmentDto.photoUrl !== undefined
          ? updateEquipmentDto.photoUrl || null
          : equipment.photoUrl,

      photoPublicId:
        updateEquipmentDto.photoPublicId !== undefined
          ? updateEquipmentDto.photoPublicId || null
          : equipment.photoPublicId,

      notes:
        updateEquipmentDto.notes !== undefined
          ? updateEquipmentDto.notes || null
          : equipment.notes,
    });

    const savedEquipment =
      await this.equipmentsRepository.save(equipment);

    if (
      isReplacingPhoto &&
      oldPhotoPublicId &&
      oldPhotoPublicId !== savedEquipment.photoPublicId
    ) {
      await this.cloudinaryService.deleteFile(
        oldPhotoPublicId,
        'image',
      );
    }

    await this.auditLogsService.register({
      action: AuditAction.UPDATE_EQUIPMENT,
      entity: 'equipments',
      entityId: savedEquipment.id,
      description: `Equipamento atualizado: ${savedEquipment.code} — ${savedEquipment.name}`,
    });

    return savedEquipment;
  }

  async updateStatus(
    id: string,
    status: EquipmentStatus,
  ) {
    if (!Object.values(EquipmentStatus).includes(status)) {
      throw new BadRequestException(
        'Status de equipamento inválido.',
      );
    }

    const equipment = await this.findOne(id);

    equipment.status = status;

    const savedEquipment =
      await this.equipmentsRepository.save(equipment);

    await this.auditLogsService.register({
      action: AuditAction.UPDATE_EQUIPMENT,
      entity: 'equipments',
      entityId: savedEquipment.id,
      description: `Status do equipamento atualizado: ${savedEquipment.code} — ${savedEquipment.name} para ${status}`,
    });

    return savedEquipment;
  }

  async publish(id: string) {
    const equipment = await this.findOne(id);

    if (equipment.type !== EquipmentType.BIKE) {
      throw new BadRequestException(
        'Somente bicicletas podem ser publicadas para empréstimo.',
      );
    }

    if (
      equipment.status !==
      EquipmentStatus.AVAILABLE
    ) {
      throw new BadRequestException(
        'Somente bicicletas disponíveis podem ser publicadas.',
      );
    }

    equipment.isPublished = true;

    const savedEquipment =
      await this.equipmentsRepository.save(equipment);

    await this.auditLogsService.register({
      action: AuditAction.UPDATE_EQUIPMENT,
      entity: 'equipments',
      entityId: savedEquipment.id,
      description: `Bicicleta publicada: ${savedEquipment.code} — ${savedEquipment.name}`,
    });

    return {
      message: 'Bicicleta publicada com sucesso.',
      equipment: savedEquipment,
    };
  }

  async unpublish(id: string) {
    const equipment = await this.findOne(id);

    equipment.isPublished = false;

    const savedEquipment =
      await this.equipmentsRepository.save(equipment);

    await this.auditLogsService.register({
      action: AuditAction.UPDATE_EQUIPMENT,
      entity: 'equipments',
      entityId: savedEquipment.id,
      description: `Publicação cancelada: ${savedEquipment.code} — ${savedEquipment.name}`,
    });

    return {
      message: 'Publicação cancelada com sucesso.',
      equipment: savedEquipment,
    };
  }
}