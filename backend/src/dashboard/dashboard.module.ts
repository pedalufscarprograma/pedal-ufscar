import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

import { User } from '../users/entities/user.entity';
import { Equipment } from '../equipments/entities/equipment.entity';
import { Loan } from '../loans/entities/loan.entity';
import { MaintenanceRecord } from '../maintenance/entities/maintenance-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Equipment, Loan, MaintenanceRecord])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}