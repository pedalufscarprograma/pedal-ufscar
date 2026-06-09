import { IsOptional, IsString, IsUUID } from 'class-validator';

export class FinishMaintenanceDto {
  @IsOptional()
  @IsUUID()
  mechanicId?: string;

  @IsString()
  solutionDescription!: string;
}