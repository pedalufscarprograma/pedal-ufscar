import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OperatingHour } from './entities/operating-hour.entity';
import { OperatingHoursController } from './operating-hours.controller';
import { OperatingHoursService } from './operating-hours.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OperatingHour]),
  ],
  controllers: [OperatingHoursController],
  providers: [OperatingHoursService],
  exports: [OperatingHoursService],
})
export class OperatingHoursModule {}