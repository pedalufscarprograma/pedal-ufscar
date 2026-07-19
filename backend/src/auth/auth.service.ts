import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';

import * as bcrypt from 'bcrypt';
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
    const brevoApiKey = process.env.BREVO_API_KEY;

    const senderEmail =
      process.env.BREVO_SENDER_EMAIL ||
      'pedalufscarprograma@gmail.com';

    const senderName =
      process.env.BREVO_SENDER_NAME ||
      'PEDAL UFSCar';

    if (!brevoApiKey) {
      throw new BadRequestException(
        'Serviço de e-mail não configurado.',
      );
    }

    const response = await fetch(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',

        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },

        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },

          to: [
            {
              email,
            },
          ],

          replyTo: {
            name: senderName,
            email: senderEmail,
          },

          subject:
            'Código de recuperação de senha - PEDAL UFSCar',

          htmlContent: `
            <!DOCTYPE html>
            <html lang="pt-BR">
              <head>
                <meta charset="UTF-8" />
                <meta
                  name="viewport"
                  content="width=device-width, initial-scale=1.0"
                />

                <title>
                  Recuperação de senha - PEDAL UFSCar
                </title>
              </head>

              <body
                style="
                  margin: 0;
                  padding: 0;
                  background-color: #f1f5f9;
                  font-family: Arial, Helvetica, sans-serif;
                  color: #172033;
                "
              >
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                  style="
                    background-color: #f1f5f9;
                    padding: 32px 16px;
                  "
                >
                  <tr>
                    <td align="center">
                      <table
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                        style="
                          max-width: 600px;
                          background-color: #ffffff;
                          border-radius: 16px;
                          overflow: hidden;
                          box-shadow: 0 8px 24px
                            rgba(15, 23, 42, 0.08);
                        "
                      >
                        <tr>
                          <td
                            align="center"
                            style="
                              padding: 28px;
                              background-color: #166534;
                              color: #ffffff;
                            "
                          >
                            <h1
                              style="
                                margin: 0;
                                font-size: 28px;
                              "
                            >
                              PEDAL UFSCar
                            </h1>

                            <p
                              style="
                                margin: 8px 0 0;
                                font-size: 15px;
                              "
                            >
                              Programa de Empréstimo de Bicicletas
                            </p>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding: 32px;">
                            <h2
                              style="
                                margin-top: 0;
                                color: #0f172a;
                              "
                            >
                              Recuperação de senha
                            </h2>

                            <p>Olá,</p>

                            <p
                              style="
                                line-height: 1.7;
                                color: #475569;
                              "
                            >
                              Recebemos uma solicitação para
                              redefinir a senha da sua conta no
                              sistema PEDAL UFSCar.
                            </p>

                            <p
                              style="
                                line-height: 1.7;
                                color: #475569;
                              "
                            >
                              Digite o código abaixo na página de
                              recuperação:
                            </p>

                            <div
                              style="
                                margin: 28px 0;
                                padding: 22px;
                                background-color: #f0fdf4;
                                border: 1px solid #bbf7d0;
                                border-radius: 12px;
                                text-align: center;
                                font-size: 34px;
                                font-weight: bold;
                                letter-spacing: 8px;
                                color: #166534;
                              "
                            >
                              ${code}
                            </div>

                            <p
                              style="
                                line-height: 1.7;
                                color: #475569;
                              "
                            >
                              Este código é válido por
                              <strong>15 minutos</strong> e pode ser
                              utilizado apenas uma vez.
                            </p>

                            <p
                              style="
                                line-height: 1.7;
                                color: #475569;
                              "
                            >
                              Caso você não tenha solicitado a
                              recuperação, ignore este e-mail. Sua
                              senha continuará a mesma.
                            </p>

                            <p
                              style="
                                margin-top: 32px;
                                line-height: 1.7;
                              "
                            >
                              Atenciosamente,<br />
                              <strong>Equipe PEDAL UFSCar</strong>
                            </p>
                          </td>
                        </tr>

                        <tr>
                          <td
                            align="center"
                            style="
                              padding: 18px;
                              background-color: #f8fafc;
                              color: #64748b;
                              font-size: 12px;
                            "
                          >
                            Esta é uma mensagem automática de
                            segurança. Não informe este código a
                            outras pessoas.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
          `,

          textContent: `
  PEDAL UFSCar

  Recuperação de senha

  Recebemos uma solicitação para redefinir a senha da sua conta.

  Código de recuperação: ${code}

  Este código é válido por 15 minutos e pode ser utilizado apenas uma vez.

  Caso você não tenha solicitado esta recuperação, ignore esta mensagem.

  Equipe PEDAL UFSCar
          `.trim(),

          tags: [
            'recuperacao-senha',
            'pedal-ufscar',
          ],
        }),
      },
    );

    const responseBody = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      console.error(
        'Erro da API da Brevo:',
        response.status,
        responseBody,
      );

      throw new BadRequestException(
        'Não foi possível enviar o código de recuperação por e-mail.',
      );
    }

    console.log(
      `E-mail de recuperação enviado para ${email}.`,
      responseBody,
    );

    return responseBody;
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