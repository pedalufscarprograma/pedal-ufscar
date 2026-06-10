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
import * as path from 'path';

import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { EquipmentsService } from './equipments.service';
import { EquipmentStatus } from './entities/equipment.entity';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

import { UserType } from '../users/entities/user.entity';

@Controller('equipments')
export class EquipmentsController {
  constructor(
    private readonly equipmentsService: EquipmentsService,
  ) {}

  @Get('public/:id')
  findPublic(@Param('id') id: string) {
    return this.equipmentsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Post()
  create(
    @Body()
    createEquipmentDto: CreateEquipmentDto,
  ) {
    return this.equipmentsService.create(
      createEquipmentDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/equipments',

        filename: (_req, file, callback) => {
          const timestamp = Date.now();
          const extension = path.extname(file.originalname);
          const filename = `equipment-${timestamp}${extension}`;

          callback(null, filename);
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      success: true,
      photoUrl: `http://localhost:3000/uploads/equipments/${file.filename}`,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserType.ADMIN,
    UserType.OPERATOR,
    UserType.MECHANIC,
  )
  @Get()
  findAll() {
    return this.equipmentsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserType.ADMIN,
    UserType.OPERATOR,
    UserType.MECHANIC,
  )
  @Get('available')
  findAvailable() {
    return this.equipmentsService.findAvailable();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserType.ADMIN,
    UserType.OPERATOR,
    UserType.MECHANIC,
  )
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEquipmentDto: Partial<CreateEquipmentDto>,
  ) {
    return this.equipmentsService.update(
      id,
      updateEquipmentDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: EquipmentStatus },
  ) {
    return this.equipmentsService.updateStatus(
      id,
      body.status,
    );
  }

  // ==========================
  // PUBLICAR BICICLETA
  // ==========================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Patch(':id/publish')
  publish(
    @Param('id') id: string,
  ) {
    return this.equipmentsService.publish(id);
  }

  // ==========================
  // CANCELAR PUBLICAÇÃO
  // ==========================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Patch(':id/unpublish')
  unpublish(
    @Param('id') id: string,
  ) {
    return this.equipmentsService.unpublish(id);
  }
}