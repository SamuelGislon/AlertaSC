import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDataSourceOptions } from '@alertasc/data';
import { ExpirationJob } from './expiration.job.js';
import { ExpirationService } from './expiration.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    ScheduleModule.forRoot(),
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
  ],
  providers: [ExpirationService, ExpirationJob],
})
export class WorkerModule {}
