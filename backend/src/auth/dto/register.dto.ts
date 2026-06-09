import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { UserType } from '../../users/entities/user.entity';

export class RegisterDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  rg?: string;

  @IsOptional()
  @IsString()
  ufscarNumber?: string;

  @IsOptional()
  @IsString()
  courseOrDepartment?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsEnum(UserType)
  userType!: UserType;
}