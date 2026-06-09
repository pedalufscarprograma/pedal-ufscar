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

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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

    return this.notificationsRepository.save(notification);
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
      });

    if (!notification) {
      throw new NotFoundException(
        'Notificação não encontrada.',
      );
    }

    notification.isRead = true;

    return this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string) {
    const notifications =
      await this.notificationsRepository.find({
        where: {
          user: {
            id: userId,
          },
        },
      });

    for (const notification of notifications) {
      notification.isRead = true;
    }

    return this.notificationsRepository.save(
      notifications,
    );
  }
}