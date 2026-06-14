import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Notification,
  NotificationType,
} from './entities/notification.entity';

import { CreateNotificationDto } from './dto/create-notification.dto';

import { User } from '../users/entities/user.entity';

import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(dto: CreateNotificationDto) {
    const user = await this.usersRepository.findOne({
      where: {
        id: dto.userId,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const notification = this.notificationsRepository.create({
      user,
      title: dto.title,
      message: dto.message,
      type: dto.type,
      isRead: false,
    });

    const savedNotification =
      await this.notificationsRepository.save(notification);

    this.realtimeGateway.emitToUser(
      user.id,
      'notifications.updated',
      savedNotification,
    );

    this.realtimeGateway.emitToAdmins(
      'notifications.updated',
      savedNotification,
    );

    this.realtimeGateway.emitToAdmins(
      'dashboard.updated',
      {
        source: 'notifications',
        userId: user.id,
      },
    );

    return savedNotification;
  }

  async createInfo(
    userId: string,
    title: string,
    message: string,
  ) {
    return this.create({
      userId,
      title,
      message,
      type: NotificationType.INFO,
    });
  }

  async createSuccess(
    userId: string,
    title: string,
    message: string,
  ) {
    return this.create({
      userId,
      title,
      message,
      type: NotificationType.SUCCESS,
    });
  }

  async createWarning(
    userId: string,
    title: string,
    message: string,
  ) {
    return this.create({
      userId,
      title,
      message,
      type: NotificationType.WARNING,
    });
  }

  async findAll() {
    return this.notificationsRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findByUser(userId: string) {
    return this.notificationsRepository.find({
      where: {
        user: {
          id: userId,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async markAsRead(id: string) {
    const notification =
      await this.notificationsRepository.findOne({
        where: {
          id,
        },
        relations: {
          user: true,
        },
      });

    if (!notification) {
      throw new NotFoundException(
        'Notificação não encontrada.',
      );
    }

    notification.isRead = true;

    const savedNotification =
      await this.notificationsRepository.save(notification);

    this.realtimeGateway.emitToUser(
      savedNotification.user.id,
      'notifications.updated',
      savedNotification,
    );

    return savedNotification;
  }

  async markAllAsRead(userId: string) {
    const notifications =
      await this.notificationsRepository.find({
        where: {
          user: {
            id: userId,
          },
        },
        relations: {
          user: true,
        },
      });

    for (const notification of notifications) {
      notification.isRead = true;
    }

    const savedNotifications =
      await this.notificationsRepository.save(notifications);

    this.realtimeGateway.emitToUser(
      userId,
      'notifications.updated',
      {
        readAll: true,
      },
    );

    return savedNotifications;
  }
}