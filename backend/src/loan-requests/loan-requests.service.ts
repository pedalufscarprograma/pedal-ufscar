import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import {
  LoanRequest,
  LoanRequestStatus,
} from './entities/loan-request.entity';

import { CreateLoanRequestDto } from './dto/create-loan-request.dto';
import { ReviewLoanRequestDto } from './dto/review-loan-request.dto';
import { ConvertLoanRequestDto } from './dto/convert-loan-request.dto';

import { User, UserStatus } from '../users/entities/user.entity';

import {
  Equipment,
  EquipmentStatus,
} from '../equipments/entities/equipment.entity';

import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { Setting } from '../settings/entities/setting.entity';

import { NotificationsService } from '../notifications/notifications.service';
import { OperatingHoursService } from '../operating-hours/operating-hours.service';

@Injectable()
export class LoanRequestsService {
  constructor(
    @InjectRepository(LoanRequest)
    private readonly loanRequestsRepository: Repository<LoanRequest>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Equipment)
    private readonly equipmentsRepository: Repository<Equipment>,

    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,

    @InjectRepository(Setting)
    private readonly settingsRepository: Repository<Setting>,

    private readonly notificationsService: NotificationsService,

    private readonly operatingHoursService: OperatingHoursService,
  ) {}

  private async getMaxLoanHours() {
    const setting = await this.settingsRepository.findOne({
      where: {
        key: 'max_loan_hours',
      },
    });

    return Number(setting?.value || 24);
  }

  private buildPickupExpiredAt(
    pickupDate: string,
    pickupEndTime: string,
  ) {
    const [year, month, day] = pickupDate
      .split('-')
      .map(Number);

    const [hour, minute] = pickupEndTime
      .split(':')
      .map(Number);

    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }

  private buildLocalDateFromDateString(dateText: string) {
    const [year, month, day] = dateText
      .split('-')
      .map(Number);

    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  private formatPickupMessage(
    pickupDate: Date | string | null,
    pickupStartTime: string | null,
    pickupEndTime: string | null,
  ) {
    if (!pickupDate || !pickupStartTime || !pickupEndTime) {
      return 'Horário de retirada não definido.';
    }

    const date =
      typeof pickupDate === 'string'
        ? this.buildLocalDateFromDateString(
            pickupDate.split('T')[0],
          )
        : pickupDate;

    const dateText = date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return `${dateText}, entre ${pickupStartTime} e ${pickupEndTime}`;
  }

  async expireApprovedRequests() {
    const now = new Date();

    const approvedRequests = await this.loanRequestsRepository.find({
      where: {
        status: LoanRequestStatus.APPROVED,
      },
    });

    const expiredRequests = approvedRequests.filter((request) => {
      return (
        request.pickupExpiredAt !== null &&
        request.pickupExpiredAt < now
      );
    });

    for (const request of expiredRequests) {
      request.status = LoanRequestStatus.EXPIRED;
      request.adminNotes =
        request.adminNotes ||
        'Solicitação expirada automaticamente porque o usuário não compareceu no horário de retirada.';

      await this.loanRequestsRepository.save(request);

      await this.notificationsService.createWarning(
        request.user.id,
        'Solicitação expirada',
        `Sua solicitação para a bicicleta ${request.equipment.code} — ${request.equipment.name} expirou porque você não compareceu no horário de retirada definido.`,
      );
    }
  }

  async create(dto: CreateLoanRequestDto) {
    await this.expireApprovedRequests();

    const user = await this.usersRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (user.status !== UserStatus.APPROVED) {
      throw new BadRequestException(
        'Usuário não está aprovado para solicitar empréstimos.',
      );
    }

    if (!user.termsAccepted) {
      throw new BadRequestException(
        'Você precisa aceitar os termos gerais de uso antes de solicitar bicicleta.',
      );
    }

    const activeRequest = await this.loanRequestsRepository.findOne({
      where: {
        user: { id: user.id },
        status: In([
          LoanRequestStatus.PENDING,
          LoanRequestStatus.APPROVED,
        ]),
      },
    });

    if (activeRequest) {
      throw new BadRequestException(
        'Você já possui uma solicitação pendente ou aprovada. Cancele ou aguarde a finalização antes de solicitar outra bicicleta.',
      );
    }

    const activeLoan = await this.loansRepository.findOne({
      where: {
        user: { id: user.id },
        status: In([LoanStatus.ACTIVE, LoanStatus.LATE]),
      },
    });

    if (activeLoan) {
      throw new BadRequestException(
        'Você já possui um empréstimo ativo ou atrasado. Devolva a bicicleta antes de solicitar outra.',
      );
    }

    const equipment = await this.equipmentsRepository.findOne({
      where: { id: dto.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException('Bicicleta não encontrada.');
    }

    if (equipment.status !== EquipmentStatus.AVAILABLE) {
      throw new BadRequestException('Esta bicicleta não está disponível.');
    }

    const request = this.loanRequestsRepository.create({
      user,
      equipment,
      expectedReturnDate: new Date(dto.expectedReturnDate),
      purpose: dto.purpose || null,
      notes: dto.notes || null,
      status: LoanRequestStatus.PENDING,
    });

    const savedRequest = await this.loanRequestsRepository.save(request);

    await this.notificationsService.createInfo(
      user.id,
      'Solicitação enviada',
      `Sua solicitação para a bicicleta ${equipment.code} — ${equipment.name} foi enviada e está aguardando análise.`,
    );

    return savedRequest;
  }

  async findAll() {
    await this.expireApprovedRequests();

    return this.loanRequestsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findPending() {
    await this.expireApprovedRequests();

    return this.loanRequestsRepository.find({
      where: { status: LoanRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    await this.expireApprovedRequests();

    const request = await this.loanRequestsRepository.findOne({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada.');
    }

    return request;
  }

  async review(id: string, dto: ReviewLoanRequestDto) {
    await this.expireApprovedRequests();

    const request = await this.findOne(id);

    if (request.status !== LoanRequestStatus.PENDING) {
      throw new BadRequestException('Esta solicitação já foi analisada.');
    }

    let reviewer: User | null = null;

    if (dto.reviewedById) {
      reviewer = await this.usersRepository.findOne({
        where: { id: dto.reviewedById },
      });
    }

    if (dto.status === LoanRequestStatus.APPROVED) {
      const pickupWindow =
        await this.operatingHoursService.getNextAvailablePickupWindow(
          new Date(),
        );

      const pickupExpiredAt = this.buildPickupExpiredAt(
        pickupWindow.pickupDate,
        pickupWindow.pickupEndTime,
      );

      request.status = LoanRequestStatus.APPROVED;
      request.reviewedBy = reviewer;
      request.reviewedAt = new Date();
      request.pickupDate = this.buildLocalDateFromDateString(
        pickupWindow.pickupDate,
      );
      request.pickupStartTime = pickupWindow.pickupStartTime;
      request.pickupEndTime = pickupWindow.pickupEndTime;
      request.pickupExpiredAt = pickupExpiredAt;
      request.adminNotes =
        dto.adminNotes ||
        'Solicitação aprovada. Aguardando retirada dentro do horário de funcionamento.';

      const savedRequest = await this.loanRequestsRepository.save(request);

      const pickupText = this.formatPickupMessage(
        request.pickupDate,
        request.pickupStartTime,
        request.pickupEndTime,
      );

      await this.notificationsService.createSuccess(
        request.user.id,
        'Solicitação aprovada',
        `Sua solicitação para a bicicleta ${request.equipment.code} — ${request.equipment.name} foi aprovada. Você pode retirar a bicicleta em ${pickupText}.`,
      );

      return savedRequest;
    }

    request.status = LoanRequestStatus.REJECTED;
    request.reviewedBy = reviewer;
    request.reviewedAt = new Date();
    request.adminNotes = dto.adminNotes || null;

    const savedRequest = await this.loanRequestsRepository.save(request);

    await this.notificationsService.createWarning(
      request.user.id,
      'Solicitação rejeitada',
      request.adminNotes ||
        `Sua solicitação para a bicicleta ${request.equipment.code} — ${request.equipment.name} foi rejeitada.`,
    );

    return savedRequest;
  }

  async convertToLoan(id: string, dto: ConvertLoanRequestDto) {
    await this.expireApprovedRequests();

    const request = await this.findOne(id);

    if (request.status !== LoanRequestStatus.APPROVED) {
      throw new BadRequestException(
        'Somente solicitações aprovadas podem ser convertidas em empréstimo.',
      );
    }

    if (
      request.pickupExpiredAt &&
      request.pickupExpiredAt < new Date()
    ) {
      request.status = LoanRequestStatus.EXPIRED;
      await this.loanRequestsRepository.save(request);

      throw new BadRequestException(
        'O prazo de retirada desta solicitação expirou.',
      );
    }

    if (!dto.responsibilityTermAccepted) {
      throw new BadRequestException(
        'É necessário confirmar o aceite do termo de responsabilidade.',
      );
    }

    if (!dto.signatureImage) {
      throw new BadRequestException(
        'É necessário informar a assinatura digital.',
      );
    }

    const activeLoan = await this.loansRepository.findOne({
      where: {
        user: { id: request.user.id },
        status: In([LoanStatus.ACTIVE, LoanStatus.LATE]),
      },
    });

    if (activeLoan) {
      throw new BadRequestException(
        'Este usuário já possui empréstimo ativo ou atrasado.',
      );
    }

    const equipment = await this.equipmentsRepository.findOne({
      where: { id: request.equipment.id },
    });

    if (!equipment) {
      throw new NotFoundException('Bicicleta não encontrada.');
    }

    if (equipment.status !== EquipmentStatus.AVAILABLE) {
      throw new BadRequestException(
        'Esta bicicleta não está mais disponível.',
      );
    }

    let helmet: Equipment | null = null;
    let lock: Equipment | null = null;

    if (dto.helmetId) {
      helmet = await this.equipmentsRepository.findOne({
        where: { id: dto.helmetId },
      });

      if (!helmet) {
        throw new NotFoundException('Capacete não encontrado.');
      }

      if (helmet.status !== EquipmentStatus.AVAILABLE) {
        throw new BadRequestException('Capacete não disponível.');
      }
    }

    if (dto.lockId) {
      lock = await this.equipmentsRepository.findOne({
        where: { id: dto.lockId },
      });

      if (!lock) {
        throw new NotFoundException('Trava não encontrada.');
      }

      if (lock.status !== EquipmentStatus.AVAILABLE) {
        throw new BadRequestException('Trava não disponível.');
      }
    }

    const loanDate = new Date();
    const maxLoanHours = await this.getMaxLoanHours();

    const expectedReturnDate =
      await this.operatingHoursService.calculateValidReturnDate(
        loanDate,
        maxLoanHours,
      );

    const loan = this.loansRepository.create({
      user: request.user,
      equipment,
      helmet,
      lock,
      loanDate,
      expectedReturnDate,
      status: LoanStatus.ACTIVE,
      purpose: request.purpose,
      notes: request.notes,
      responsibilityTermAccepted: true,
      responsibilityTermAcceptedAt: new Date(),
      responsibilityTermText: dto.responsibilityTermText || null,
      signatureImage: dto.signatureImage,
    });

    equipment.status = EquipmentStatus.LOANED;

    if (helmet) {
      helmet.status = EquipmentStatus.LOANED;
      await this.equipmentsRepository.save(helmet);
    }

    if (lock) {
      lock.status = EquipmentStatus.LOANED;
      await this.equipmentsRepository.save(lock);
    }

    await this.equipmentsRepository.save(equipment);
    await this.loansRepository.save(loan);

    request.status = LoanRequestStatus.CONVERTED_TO_LOAN;
    request.adminNotes =
      request.adminNotes ||
      `Solicitação convertida em empréstimo após assinatura do termo. Prazo calculado conforme horário de funcionamento do PEDAL-UFSCar.`;

    const savedRequest = await this.loanRequestsRepository.save(request);

    const accessoriesText = [
      helmet ? `Capacete: ${helmet.code} — ${helmet.name}` : null,
      lock ? `Trava: ${lock.code} — ${lock.name}` : null,
    ]
      .filter(Boolean)
      .join('. ');

    await this.notificationsService.createSuccess(
      request.user.id,
      'Bicicleta retirada',
      `A bicicleta ${equipment.code} — ${equipment.name} foi retirada e o empréstimo está ativo. ${
        accessoriesText ? accessoriesText + '. ' : ''
      }A devolução está prevista para ${expectedReturnDate.toLocaleString('pt-BR')}, respeitando o horário de funcionamento do PEDAL-UFSCar.`,
    );

    return savedRequest;
  }

  async cancel(id: string) {
    await this.expireApprovedRequests();

    const request = await this.findOne(id);

    if (
      request.status !== LoanRequestStatus.PENDING &&
      request.status !== LoanRequestStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Somente solicitações pendentes ou aprovadas podem ser canceladas.',
      );
    }

    request.status = LoanRequestStatus.CANCELLED;

    const savedRequest = await this.loanRequestsRepository.save(request);

    await this.notificationsService.createWarning(
      request.user.id,
      'Solicitação cancelada',
      `Sua solicitação para a bicicleta ${request.equipment.code} — ${request.equipment.name} foi cancelada.`,
    );

    return savedRequest;
  }
}