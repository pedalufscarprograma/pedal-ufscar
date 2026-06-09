import {
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
} from 'class-validator';

import { UserType } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  phone!: string;

  @IsString()
  cpf!: string;

  @IsString()
  birthDate!: string;

  @IsString()
  birthPlace!: string;

  @IsString()
  nationality!: string;

  @IsString()
  ufscarNumber!: string;

  @IsString()
  courseOrDepartment!: string;

  @IsString()
  address!: string;

  @IsString()
  racialIdentity!: string;

  @IsString()
  genderIdentity!: string;

  @IsString()
  socialClass!: string;

  @IsString()
  photoUrl!: string;

  // único campo opcional
  @IsString()
  rg?: string;

  @IsEnum(UserType)
  userType!: UserType;
}