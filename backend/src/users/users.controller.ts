import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

import { UserType } from './entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Post()
  create(
    @Body()
    createUserDto: CreateUserDto,
  ) {
    return this.usersService.create(createUserDto);
  }

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Roles(
    UserType.ADMIN,
    UserType.OPERATOR,
    UserType.MECHANIC,
    UserType.STUDENT,
    UserType.TEACHER,
    UserType.STAFF,
    UserType.OUTSOURCED_WORKER,
  )
  @Patch(':id/photo')
  updatePhoto(
    @Param('id') id: string,
    @Body() body: { photoUrl: string },
  ) {
    return this.usersService.updatePhoto(
      id,
      body.photoUrl,
    );
  }

  @Roles(
    UserType.STUDENT,
    UserType.TEACHER,
    UserType.STAFF,
    UserType.OUTSOURCED_WORKER,
    UserType.ADMIN,
    UserType.OPERATOR,
  )
  @Patch(':id/accept-terms')
  acceptTerms(
    @Param('id') id: string,
    @Body()
    body: {
      termsVersion: string;
    },
  ) {
    return this.usersService.acceptTerms(
      id,
      body.termsVersion,
    );
  }

  @Roles(UserType.ADMIN)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.usersService.approve(id);
  }

  @Roles(UserType.ADMIN)
  @Patch(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.usersService.suspend(id);
  }

  @Roles(UserType.ADMIN)
  @Patch(':id/block')
  block(@Param('id') id: string) {
    return this.usersService.block(id);
  }

  @Roles(UserType.ADMIN)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.usersService.cancel(id);
  }
}