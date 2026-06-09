import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  OperatingHour,
  WeekDay,
} from './entities/operating-hour.entity';

import { UpdateOperatingHoursDto } from './dto/update-operating-hours.dto';

@Injectable()
export class OperatingHoursService {
  constructor(
    @InjectRepository(OperatingHour)
    private readonly operatingHoursRepository: Repository<OperatingHour>,
  ) {}

  private getDefaultHours() {
    return [
      {
        dayOfWeek: WeekDay.SUNDAY,
        isOpen: false,
        openTime: null,
        closeTime: null,
      },
      {
        dayOfWeek: WeekDay.MONDAY,
        isOpen: true,
        openTime: '08:00',
        closeTime: '18:00',
      },
      {
        dayOfWeek: WeekDay.TUESDAY,
        isOpen: true,
        openTime: '08:00',
        closeTime: '18:00',
      },
      {
        dayOfWeek: WeekDay.WEDNESDAY,
        isOpen: true,
        openTime: '08:00',
        closeTime: '18:00',
      },
      {
        dayOfWeek: WeekDay.THURSDAY,
        isOpen: true,
        openTime: '08:00',
        closeTime: '18:00',
      },
      {
        dayOfWeek: WeekDay.FRIDAY,
        isOpen: true,
        openTime: '08:00',
        closeTime: '18:00',
      },
      {
        dayOfWeek: WeekDay.SATURDAY,
        isOpen: false,
        openTime: null,
        closeTime: null,
      },
    ];
  }

  private async ensureDefaultHours() {
    const count = await this.operatingHoursRepository.count();

    if (count > 0) {
      return;
    }

    const defaultHours = this.getDefaultHours();

    const records = this.operatingHoursRepository.create(defaultHours);

    await this.operatingHoursRepository.save(records);
  }

  private buildLocalDateTime(
    date: Date,
    time: string,
  ) {
    const [hour, minute] = time.split(':').map(Number);

    const localDate = new Date(date);

    localDate.setHours(hour, minute, 0, 0);

    return localDate;
  }

  async findAll() {
    await this.ensureDefaultHours();

    return this.operatingHoursRepository.find({
      order: {
        dayOfWeek: 'ASC',
      },
    });
  }

  async updateAll(dto: UpdateOperatingHoursDto) {
    if (!dto.hours || !Array.isArray(dto.hours)) {
      throw new BadRequestException(
        'Lista de horários inválida.',
      );
    }

    await this.ensureDefaultHours();

    for (const item of dto.hours) {
      if (item.dayOfWeek < 0 || item.dayOfWeek > 6) {
        throw new BadRequestException(
          'Dia da semana inválido.',
        );
      }

      if (item.isOpen) {
        if (!item.openTime || !item.closeTime) {
          throw new BadRequestException(
            'Informe horário de abertura e fechamento para dias abertos.',
          );
        }

        if (item.openTime >= item.closeTime) {
          throw new BadRequestException(
            'O horário de abertura deve ser menor que o horário de fechamento.',
          );
        }
      }

      let operatingHour =
        await this.operatingHoursRepository.findOne({
          where: {
            dayOfWeek: item.dayOfWeek,
          },
        });

      if (!operatingHour) {
        operatingHour = this.operatingHoursRepository.create({
          dayOfWeek: item.dayOfWeek,
        });
      }

      operatingHour.isOpen = item.isOpen;
      operatingHour.openTime = item.isOpen
        ? item.openTime || null
        : null;
      operatingHour.closeTime = item.isOpen
        ? item.closeTime || null
        : null;

      await this.operatingHoursRepository.save(operatingHour);
    }

    return this.findAll();
  }

  async getNextAvailablePickupWindow(fromDate = new Date()) {
    await this.ensureDefaultHours();

    const hours = await this.findAll();

    for (let offset = 0; offset < 30; offset++) {
      const date = new Date(fromDate);
      date.setDate(fromDate.getDate() + offset);

      const dayOfWeek = date.getDay();

      const operatingHour = hours.find(
        (hour) => Number(hour.dayOfWeek) === dayOfWeek,
      );

      if (
        !operatingHour ||
        operatingHour.isOpen !== true ||
        !operatingHour.openTime ||
        !operatingHour.closeTime
      ) {
        continue;
      }

      const openDateTime = this.buildLocalDateTime(
        date,
        operatingHour.openTime,
      );

      const closeDateTime = this.buildLocalDateTime(
        date,
        operatingHour.closeTime,
      );

      if (offset === 0 && fromDate > closeDateTime) {
        continue;
      }

      return {
        pickupDate: `${date.getFullYear()}-${String(
          date.getMonth() + 1,
        ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        pickupStartTime:
          offset === 0 && fromDate >= openDateTime
            ? `${String(fromDate.getHours()).padStart(2, '0')}:${String(
                fromDate.getMinutes(),
              ).padStart(2, '0')}`
            : operatingHour.openTime,
        pickupEndTime: operatingHour.closeTime,
        dayOfWeek,
      };
    }

    throw new BadRequestException(
      'Nenhum horário de funcionamento disponível foi encontrado.',
    );
  }

  async calculateValidReturnDate(
    loanDate: Date,
    maxLoanHours: number,
  ) {
    await this.ensureDefaultHours();

    const hours = await this.findAll();

    const calculatedDate = new Date(loanDate);
    calculatedDate.setHours(
      calculatedDate.getHours() + maxLoanHours,
    );

    for (let offset = 0; offset < 30; offset++) {
      const date = new Date(calculatedDate);

      date.setDate(date.getDate() + offset);

      const dayOfWeek = date.getDay();

      const operatingHour = hours.find(
        (hour) => hour.dayOfWeek === dayOfWeek,
      );

      if (
        !operatingHour ||
        !operatingHour.isOpen ||
        !operatingHour.openTime ||
        !operatingHour.closeTime
      ) {
        continue;
      }

      const openDateTime = this.buildLocalDateTime(
        date,
        operatingHour.openTime,
      );

      const closeDateTime = this.buildLocalDateTime(
        date,
        operatingHour.closeTime,
      );

      if (date >= openDateTime && date <= closeDateTime) {
        return date;
      }

      if (date < openDateTime) {
        return openDateTime;
      }

      if (date > closeDateTime) {
        continue;
      }
    }

    throw new BadRequestException(
      'Não foi possível calcular uma data de devolução dentro do horário de funcionamento.',
    );
  }
}