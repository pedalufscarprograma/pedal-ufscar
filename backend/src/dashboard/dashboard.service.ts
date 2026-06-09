import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User, UserStatus } from '../users/entities/user.entity';
import {
  Equipment,
  EquipmentStatus,
  EquipmentType,
} from '../equipments/entities/equipment.entity';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import {
  MaintenanceRecord,
  MaintenanceStatus,
} from '../maintenance/entities/maintenance-record.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Equipment)
    private readonly equipmentsRepository: Repository<Equipment>,

    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,

    @InjectRepository(MaintenanceRecord)
    private readonly maintenanceRepository: Repository<MaintenanceRecord>,
  ) {}

  async getStats() {
    const now = new Date();

    const [
      totalUsers,
      pendingUsers,
      approvedUsers,
      totalEquipments,
      totalBikes,
      availableBikes,
      loanedBikes,
      maintenanceBikes,
      activeLoans,
      returnedLoans,
      totalLoans,
      totalMaintenance,
      activeMaintenance,
      finishedMaintenance,
    ] = await Promise.all([
      this.usersRepository.count(),

      this.usersRepository.count({
        where: { status: UserStatus.PENDING },
      }),

      this.usersRepository.count({
        where: { status: UserStatus.APPROVED },
      }),

      this.equipmentsRepository.count(),

      this.equipmentsRepository.count({
        where: { type: EquipmentType.BIKE },
      }),

      this.equipmentsRepository.count({
        where: {
          type: EquipmentType.BIKE,
          status: EquipmentStatus.AVAILABLE,
        },
      }),

      this.equipmentsRepository.count({
        where: {
          type: EquipmentType.BIKE,
          status: EquipmentStatus.LOANED,
        },
      }),

      this.equipmentsRepository.count({
        where: {
          type: EquipmentType.BIKE,
          status: EquipmentStatus.MAINTENANCE,
        },
      }),

      this.loansRepository.count({
        where: { status: LoanStatus.ACTIVE },
      }),

      this.loansRepository.count({
        where: { status: LoanStatus.RETURNED },
      }),

      this.loansRepository.count(),

      this.maintenanceRepository.count(),

      this.maintenanceRepository.count({
        where: { status: MaintenanceStatus.IN_PROGRESS },
      }),

      this.maintenanceRepository.count({
        where: { status: MaintenanceStatus.FINISHED },
      }),
    ]);

    const activeLoansList = await this.loansRepository.find({
      where: { status: LoanStatus.ACTIVE },
    });

    const lateLoans = activeLoansList.filter(
      (loan) => loan.expectedReturnDate < now,
    ).length;

    return {
      users: {
        total: totalUsers,
        pending: pendingUsers,
        approved: approvedUsers,
      },

      equipments: {
        total: totalEquipments,
        bikes: totalBikes,
        availableBikes,
        loanedBikes,
        maintenanceBikes,
      },

      loans: {
        total: totalLoans,
        active: activeLoans,
        returned: returnedLoans,
        late: lateLoans,
      },

      maintenance: {
        total: totalMaintenance,
        active: activeMaintenance,
        finished: finishedMaintenance,
      },
    };
  }
}