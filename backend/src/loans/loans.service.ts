import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';

import { CreateLoanDto } from './dto/create-loan.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { SignLoanTermDto } from './dto/sign-loan-term.dto';
import { Loan, LoanStatus } from './entities/loan.entity';

import { User, UserStatus } from '../users/entities/user.entity';
import {
  Equipment,
  EquipmentStatus,
} from '../equipments/entities/equipment.entity';

import { Setting } from '../settings/entities/setting.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { OperatingHoursService } from '../operating-hours/operating-hours.service';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Equipment)
    private readonly equipmentsRepository: Repository<Equipment>,

    @InjectRepository(Setting)
    private readonly settingsRepository: Repository<Setting>,

    private readonly auditLogsService: AuditLogsService,

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

  async monitorLoans() {
    const now = new Date();

    const loans = await this.loansRepository.find({
      where: [
        { status: LoanStatus.ACTIVE },
        { status: LoanStatus.LATE },
      ],
    });

    for (const loan of loans) {
      const diffMs =
        loan.expectedReturnDate.getTime() - now.getTime();

      const diffHours = diffMs / (1000 * 60 * 60);

      if (
        loan.status === LoanStatus.ACTIVE &&
        diffHours <= 24 &&
        diffHours > 23
      ) {
        await this.notificationsService.createWarning(
          loan.user.id,
          'Prazo de devolução próximo',
          `A bicicleta ${loan.equipment.code} deverá ser devolvida nas próximas 24 horas.`,
        );
      }

      if (
        loan.status === LoanStatus.ACTIVE &&
        loan.expectedReturnDate < now
      ) {
        loan.status = LoanStatus.LATE;

        await this.loansRepository.save(loan);

        await this.notificationsService.createWarning(
          loan.user.id,
          'Empréstimo atrasado',
          `O prazo de devolução da bicicleta ${loan.equipment.code} expirou.`,
        );
      }

      if (
        loan.status === LoanStatus.LATE &&
        now.getTime() -
          loan.expectedReturnDate.getTime() >
          3 * 24 * 60 * 60 * 1000
      ) {
        loan.user.status = UserStatus.SUSPENDED;

        await this.usersRepository.save(loan.user);

        await this.notificationsService.createWarning(
          loan.user.id,
          'Cadastro suspenso',
          'Seu cadastro foi suspenso devido a atraso superior a 3 dias na devolução da bicicleta.',
        );
      }
    }
  }

  private async updateLateLoans() {
    const now = new Date();

    const activeLoans = await this.loansRepository.find({
      where: {
        status: LoanStatus.ACTIVE,
      },
    });

    const lateLoans = activeLoans.filter(
      (loan) => loan.expectedReturnDate < now,
    );

    for (const loan of lateLoans) {
      loan.status = LoanStatus.LATE;
      await this.loansRepository.save(loan);
    }
  }

  async create(createLoanDto: CreateLoanDto) {
    const user = await this.usersRepository.findOne({
      where: { id: createLoanDto.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (user.status !== UserStatus.APPROVED) {
      throw new BadRequestException(
        'Usuário ainda não está aprovado para realizar empréstimos.',
      );
    }

    const equipment = await this.equipmentsRepository.findOne({
      where: { id: createLoanDto.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException('Equipamento não encontrado.');
    }

    if (equipment.status !== EquipmentStatus.AVAILABLE) {
      throw new BadRequestException('Este equipamento não está disponível.');
    }

    if (!createLoanDto.responsibilityTermAccepted) {
      throw new BadRequestException(
        'É necessário confirmar o termo de responsabilidade.',
      );
    }

    const loanDate = new Date();

    const maxLoanHours = await this.getMaxLoanHours();

    const expectedReturnDate =
      await this.operatingHoursService.calculateValidReturnDate(
        loanDate,
        maxLoanHours,
      );

    const loan = this.loansRepository.create({
      user,
      equipment,
      loanDate,
      expectedReturnDate,
      status: LoanStatus.ACTIVE,
      purpose: createLoanDto.purpose || null,
      notes: createLoanDto.notes || null,
      responsibilityTermAccepted: createLoanDto.responsibilityTermAccepted,
      responsibilityTermAcceptedAt: new Date(),
      responsibilityTermText: createLoanDto.responsibilityTermText || null,
      signatureImage: createLoanDto.signatureImage || null,
    });

    equipment.status = EquipmentStatus.LOANED;

    await this.equipmentsRepository.save(equipment);

    const savedLoan = await this.loansRepository.save(loan);

    await this.auditLogsService.register({
      action: AuditAction.CREATE_LOAN,
      entity: 'loans',
      entityId: savedLoan.id,
      description: `Empréstimo criado: ${equipment.code} — ${equipment.name} para ${user.fullName}. Prazo calculado conforme horário de funcionamento do PEDAL-UFSCar.`,
    });

    await this.notificationsService.createSuccess(
      user.id,
      'Empréstimo criado',
      `O empréstimo da bicicleta ${equipment.code} — ${equipment.name} foi criado. A devolução está prevista para ${expectedReturnDate.toLocaleString('pt-BR')}.`,
    );

    return savedLoan;
  }

  async findAll() {
    await this.updateLateLoans();

    return this.loansRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findActive() {
    await this.updateLateLoans();

    return this.loansRepository.find({
      where: {
        status: LoanStatus.ACTIVE,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findLate() {
    await this.updateLateLoans();

    return this.loansRepository.find({
      where: {
        status: LoanStatus.LATE,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async signTerm(id: string, dto: SignLoanTermDto) {
    const loan = await this.loansRepository.findOne({
      where: { id },
    });

    if (!loan) {
      throw new NotFoundException('Empréstimo não encontrado.');
    }

    if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.LATE) {
      throw new BadRequestException(
        'Não é possível assinar termo de um empréstimo finalizado.',
      );
    }

    if (!dto.responsibilityTermAccepted) {
      throw new BadRequestException(
        'É necessário confirmar o aceite do termo.',
      );
    }

    if (!dto.signatureImage) {
      throw new BadRequestException(
        'É necessário informar a assinatura digital.',
      );
    }

    loan.responsibilityTermAccepted = true;
    loan.responsibilityTermAcceptedAt = new Date();
    loan.responsibilityTermText = dto.responsibilityTermText || null;
    loan.signatureImage = dto.signatureImage;

    const savedLoan = await this.loansRepository.save(loan);

    await this.auditLogsService.register({
      action: AuditAction.RETURN_LOAN,
      entity: 'loans',
      entityId: savedLoan.id,
      description: `Termo de responsabilidade assinado: ${loan.equipment.code} — ${loan.equipment.name} por ${loan.user.fullName}`,
    });

    return savedLoan;
  }

  async returnLoan(id: string, returnLoanDto: ReturnLoanDto) {
    await this.updateLateLoans();

    const loan = await this.loansRepository.findOne({
      where: { id },
    });

    if (!loan) {
      throw new NotFoundException('Empréstimo não encontrado.');
    }

    if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.LATE) {
      throw new BadRequestException('Este empréstimo já foi finalizado.');
    }

    loan.status = LoanStatus.RETURNED;
    loan.returnDate = new Date();
    loan.returnNotes =
      returnLoanDto.returnNotes || 'Bicicleta devolvida em bom estado.';

    loan.equipment.status = EquipmentStatus.AVAILABLE;

    await this.equipmentsRepository.save(
      loan.equipment,
    );

    if (loan.helmet) {
      loan.helmet.status = EquipmentStatus.AVAILABLE;

      await this.equipmentsRepository.save(
        loan.helmet,
      );
    }

    if (loan.lock) {
      loan.lock.status = EquipmentStatus.AVAILABLE;

      await this.equipmentsRepository.save(
        loan.lock,
      );
    }

    const savedLoan = await this.loansRepository.save(loan);

    await this.auditLogsService.register({
      action: AuditAction.RETURN_LOAN,
      entity: 'loans',
      entityId: savedLoan.id,
      description: `Bicicleta devolvida: ${loan.equipment.code} — ${loan.equipment.name} por ${loan.user.fullName}`,
    });

    await this.notificationsService.createSuccess(
      loan.user.id,
      'Devolução registrada',
      `A devolução da bicicleta ${loan.equipment.code} — ${loan.equipment.name} foi registrada com sucesso.`,
    );

    return savedLoan;
  }

  async markAsLost(id: string, returnLoanDto: ReturnLoanDto) {
    await this.updateLateLoans();

    const loan = await this.loansRepository.findOne({
      where: { id },
    });

    if (!loan) {
      throw new NotFoundException('Empréstimo não encontrado.');
    }

    if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.LATE) {
      throw new BadRequestException(
        'Somente empréstimos ativos ou atrasados podem ser marcados como perdidos.',
      );
    }

    loan.status = LoanStatus.LOST;
    loan.returnDate = new Date();
    loan.returnNotes =
      returnLoanDto.returnNotes ||
      'Equipamento registrado como perdido durante o empréstimo.';

    loan.equipment.status = EquipmentStatus.LOST;

    await this.equipmentsRepository.save(
      loan.equipment,
    );

    if (loan.helmet) {
      loan.helmet.status = EquipmentStatus.LOST;

      await this.equipmentsRepository.save(
        loan.helmet,
      );
    }

    if (loan.lock) {
      loan.lock.status = EquipmentStatus.LOST;

      await this.equipmentsRepository.save(
        loan.lock,
      );
    }

    const savedLoan = await this.loansRepository.save(loan);

    await this.auditLogsService.register({
      action: AuditAction.RETURN_LOAN,
      entity: 'loans',
      entityId: savedLoan.id,
      description: `Equipamento perdido: ${loan.equipment.code} — ${loan.equipment.name} por ${loan.user.fullName}`,
    });

    await this.notificationsService.createWarning(
      loan.user.id,
      'Bicicleta registrada como perdida',
      `A bicicleta ${loan.equipment.code} — ${loan.equipment.name} foi registrada como perdida.`,
    );

    return savedLoan;
  }

  async markAsDamaged(id: string, returnLoanDto: ReturnLoanDto) {
    await this.updateLateLoans();

    const loan = await this.loansRepository.findOne({
      where: { id },
    });

    if (!loan) {
      throw new NotFoundException('Empréstimo não encontrado.');
    }

    if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.LATE) {
      throw new BadRequestException(
        'Somente empréstimos ativos ou atrasados podem ser marcados como danificados.',
      );
    }

    loan.status = LoanStatus.RETURNED;
    loan.returnDate = new Date();
    loan.returnNotes =
      returnLoanDto.returnNotes ||
      'Equipamento devolvido com dano registrado.';

    loan.equipment.status = EquipmentStatus.DAMAGED;

    await this.equipmentsRepository.save(
      loan.equipment,
    );

    if (loan.helmet) {
      loan.helmet.status = EquipmentStatus.DAMAGED;

      await this.equipmentsRepository.save(
        loan.helmet,
      );
    }

    if (loan.lock) {
      loan.lock.status = EquipmentStatus.DAMAGED;

      await this.equipmentsRepository.save(
        loan.lock,
      );
    }

    const savedLoan = await this.loansRepository.save(loan);

    await this.auditLogsService.register({
      action: AuditAction.RETURN_LOAN,
      entity: 'loans',
      entityId: savedLoan.id,
      description: `Equipamento danificado: ${loan.equipment.code} — ${loan.equipment.name} por ${loan.user.fullName}`,
    });

    await this.notificationsService.createWarning(
      loan.user.id,
      'Bicicleta devolvida com dano',
      `A bicicleta ${loan.equipment.code} — ${loan.equipment.name} foi registrada como devolvida com dano.`,
    );

    return savedLoan;
  }
}