import { Test, TestingModule } from '@nestjs/testing';
import { LoanRequestsController } from './loan-requests.controller';

describe('LoanRequestsController', () => {
  let controller: LoanRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoanRequestsController],
    }).compile();

    controller = module.get<LoanRequestsController>(LoanRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
