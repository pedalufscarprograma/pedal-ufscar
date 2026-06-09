import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { UsersModule } from './users/users.module';
import { EquipmentsModule } from './equipments/equipments.module';
import { LoansModule } from './loans/loans.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SettingsModule } from './settings/settings.module';
import { LoanRequestsModule } from './loan-requests/loan-requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OperatingHoursModule } from './operating-hours/operating-hours.module';
import { LostReportsModule } from './lost-reports/lost-reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            autoLoadEntities: true,
            synchronize: true,
            ssl: {
              rejectUnauthorized: false,
            },
          };
        }

        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST'),
          port: Number(config.get<string>('DB_PORT')),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),

    UsersModule,
    EquipmentsModule,
    LoansModule,
    AuthModule,
    DashboardModule,
    MaintenanceModule,
    AuditLogsModule,
    SettingsModule,
    LoanRequestsModule,
    NotificationsModule,
    OperatingHoursModule,
    LostReportsModule,
  ],
})
export class AppModule {}