import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationsModule } from '../notifications/notifications.module';

import { Loan } from '../loans/entities/loan.entity';
import { User } from '../users/entities/user.entity';
import { Equipment } from '../equipments/entities/equipment.entity';

import { LostReport } from './entities/lost-report.entity';
import { LostReportsController } from './lost-reports.controller';
import { LostReportsService } from './lost-reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LostReport,
      Loan,
      User,
      Equipment,
    ]),
    NotificationsModule,
  ],
  controllers: [LostReportsController],
  providers: [LostReportsService],
})
export class LostReportsModule {}