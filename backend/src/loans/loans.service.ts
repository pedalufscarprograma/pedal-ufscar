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

import {
  LoanRenewal,
  LoanRenewalStatus,
} from './entities/loan-renewal.entity';

import { User, UserStatus } from '../users/entities/user.entity';

import {
  Equipment,
  EquipmentStatus,
} from '../equipments/entities/equipment.entity';

import { Setting } from '../settings/entities/setting.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { OperatingHoursService } from '../operating-hours/operating-hours.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,

    @InjectRepository(LoanRenewal)
    private readonly loanRenewalsRepository: Repository<LoanRenewal>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Equipment)
    private readonly equipmentsRepository: Repository<Equipment>,

    @InjectRepository(Setting)
    private readonly settingsRepository: Repository<Setting>,

    private readonly auditLogsService: AuditLogsService,

    private readonly notificationsService: NotificationsService,

    private readonly operatingHoursService: OperatingHoursService,

    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private async getMaxLoanHours() {
    const setting = await this.settingsRepository.findOne({
      where: {
        key: 'max_loan_hours',
      },
    });

    return Number(setting?.value || 24);
  }

  private notifyAdminsAboutUserRequest(payload?: any) {
    this.realtimeGateway.emitToAdmins(
      'loan-renewals.updated',
      payload || {},
    );

    this.realtimeGateway.emitToAdmins(
      'admin.notification.sound',
      payload || {
        type: 'renewal_requested',
        title: 'Nova solicitação de renovação',
      },
    );
  }

  private notifyUserAboutAdminDecision(
    userId: string,
    payload?: any,
  ) {
    this.realtimeGateway.emitToUser(
      userId,
      'user.notification.sound',
      payload || {},
    );
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

        this.notifyUserAboutAdminDecision(loan.user.id, {
          type: 'loan_late',
          title: 'Empréstimo atrasado',
        });
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

        this.notifyUserAboutAdminDecision(loan.user.id, {
          type: 'user_suspended_late_loan',
          title: 'Cadastro suspenso por atraso',
        });
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

    if (
      loan.status !== LoanStatus.ACTIVE &&
      loan.status !== LoanStatus.LATE
    ) {
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
    loan.responsibilityTermText =
      dto.responsibilityTermText || null;
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

    if (
      loan.status !== LoanStatus.ACTIVE &&
      loan.status !== LoanStatus.LATE
    ) {
      throw new BadRequestException(
        'Este empréstimo já foi finalizado.',
      );
    }

    loan.status = LoanStatus.RETURNED;
    loan.returnDate = new Date();
    loan.returnNotes =
      returnLoanDto.returnNotes ||
      'Bicicleta devolvida em bom estado.';

    loan.equipment.status = EquipmentStatus.AVAILABLE;

    await this.equipmentsRepository.save(loan.equipment);

    if (loan.helmet) {
      loan.helmet.status = EquipmentStatus.AVAILABLE;
      await this.equipmentsRepository.save(loan.helmet);
    }

    if (loan.lock) {
      loan.lock.status = EquipmentStatus.AVAILABLE;
      await this.equipmentsRepository.save(loan.lock);
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

    if (
      loan.status !== LoanStatus.ACTIVE &&
      loan.status !== LoanStatus.LATE
    ) {
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

    await this.equipmentsRepository.save(loan.equipment);

    if (loan.helmet) {
      loan.helmet.status = EquipmentStatus.LOST;
      await this.equipmentsRepository.save(loan.helmet);
    }

    if (loan.lock) {
      loan.lock.status = EquipmentStatus.LOST;
      await this.equipmentsRepository.save(loan.lock);
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

    if (
      loan.status !== LoanStatus.ACTIVE &&
      loan.status !== LoanStatus.LATE
    ) {
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

    await this.equipmentsRepository.save(loan.equipment);

    if (loan.helmet) {
      loan.helmet.status = EquipmentStatus.DAMAGED;
      await this.equipmentsRepository.save(loan.helmet);
    }

    if (loan.lock) {
      loan.lock.status = EquipmentStatus.DAMAGED;
      await this.equipmentsRepository.save(loan.lock);
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

  async requestRenewal(
    loanId: string,
    userId: string,
    requestReason?: string,
  ) {
    await this.updateLateLoans();

    const loan = await this.loansRepository.findOne({
      where: { id: loanId },
    });

    if (!loan) {
      throw new NotFoundException('Empréstimo não encontrado.');
    }

    if (loan.user.id !== userId) {
      throw new BadRequestException(
        'Você só pode solicitar renovação do seu próprio empréstimo.',
      );
    }

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new BadRequestException(
        'Somente empréstimos ativos podem ser renovados.',
      );
    }

    const existingPending =
      await this.loanRenewalsRepository.findOne({
        where: {
          loan: { id: loan.id },
          status: LoanRenewalStatus.PENDING,
        },
      });

    if (existingPending) {
      throw new BadRequestException(
        'Já existe uma solicitação de renovação pendente para este empréstimo.',
      );
    }

    const maxLoanHours = await this.getMaxLoanHours();

    const calculatedReturnDate =
      await this.operatingHoursService.calculateValidReturnDate(
        loan.expectedReturnDate,
        maxLoanHours,
      );

    const renewal = this.loanRenewalsRepository.create({
      loan,
      requestedBy: loan.user,
      reviewedBy: null,
      oldExpectedReturnDate: loan.expectedReturnDate,
      requestedReturnDate: calculatedReturnDate,
      approvedReturnDate: null,
      status: LoanRenewalStatus.PENDING,
      requestReason: requestReason || null,
      reviewNotes: null,
      reviewedAt: null,
    });

    const savedRenewal =
      await this.loanRenewalsRepository.save(renewal);

    await this.notificationsService.createSuccess(
      loan.user.id,
      'Solicitação de renovação enviada',
      `Sua solicitação de renovação da bicicleta ${loan.equipment.code} foi enviada para análise. Se aprovada, a nova devolução prevista será ${calculatedReturnDate.toLocaleString('pt-BR')}.`,
    );

    this.notifyAdminsAboutUserRequest({
      type: 'renewal_requested',
      title: 'Nova solicitação de renovação',
      renewalId: savedRenewal.id,
      loanId: loan.id,
      userId: loan.user.id,
    });

    return savedRenewal;
  }

  async findRenewalRequests() {
    return this.loanRenewalsRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findPendingRenewalRequests() {
    return this.loanRenewalsRepository.find({
      where: {
        status: LoanRenewalStatus.PENDING,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findRenewalsByLoan(loanId: string) {
    const loan = await this.loansRepository.findOne({
      where: { id: loanId },
    });

    if (!loan) {
      throw new NotFoundException('Empréstimo não encontrado.');
    }

    return this.loanRenewalsRepository.find({
      where: {
        loan: { id: loan.id },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async approveRenewal(
    renewalId: string,
    reviewerId: string,
    _approvedReturnDate?: string,
    reviewNotes?: string,
  ) {
    const renewal = await this.loanRenewalsRepository.findOne({
      where: { id: renewalId },
    });

    if (!renewal) {
      throw new NotFoundException(
        'Solicitação de renovação não encontrada.',
      );
    }

    if (renewal.status !== LoanRenewalStatus.PENDING) {
      throw new BadRequestException(
        'Esta solicitação de renovação já foi analisada.',
      );
    }

    const reviewer = await this.usersRepository.findOne({
      where: { id: reviewerId },
    });

    if (!reviewer) {
      throw new NotFoundException(
        'Usuário avaliador não encontrado.',
      );
    }

    const loan = await this.loansRepository.findOne({
      where: { id: renewal.loan.id },
    });

    if (!loan) {
      throw new NotFoundException('Empréstimo não encontrado.');
    }

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new BadRequestException(
        'Somente empréstimos ativos podem ter renovação aprovada.',
      );
    }

    const maxLoanHours = await this.getMaxLoanHours();

    const finalReturnDate =
      await this.operatingHoursService.calculateValidReturnDate(
        loan.expectedReturnDate,
        maxLoanHours,
      );

    if (finalReturnDate <= loan.expectedReturnDate) {
      throw new BadRequestException(
        'Não foi possível calcular uma nova data posterior à data atual de devolução.',
      );
    }

    renewal.status = LoanRenewalStatus.APPROVED;
    renewal.reviewedBy = reviewer;
    renewal.approvedReturnDate = finalReturnDate;
    renewal.requestedReturnDate = finalReturnDate;
    renewal.reviewNotes =
      reviewNotes ||
      'Renovação aprovada. Nova data calculada automaticamente pelo sistema.';
    renewal.reviewedAt = new Date();

    loan.expectedReturnDate = finalReturnDate;

    await this.loansRepository.save(loan);

    const savedRenewal =
      await this.loanRenewalsRepository.save(renewal);

    await this.notificationsService.createSuccess(
      loan.user.id,
      'Renovação aprovada',
      `Sua renovação foi aprovada. A nova data de devolução da bicicleta ${loan.equipment.code} é ${finalReturnDate.toLocaleString('pt-BR')}.`,
    );

    this.realtimeGateway.emitToAdmins('loan-renewals.updated', {
      type: 'renewal_approved',
      renewalId: savedRenewal.id,
      loanId: loan.id,
      userId: loan.user.id,
    });

    this.notifyUserAboutAdminDecision(loan.user.id, {
      type: 'renewal_approved',
      title: 'Renovação aprovada',
    });

    return savedRenewal;
  }

  async rejectRenewal(
    renewalId: string,
    reviewerId: string,
    reviewNotes?: string,
  ) {
    const renewal = await this.loanRenewalsRepository.findOne({
      where: { id: renewalId },
    });

    if (!renewal) {
      throw new NotFoundException(
        'Solicitação de renovação não encontrada.',
      );
    }

    if (renewal.status !== LoanRenewalStatus.PENDING) {
      throw new BadRequestException(
        'Esta solicitação de renovação já foi analisada.',
      );
    }

    const reviewer = await this.usersRepository.findOne({
      where: { id: reviewerId },
    });

    if (!reviewer) {
      throw new NotFoundException(
        'Usuário avaliador não encontrado.',
      );
    }

    renewal.status = LoanRenewalStatus.REJECTED;
    renewal.reviewedBy = reviewer;
    renewal.reviewNotes = reviewNotes || null;
    renewal.reviewedAt = new Date();

    const savedRenewal =
      await this.loanRenewalsRepository.save(renewal);

    await this.notificationsService.createWarning(
      renewal.requestedBy.id,
      'Renovação recusada',
      'Sua solicitação de renovação foi recusada. A devolução deve ocorrer na data originalmente prevista.',
    );

    this.realtimeGateway.emitToAdmins('loan-renewals.updated', {
      type: 'renewal_rejected',
      renewalId: savedRenewal.id,
      userId: renewal.requestedBy.id,
    });

    this.notifyUserAboutAdminDecision(
      renewal.requestedBy.id,
      {
        type: 'renewal_rejected',
        title: 'Renovação recusada',
      },
    );

    return savedRenewal;
  }
}