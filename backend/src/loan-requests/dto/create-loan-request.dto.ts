import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateLoanRequestDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  equipmentId!: string;

  @IsDateString()
  expectedReturnDate!: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}