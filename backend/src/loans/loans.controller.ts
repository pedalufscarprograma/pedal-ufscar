import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreateLoanDto } from './dto/create-loan.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { SignLoanTermDto } from './dto/sign-loan-term.dto';

import { LoansService } from './loans.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

import { UserType } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loans')
export class LoansController {
  constructor(
    private readonly loansService: LoansService,
  ) {}

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Post()
  create(
    @Body()
    createLoanDto: CreateLoanDto,
  ) {
    return this.loansService.create(createLoanDto);
  }

  @Roles(
    UserType.ADMIN,
    UserType.OPERATOR,
    UserType.STUDENT,
    UserType.TEACHER,
    UserType.STAFF,
    UserType.OUTSOURCED_WORKER,
  )
  @Patch(':id/sign-term')
  signTerm(
    @Param('id') id: string,
    @Body() dto: SignLoanTermDto,
  ) {
    return this.loansService.signTerm(id, dto);
  }

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Get()
  findAll() {
    return this.loansService.findAll();
  }

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Get('active')
  findActive() {
    return this.loansService.findActive();
  }

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Get('late')
  findLate() {
    return this.loansService.findLate();
  }

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Patch(':id/return')
  returnLoan(
    @Param('id') id: string,
    @Body() returnLoanDto: ReturnLoanDto,
  ) {
    return this.loansService.returnLoan(
      id,
      returnLoanDto,
    );
  }

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Patch(':id/lost')
  markAsLost(
    @Param('id') id: string,
    @Body() returnLoanDto: ReturnLoanDto,
  ) {
    return this.loansService.markAsLost(
      id,
      returnLoanDto,
    );
  }

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Patch(':id/damaged')
  markAsDamaged(
    @Param('id') id: string,
    @Body() returnLoanDto: ReturnLoanDto,
  ) {
    return this.loansService.markAsDamaged(
      id,
      returnLoanDto,
    );
  }
}