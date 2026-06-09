import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { LoansService } from './loans.service';

@Injectable()
export class LoansCronService {
  private readonly logger = new Logger(
    LoansCronService.name,
  );

  constructor(
    private readonly loansService: LoansService,
  ) {}

  @Cron('0 * * * *')
  async handleLoansMonitoring() {
    this.logger.log(
      'Verificando empréstimos e devoluções...',
    );

    await this.loansService.monitorLoans();
  }
}