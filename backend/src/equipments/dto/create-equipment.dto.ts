import { IsEnum, IsOptional, IsString } from 'class-validator';

import { EquipmentType } from '../entities/equipment.entity';

export class CreateEquipmentDto {
  @IsEnum(EquipmentType)
  type!: EquipmentType;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}