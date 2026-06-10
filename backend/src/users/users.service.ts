import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';

import { NotificationsService } from '../notifications/notifications.service';

import { CreateUserDto } from './dto/create-user.dto';
import { User, UserStatus, UserType } from './entities/user.entity';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly auditLogsService: AuditLogsService,

    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Já existe um usuário com este e-mail.');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      fullName: createUserDto.fullName,
      email: createUserDto.email,
      phone: createUserDto.phone || null,
      cpf: createUserDto.cpf || null,
      rg: createUserDto.rg || null,

      birthDate: createUserDto.birthDate
        ? new Date(createUserDto.birthDate)
        : null,

      birthPlace: createUserDto.birthPlace || null,
      nationality: createUserDto.nationality || null,

      ufscarNumber: createUserDto.ufscarNumber || null,
      courseOrDepartment: createUserDto.courseOrDepartment || null,
      address: createUserDto.address || null,

      racialIdentity: createUserDto.racialIdentity || null,
      genderIdentity: createUserDto.genderIdentity || null,
      socialClass: createUserDto.socialClass || null,

      photoUrl: createUserDto.photoUrl || null,
      userType: createUserDto.userType,
      passwordHash,
      status: UserStatus.PENDING,
      termsAccepted: false,
      termsAcceptedAt: null,
      termsVersion: null,
    });

    const savedUser = await this.usersRepository.save(user);

    await this.auditLogsService.register({
      action: AuditAction.CREATE_USER,
      entity: 'users',
      entityId: savedUser.id,
      description: `Usuário cadastrado: ${savedUser.fullName} (${savedUser.email})`,
    });

    return savedUser;
  }

  async createInternalUser(dto: CreateInternalUserDto) {
    const allowedTypes = [
      UserType.ADMIN,
      UserType.OPERATOR,
      UserType.MECHANIC,
    ];

    if (!allowedTypes.includes(dto.userType)) {
      throw new BadRequestException(
        'Somente usuários internos podem ser criados por esta rota.',
      );
    }

    const existingUser = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Já existe um usuário com este e-mail.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone || null,
      cpf: dto.cpf || null,
      rg: dto.rg || null,

      birthDate: null,
      birthPlace: null,
      nationality: null,

      ufscarNumber: null,
      courseOrDepartment: 'Usuário interno do sistema',
      address: null,

      racialIdentity: null,
      genderIdentity: null,
      socialClass: null,

      photoUrl: null,
      userType: dto.userType,
      passwordHash,
      status: UserStatus.APPROVED,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      termsVersion: '1.0',
    });

    const savedUser = await this.usersRepository.save(user);

    await this.auditLogsService.register({
      action: AuditAction.CREATE_USER,
      entity: 'users',
      entityId: savedUser.id,
      description: `Usuário interno criado: ${savedUser.fullName} (${savedUser.email})`,
    });

    return savedUser;
  }

  async createWithPassword(data: Partial<User>) {
    const user = this.usersRepository.create(data);

    const savedUser = await this.usersRepository.save(user);

    await this.auditLogsService.register({
      action: AuditAction.CREATE_USER,
      entity: 'users',
      entityId: savedUser.id,
      description: `Usuário criado com senha: ${savedUser.fullName} (${savedUser.email})`,
    });

    return savedUser;
  }

  async findByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async findAll() {
    return this.usersRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  async updatePhoto(id: string, photoUrl: string) {
    if (!photoUrl) {
      throw new BadRequestException('A foto de perfil é obrigatória.');
    }

    const user = await this.findOne(id);

    user.photoUrl = photoUrl;

    const savedUser = await this.usersRepository.save(user);

    await this.auditLogsService.register({
      action: AuditAction.UPDATE_USER,
      entity: 'users',
      entityId: savedUser.id,
      description: `Foto de perfil atualizada: ${savedUser.fullName} (${savedUser.email})`,
    });

    return savedUser;
  }

  async acceptTerms(id: string, termsVersion: string) {
    const user = await this.findOne(id);

    if (user.status !== UserStatus.APPROVED) {
      throw new BadRequestException(
        'Somente usuários aprovados podem aceitar os termos de uso.',
      );
    }

    if (user.termsAccepted) {
      throw new BadRequestException(
        'Os termos de uso já foram aceitos por este usuário.',
      );
    }

    user.termsAccepted = true;
    user.termsAcceptedAt = new Date();
    user.termsVersion = termsVersion || '1.0';

    const savedUser = await this.usersRepository.save(user);

    await this.auditLogsService.register({
      action: AuditAction.ACCEPT_TERMS,
      entity: 'users',
      entityId: savedUser.id,
      description: `Termos gerais de uso aceitos por ${savedUser.fullName} (${savedUser.email}) - versão ${savedUser.termsVersion}`,
    });

    await this.notificationsService.createSuccess(
      savedUser.id,
      'Termos aceitos',
      'Você aceitou os termos gerais de uso do PEDAL-UFSCar e já pode solicitar bicicletas.',
    );

    return savedUser;
  }

  async approve(id: string) {
    const user = await this.findOne(id);

    user.status = UserStatus.APPROVED;

    const savedUser = await this.usersRepository.save(user);

    await this.auditLogsService.register({
      action: AuditAction.APPROVE_USER,
      entity: 'users',
      entityId: savedUser.id,
      description: `Usuário aprovado: ${savedUser.fullName} (${savedUser.email})`,
    });

    await this.notificationsService.createSuccess(
      savedUser.id,
      'Cadastro aprovado',
      'Seu cadastro foi aprovado. Para solicitar bicicletas, leia e aceite os termos gerais de uso do PEDAL-UFSCar.',
    );

    return savedUser;
  }

  async suspend(id: string) {
    const user = await this.findOne(id);

    user.status = UserStatus.SUSPENDED;

    const savedUser = await this.usersRepository.save(user);

    await this.auditLogsService.register({
      action: AuditAction.SUSPEND_USER,
      entity: 'users',
      entityId: savedUser.id,
      description: `Usuário suspenso: ${savedUser.fullName} (${savedUser.email})`,
    });

    await this.notificationsService.createWarning(
      savedUser.id,
      'Cadastro suspenso',
      'Seu cadastro foi suspenso. Entre em contato com a equipe responsável.',
    );

    return savedUser;
  }

  async suspendForLateLoan(id: string) {
    const user = await this.findOne(id);

    user.status = UserStatus.SUSPENDED;

    const savedUser = await this.usersRepository.save(user);

    await this.auditLogsService.register({
      action: AuditAction.SUSPEND_USER,
      entity: 'users',
      entityId: savedUser.id,
      description: `Usuário suspenso automaticamente por atraso na devolução: ${savedUser.fullName} (${savedUser.email})`,
    });

    await this.notificationsService.createWarning(
      savedUser.id,
      'Cadastro suspenso por atraso',
      'Seu cadastro foi suspenso automaticamente porque a bicicleta não foi devolvida dentro do prazo. Procure a equipe responsável do PEDAL-UFSCar.',
    );

    return savedUser;
  }

  async block(id: string) {
    const user = await this.findOne(id);

    user.status = UserStatus.BLOCKED;

    const savedUser = await this.usersRepository.save(user);

    await this.auditLogsService.register({
      action: AuditAction.BLOCK_USER,
      entity: 'users',
      entityId: savedUser.id,
      description: `Usuário bloqueado: ${savedUser.fullName} (${savedUser.email})`,
    });

    await this.notificationsService.createWarning(
      savedUser.id,
      'Cadastro bloqueado',
      'Seu cadastro foi bloqueado. Entre em contato com a equipe responsável.',
    );

    return savedUser;
  }

  async cancel(id: string) {
    const user = await this.findOne(id);

    user.status = UserStatus.CANCELLED;

    const savedUser = await this.usersRepository.save(user);

    await this.auditLogsService.register({
      action: AuditAction.CANCEL_USER,
      entity: 'users',
      entityId: savedUser.id,
      description: `Usuário cancelado: ${savedUser.fullName} (${savedUser.email})`,
    });

    await this.notificationsService.createWarning(
      savedUser.id,
      'Cadastro cancelado',
      'Seu cadastro foi cancelado. Entre em contato com a equipe responsável.',
    );

    return savedUser;
  }
}