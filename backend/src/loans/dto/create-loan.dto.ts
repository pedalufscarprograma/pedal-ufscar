import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateLoanDto {
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

  @IsOptional()
  @IsBoolean()
  responsibilityTermAccepted?: boolean;

  @IsOptional()
  @IsString()
  responsibilityTermText?: string;

  @IsOptional()
  @IsString()
  signatureImage?: string;
}