import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoanRequestsController } from './loan-requests.controller';
import { LoanRequestsService } from './loan-requests.service';
import { LoanRequest } from './entities/loan-request.entity';
import { LoanRequestsCronService } from './loan-requests-cron.service';

import { User } from '../users/entities/user.entity';
import { Equipment } from '../equipments/entities/equipment.entity';
import { Loan } from '../loans/entities/loan.entity';
import { Setting } from '../settings/entities/setting.entity';

import { NotificationsModule } from '../notifications/notifications.module';
import { OperatingHoursModule } from '../operating-hours/operating-hours.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoanRequest,
      User,
      Equipment,
      Loan,
      Setting,
    ]),
    NotificationsModule,
    OperatingHoursModule,
  ],
  controllers: [LoanRequestsController],
  providers: [
    LoanRequestsService,
    LoanRequestsCronService,
  ],
  exports: [
    LoanRequestsService,
  ],
})
export class LoanRequestsModule {}