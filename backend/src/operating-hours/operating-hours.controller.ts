import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

import { UserType } from '../users/entities/user.entity';

import { OperatingHoursService } from './operating-hours.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('operating-hours')
export class OperatingHoursController {
  constructor(
    private readonly operatingHoursService: OperatingHoursService,
  ) {}

  @Roles(
    UserType.ADMIN,
    UserType.OPERATOR,
    UserType.STUDENT,
    UserType.TEACHER,
    UserType.STAFF,
    UserType.OUTSOURCED_WORKER,
  )
  @Get()
  findAll() {
    return this.operatingHoursService.findAll();
  }

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Patch()
  updateAll(
    @Body()
    dto: {
      hours: {
        dayOfWeek: number;
        isOpen: boolean;
        openTime?: string | null;
        closeTime?: string | null;
      }[];
    },
  ) {
    return this.operatingHoursService.updateAll(dto);
  }
}