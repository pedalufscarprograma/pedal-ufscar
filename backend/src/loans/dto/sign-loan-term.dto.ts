import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SignLoanTermDto {
  @IsBoolean()
  responsibilityTermAccepted!: boolean;

  @IsOptional()
  @IsString()
  responsibilityTermText?: string;

  @IsString()
  signatureImage!: string;
}