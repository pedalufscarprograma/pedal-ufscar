import { Test, TestingModule } from '@nestjs/testing';
import { LoanRequestsService } from './loan-requests.service';

describe('LoanRequestsService', () => {
  let service: LoanRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoanRequestsService],
    }).compile();

    service = module.get<LoanRequestsService>(LoanRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
