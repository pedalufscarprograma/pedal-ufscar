import { IsOptional, IsString } from 'class-validator';

export class ReturnLoanDto {
  @IsOptional()
  @IsString()
  returnNotes?: string;
}