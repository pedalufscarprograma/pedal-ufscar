import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { CreateUserDto } from './dto/create-user.dto';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { UsersService } from './users.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

import { UserType } from './entities/user.entity';
import { UserDocumentType } from './entities/user-document.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Roles(UserType.ADMIN)
  @Post('internal')
  createInternalUser(@Body() dto: CreateInternalUserDto) {
    return this.usersService.createInternalUser(dto);
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

  // ==========================================
  // FOTO DE PERFIL NO CLOUDINARY
  // ==========================================

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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),

      limits: {
        fileSize: 5 * 1024 * 1024,
      },

      fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Formato inválido. Envie uma imagem JPG, JPEG, PNG ou WEBP.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  updatePhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Nenhuma foto de perfil foi enviada.',
      );
    }

    return this.usersService.updatePhoto(id, file);
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
    @Body() body: { termsVersion: string },
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

  // ==========================================
  // DOCUMENTOS NO CLOUDINARY
  // ==========================================

  @Roles(
    UserType.STUDENT,
    UserType.TEACHER,
    UserType.STAFF,
    UserType.OUTSOURCED_WORKER,
    UserType.ADMIN,
    UserType.OPERATOR,
  )
  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),

      limits: {
        fileSize: 10 * 1024 * 1024,
      },

      fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/jpg',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Formato inválido. Envie PDF, JPG, JPEG ou PNG.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type: UserDocumentType },
  ) {
    if (!file) {
      throw new BadRequestException(
        'Nenhum documento foi enviado.',
      );
    }

    return this.usersService.uploadDocument(
      id,
      file,
      body.type,
    );
  }

  @Roles(
    UserType.ADMIN,
    UserType.OPERATOR,
    UserType.STUDENT,
    UserType.TEACHER,
    UserType.STAFF,
    UserType.OUTSOURCED_WORKER,
  )
  @Get(':id/documents')
  getDocuments(@Param('id') id: string) {
    return this.usersService.getDocuments(id);
  }
}