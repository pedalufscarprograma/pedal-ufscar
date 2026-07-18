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

import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { EquipmentsService } from './equipments.service';
import { EquipmentStatus } from './entities/equipment.entity';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

import { UserType } from '../users/entities/user.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('equipments')
export class EquipmentsController {
  constructor(
    private readonly equipmentsService: EquipmentsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('public/:id')
  findPublic(@Param('id') id: string) {
    return this.equipmentsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Post()
  create(@Body() createEquipmentDto: CreateEquipmentDto) {
    return this.equipmentsService.create(createEquipmentDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Post('upload')
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
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'Nenhuma imagem foi enviada.',
      );
    }

    const result = await this.cloudinaryService.uploadFile(
      file,
      'pedal-ufscar/equipments',
    );

    return {
      success: true,
      message: 'Imagem enviada com sucesso.',
      photoUrl: result.secure_url,
      photoPublicId: result.public_id,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserType.ADMIN,
    UserType.OPERATOR,
    UserType.MECHANIC,
    UserType.STUDENT,
    UserType.TEACHER,
    UserType.STAFF,
    UserType.OUTSOURCED_WORKER,
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
    UserType.STUDENT,
    UserType.TEACHER,
    UserType.STAFF,
    UserType.OUTSOURCED_WORKER,
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Patch(':id/publish')
  publish(@Param('id') id: string) {
    return this.equipmentsService.publish(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Patch(':id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.equipmentsService.unpublish(id);
  }
}