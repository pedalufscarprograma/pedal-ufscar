import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { User } from '../users/entities/user.entity';
import {
  Equipment,
  EquipmentStatus,
} from '../equipments/entities/equipment.entity';

import { NotificationsService } from '../notifications/notifications.service';

import { CreateLostReportDto } from './dto/create-lost-report.dto';
import {
  LostReport,
  LostReportStatus,
} from './entities/lost-report.entity';

@Injectable()
export class LostReportsService {
  constructor(
    @InjectRepository(LostReport)
    private readonly lostReportsRepository: Repository<LostReport>,

    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Equipment)
    private readonly equipmentsRepository: Repository<Equipment>,

    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateLostReportDto) {
    const loan = await this.loansRepository.findOne({
      where: { id: dto.loanId },
    });

    if (!loan) {
      throw new NotFoundException('Empréstimo não encontrado.');
    }

    const user = await this.usersRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (loan.user.id !== user.id) {
      throw new BadRequestException(
        'Este empréstimo não pertence ao usuário informado.',
      );
    }

    if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.LATE) {
      throw new BadRequestException(
        'Só é possível registrar ocorrência para empréstimos ativos ou atrasados.',
      );
    }

    const report = this.lostReportsRepository.create({
      loan,
      user,
      type: dto.type,
      description: dto.description,
      occurrenceDocumentUrl: dto.occurrenceDocumentUrl || null,
      status: LostReportStatus.PENDING,
      adminNotes: null,
    });

    const savedReport = await this.lostReportsRepository.save(report);

    loan.status = LoanStatus.LOST;
    loan.returnDate = new Date();
    loan.returnNotes =
      'Ocorrência de roubo/furto/perda registrada pelo usuário. Aguardando análise administrativa.';

    loan.equipment.status = EquipmentStatus.LOST;

    await this.equipmentsRepository.save(loan.equipment);
    await this.loansRepository.save(loan);

    await this.notificationsService.createWarning(
      user.id,
      'Ocorrência registrada',
      `Sua ocorrência referente à bicicleta ${loan.equipment.code} — ${loan.equipment.name} foi registrada e será analisada pela equipe responsável.`,
    );

    return savedReport;
  }

  async findAll() {
    return this.lostReportsRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findByUser(userId: string) {
    return this.lostReportsRepository.find({
      where: {
        user: {
          id: userId,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string) {
    const report = await this.lostReportsRepository.findOne({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Ocorrência não encontrada.');
    }

    return report;
  }

  async markAsReviewed(id: string, adminNotes?: string) {
    const report = await this.findOne(id);

    report.status = LostReportStatus.REVIEWED;
    report.adminNotes =
      adminNotes || 'Ocorrência analisada pela equipe responsável.';

    const savedReport = await this.lostReportsRepository.save(report);

    await this.notificationsService.createInfo(
      report.user.id,
      'Ocorrência analisada',
      `Sua ocorrência referente à bicicleta ${report.loan.equipment.code} foi analisada pela equipe responsável.`,
    );

    return savedReport;
  }

  async reject(id: string, adminNotes?: string) {
    const report = await this.findOne(id);

    report.status = LostReportStatus.REJECTED;
    report.adminNotes =
      adminNotes || 'Ocorrência rejeitada pela equipe responsável.';

    const savedReport = await this.lostReportsRepository.save(report);

    await this.notificationsService.createWarning(
      report.user.id,
      'Ocorrência rejeitada',
      report.adminNotes,
    );

    return savedReport;
  }
}