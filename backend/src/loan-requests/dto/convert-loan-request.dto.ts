import {
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class ConvertLoanRequestDto {
  @IsBoolean()
  responsibilityTermAccepted!: boolean;

  @IsOptional()
  @IsString()
  responsibilityTermText?: string;

  @IsString()
  signatureImage!: string;

  @IsOptional()
  @IsString()
  helmetId?: string;

  @IsOptional()
  @IsString()
  lockId?: string;
}