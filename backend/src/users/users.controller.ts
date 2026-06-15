import {
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
import { diskStorage } from 'multer';
import { extname } from 'path';

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
    return this.usersService.updatePhoto(id, body.photoUrl);
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
    return this.usersService.acceptTerms(id, body.termsVersion);
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
      storage: diskStorage({
        destination: './uploads/user-documents',
        filename: (_req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);

          const extension = extname(file.originalname);

          callback(
            null,
            `${file.fieldname}-${uniqueSuffix}${extension}`,
          );
        },
      }),
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
          return callback(
            new Error('Formato inválido. Envie PDF, JPG ou PNG.'),
            false,
          );
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
    return this.usersService.uploadDocument(id, file, body.type);
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