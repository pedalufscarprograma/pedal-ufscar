import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateLoanRequestDto } from './dto/create-loan-request.dto';
import { ReviewLoanRequestDto } from './dto/review-loan-request.dto';
import { ConvertLoanRequestDto } from './dto/convert-loan-request.dto';

import { LoanRequestsService } from './loan-requests.service';

@Controller('loan-requests')
export class LoanRequestsController {
  constructor(
    private readonly loanRequestsService: LoanRequestsService,
  ) {}

  @Post()
  create(@Body() dto: CreateLoanRequestDto) {
    return this.loanRequestsService.create(dto);
  }

  @Get()
  findAll() {
    return this.loanRequestsService.findAll();
  }

  @Get('pending')
  findPending() {
    return this.loanRequestsService.findPending();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loanRequestsService.findOne(id);
  }

  @Patch(':id/review')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewLoanRequestDto,
  ) {
    return this.loanRequestsService.review(id, dto);
  }

  @Patch(':id/convert-to-loan')
  convertToLoan(
    @Param('id') id: string,
    @Body() dto: ConvertLoanRequestDto,
  ) {
    return this.loanRequestsService.convertToLoan(id, dto);
  }
  
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.loanRequestsService.cancel(id);
  }
}