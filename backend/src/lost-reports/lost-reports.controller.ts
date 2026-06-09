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

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserType } from '../users/entities/user.entity';

import { CreateLostReportDto } from './dto/create-lost-report.dto';
import { LostReportsService } from './lost-reports.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lost-reports')
export class LostReportsController {
  constructor(
    private readonly lostReportsService: LostReportsService,
  ) {}

  @Roles(
    UserType.STUDENT,
    UserType.TEACHER,
    UserType.STAFF,
    UserType.OUTSOURCED_WORKER,
    UserType.ADMIN,
    UserType.OPERATOR,
  )
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/lost-reports',

        filename: (_req, file, callback) => {
          const timestamp = Date.now();
          const extension = path.extname(file.originalname);
          const filename = `lost-report-${timestamp}${extension}`;

          callback(null, filename);
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      success: true,
      documentUrl: `http://localhost:3000/uploads/lost-reports/${file.filename}`,
    };
  }

  @Roles(
    UserType.STUDENT,
    UserType.TEACHER,
    UserType.STAFF,
    UserType.OUTSOURCED_WORKER,
    UserType.ADMIN,
    UserType.OPERATOR,
  )
  @Post()
  create(@Body() dto: CreateLostReportDto) {
    return this.lostReportsService.create(dto);
  }

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Get()
  findAll() {
    return this.lostReportsService.findAll();
  }

  @Roles(
    UserType.STUDENT,
    UserType.TEACHER,
    UserType.STAFF,
    UserType.OUTSOURCED_WORKER,
    UserType.ADMIN,
    UserType.OPERATOR,
  )
  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.lostReportsService.findByUser(userId);
  }

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Patch(':id/review')
  markAsReviewed(
    @Param('id') id: string,
    @Body() body: { adminNotes?: string },
  ) {
    return this.lostReportsService.markAsReviewed(
      id,
      body.adminNotes,
    );
  }

  @Roles(UserType.ADMIN, UserType.OPERATOR)
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() body: { adminNotes?: string },
  ) {
    return this.lostReportsService.reject(id, body.adminNotes);
  }
}