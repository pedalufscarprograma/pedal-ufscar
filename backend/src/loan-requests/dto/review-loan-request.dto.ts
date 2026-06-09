import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { LoanRequestStatus } from '../entities/loan-request.entity';

export class ReviewLoanRequestDto {
  @IsEnum([
    LoanRequestStatus.APPROVED,
    LoanRequestStatus.REJECTED,
  ])
  status!: LoanRequestStatus;

  @IsOptional()
  @IsUUID()
  reviewedById?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}