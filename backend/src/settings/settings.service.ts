import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Setting } from './entities/setting.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingsRepository: Repository<Setting>,
  ) {}

  private readonly defaultSettings = [
    {
      key: 'system_name',
      label: 'Nome do sistema',
      value: 'PEDAL-UFSCar',
      type: 'text',
    },
    {
      key: 'institution_name',
      label: 'Instituição',
      value: 'Universidade Federal de São Carlos',
      type: 'text',
    },
    {
      key: 'support_email',
      label: 'E-mail de suporte',
      value: 'suporte@pedal-ufscar.com',
      type: 'text',
    },
    {
      key: 'support_phone',
      label: 'Telefone de suporte',
      value: '',
      type: 'text',
    },
    {
      key: 'max_loan_hours',
      label: 'Tempo máximo de empréstimo em horas',
      value: '24',
      type: 'number',
    },
    {
      key: 'default_return_message',
      label: 'Mensagem padrão de devolução',
      value: 'Bicicleta devolvida em bom estado.',
      type: 'text',
    },
    {
      key: 'responsibility_term',
      label: 'Termo de responsabilidade',
      value:
        'Declaro que recebi o equipamento em boas condições e me comprometo a devolvê-lo no prazo previsto.',
      type: 'textarea',
    },
  ];

  async ensureDefaults() {
    for (const item of this.defaultSettings) {
      const exists = await this.settingsRepository.findOne({
        where: { key: item.key },
      });

      if (!exists) {
        const setting = this.settingsRepository.create(item);
        await this.settingsRepository.save(setting);
      }
    }
  }

  async findAll() {
    await this.ensureDefaults();

    return this.settingsRepository.find({
      order: {
        label: 'ASC',
      },
    });
  }

  async findByKey(key: string) {
    await this.ensureDefaults();

    const setting = await this.settingsRepository.findOne({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException('Configuração não encontrada.');
    }

    return setting;
  }

  async update(key: string, dto: UpdateSettingDto) {
    const setting = await this.findByKey(key);

    setting.value = dto.value;

    return this.settingsRepository.save(setting);
  }
}