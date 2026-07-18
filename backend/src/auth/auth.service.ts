import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';

import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { Repository } from 'typeorm';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { PasswordResetToken } from './entities/password-reset-token.entity';

import {
  User,
  UserStatus,
} from '../users/entities/user.entity';

import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokensRepository: Repository<PasswordResetToken>,
  ) {}

  private sanitizeUser(user: User) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private generateToken(user: User) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      userType: user.userType,
    });
  }

  private generateResetCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendPasswordResetEmail(
    email: string,
    code: string,
  ) {
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = Number(process.env.EMAIL_PORT || 587);
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailFrom = process.env.EMAIL_FROM;

    if (
      !emailHost ||
      !emailUser ||
      !emailPass ||
      !emailFrom
    ) {
      throw new BadRequestException(
        'Serviço de e-mail não configurado.',
      );
    }

    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    try {
      const result = await transporter.sendMail({
        from: emailFrom,
        to: email,
        subject:
          'Código de recuperação de senha - PEDAL UFSCar',

        html: `
          <div style="
            max-width: 600px;
            margin: 0 auto;
            padding: 24px;
            font-family: Arial, Helvetica, sans-serif;
            color: #172033;
            background-color: #f8fafc;
          ">
            <div style="
              background-color: #166534;
              padding: 24px;
              border-radius: 14px 14px 0 0;
              text-align: center;
              color: #ffffff;
            ">
              <h1 style="margin: 0; font-size: 28px;">
                PEDAL UFSCar
              </h1>

              <p style="margin: 8px 0 0;">
                Programa de Empréstimo de Bicicletas
              </p>
            </div>

            <div style="
              padding: 30px;
              background-color: #ffffff;
              border: 1px solid #e2e8f0;
              border-top: none;
              border-radius: 0 0 14px 14px;
            ">
              <h2 style="margin-top: 0;">
                Recuperação de senha
              </h2>

              <p>Olá,</p>

              <p>
                Recebemos uma solicitação para redefinir a
                senha da sua conta no sistema PEDAL UFSCar.
              </p>

              <p>
                Digite o código abaixo na página de recuperação:
              </p>

              <div style="
                margin: 28px 0;
                padding: 22px;
                background-color: #f1f5f9;
                border-radius: 12px;
                text-align: center;
                font-size: 34px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #166534;
              ">
                ${code}
              </div>

              <p>
                Este código é válido por
                <strong>15 minutos</strong> e pode ser
                utilizado apenas uma vez.
              </p>

              <p>
                Caso você não tenha solicitado a alteração
                da senha, ignore este e-mail. Sua senha
                permanecerá a mesma.
              </p>

              <p style="margin-top: 32px;">
                Atenciosamente,<br />
                <strong>Equipe PEDAL UFSCar</strong>
              </p>
            </div>
          </div>
        `,

        text: `
  PEDAL UFSCar

  Recebemos uma solicitação para redefinir a senha da sua conta.

  Código de recuperação: ${code}

  Este código é válido por 15 minutos e pode ser utilizado apenas uma vez.

  Caso você não tenha solicitado esta alteração, ignore esta mensagem.

  Equipe PEDAL UFSCar
        `.trim(),
      });

      console.log(
        `E-mail de recuperação enviado para ${email}. ID: ${result.messageId}`,
      );
    } catch (error) {
      console.error(
        'Erro ao enviar e-mail de recuperação:',
        error,
      );

      throw new BadRequestException(
        'Não foi possível enviar o código de recuperação por e-mail.',
      );
    }
  }

  private validateUserStatus(user: User) {
    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException(
        'Seu cadastro ainda está aguardando aprovação.',
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Seu cadastro está suspenso. Entre em contato com a administração.',
      );
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException(
        'Seu cadastro está bloqueado. Entre em contato com a administração.',
      );
    }

    if (user.status === UserStatus.CANCELLED) {
      throw new UnauthorizedException(
        'Seu cadastro foi cancelado.',
      );
    }
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(
      registerDto.email,
    );

    if (existingUser) {
      throw new BadRequestException('Este e-mail já está cadastrado.');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    const user = await this.usersService.createWithPassword({
      ...registerDto,
      passwordHash,
      status: UserStatus.PENDING,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken: this.generateToken(user),
      message:
        'Cadastro realizado com sucesso. Aguarde aprovação da administração.',
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const passwordIsValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    this.validateUserStatus(user);

    return {
      user: this.sanitizeUser(user),
      accessToken: this.generateToken(user),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      return {
        message:
          'Se o e-mail estiver cadastrado, um código de recuperação será enviado.',
      };
    }

    const code = this.generateResetCode();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const token = this.passwordResetTokensRepository.create({
      user,
      code,
      expiresAt,
      used: false,
    });

    await this.passwordResetTokensRepository.save(token);

    await this.sendPasswordResetEmail(user.email, code);

    return {
      message:
        'Se o e-mail estiver cadastrado, um código de recuperação será enviado.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new BadRequestException('Código inválido ou expirado.');
    }

    const token = await this.passwordResetTokensRepository.findOne({
      where: {
        user: { id: user.id },
        code: dto.code,
        used: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!token) {
      throw new BadRequestException('Código inválido ou expirado.');
    }

    if (token.expiresAt < new Date()) {
      throw new BadRequestException('Código expirado.');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.usersRepository.save(user);

    token.used = true;

    await this.passwordResetTokensRepository.save(token);

    return {
      message: 'Senha redefinida com sucesso. Você já pode fazer login.',
    };
  }
}