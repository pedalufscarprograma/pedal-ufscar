import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

import { User } from './entities/user.entity';
import { UserDocument } from './entities/user-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserDocument,
    ]),

    AuditLogsModule,
    NotificationsModule,
    RealtimeModule,
  ],

  controllers: [UsersController],

  providers: [UsersService],

  exports: [UsersService],
})
export class UsersModule {}