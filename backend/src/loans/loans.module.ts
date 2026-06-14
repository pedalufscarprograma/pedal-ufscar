import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OperatingHoursModule } from '../operating-hours/operating-hours.module';

import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { LoansCronService } from './loans-cron.service';

import { Loan } from './entities/loan.entity';
import { LoanRenewal } from './entities/loan-renewal.entity';

import { User } from '../users/entities/user.entity';
import { Equipment } from '../equipments/entities/equipment.entity';
import { Setting } from '../settings/entities/setting.entity';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Loan,
      LoanRenewal,
      User,
      Equipment,
      Setting,
      RealtimeModule
    ]),
    AuditLogsModule,
    NotificationsModule,
    OperatingHoursModule,
  ],
  controllers: [LoansController],
  providers: [
    LoansService,
    LoansCronService,
  ],
})
export class LoansModule {}