import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMaintenanceDto {
  @IsUUID()
  equipmentId!: string;

  @IsOptional()
  @IsUUID()
  reportedById?: string;

  @IsString()
  problemDescription!: string;
}