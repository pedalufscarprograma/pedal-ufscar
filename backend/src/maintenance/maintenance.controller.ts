import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserType } from '../users/entities/user.entity';

import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { FinishMaintenanceDto } from './dto/finish-maintenance.dto';
import { MaintenanceService } from './maintenance.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Roles(UserType.ADMIN, UserType.OPERATOR, UserType.MECHANIC)
  @Post()
  create(@Body() dto: CreateMaintenanceDto) {
    return this.maintenanceService.create(dto);
  }

  @Roles(UserType.ADMIN, UserType.OPERATOR, UserType.MECHANIC)
  @Get()
  findAll() {
    return this.maintenanceService.findAll();
  }

  @Roles(UserType.ADMIN, UserType.OPERATOR, UserType.MECHANIC)
  @Get('active')
  findActive() {
    return this.maintenanceService.findActive();
  }

  @Roles(UserType.ADMIN, UserType.MECHANIC)
  @Patch(':id/finish')
  finish(@Param('id') id: string, @Body() dto: FinishMaintenanceDto) {
    return this.maintenanceService.finish(id, dto);
  }
}