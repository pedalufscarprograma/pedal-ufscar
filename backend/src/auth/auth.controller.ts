import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return req.user;
  }

  // ROTA TEMPORÁRIA
  @Post('create-first-admin')
  createFirstAdminPost() {
    return this.authService.createFirstAdmin();
  }

  // ROTA TEMPORÁRIA PARA TESTAR PELO NAVEGADOR
  @Get('create-first-admin')
  createFirstAdminGet() {
    return this.authService.createFirstAdmin();
  }
}

