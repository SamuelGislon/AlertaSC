import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDataSourceOptions } from '@alertasc/data';
import { AuditService } from './audit/audit.service.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { JwtAuthGuard } from './auth/auth.guard.js';
import { PermissionGuard } from './auth/permission.guard.js';
import { HealthController } from './health/health.controller.js';
import { AlertController } from './alerts/alert.controller.js';
import { AlertService } from './alerts/alert.service.js';
import { AlertTabController } from './alert-tab/alert-tab.controller.js';
import { AlertTabService } from './alert-tab/alert-tab.service.js';
import { AlertTabAccessGuard } from './alert-tab/alert-tab-access.guard.js';
import { AlertTabGateway } from './alert-tab/alert-tab.gateway.js';
import { AdminController } from './admin/admin.controller.js';
import { AdminService } from './admin/admin.service.js';
import { SyntheticDataGuard } from './admin/synthetic-data.guard.js';
import { SafeLogger } from './security/safe-logger.js';
import { SafeExceptionFilter } from './security/safe-exception.filter.js';
import { CitizenController } from './citizens/citizen.controller.js';
import { CitizenAccessGuard } from './citizens/citizen-access.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createDataSourceOptions({
        ...process.env,
        DATABASE_URL: config.get<string>('DATABASE_URL') || undefined,
        DATABASE_TEST_URL: config.get<string>('DATABASE_TEST_URL') || undefined,
        POSTGRES_USER: config.get<string>('POSTGRES_USER') || undefined,
        POSTGRES_PASSWORD: config.get<string>('POSTGRES_PASSWORD') || undefined,
      }),
    }),
    JwtModule.register({}),
  ],
  controllers: [HealthController, AuthController, AlertTabController, AlertController, AdminController, CitizenController],
  providers: [
    AuditService, AuthService, JwtAuthGuard, PermissionGuard,
    AlertService, AlertTabService, AlertTabAccessGuard, AlertTabGateway,
    AdminService, SyntheticDataGuard, CitizenAccessGuard, SafeLogger, SafeExceptionFilter,
  ],
})
export class AppModule {}
