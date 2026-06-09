import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { LoanRequestsService } from './loan-requests.service';

@Injectable()
export class LoanRequestsCronService {
  constructor(
    private readonly loanRequestsService: LoanRequestsService,
  ) {}

  @Cron('*/5 * * * *')
  async handleExpiredApprovedRequests() {
    await this.loanRequestsService.expireApprovedRequests();
  }
}