import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, type Type } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { SafeLogger } from './security/safe-logger.js';
import { SafeExceptionFilter } from './security/safe-exception.filter.js';

export async function createApiApplication(moduleType: Type<unknown>) {
  const app = await NestFactory.create(moduleType, { logger: false });
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'ready', method: RequestMethod.GET },
    ],
  });
  app.useLogger(app.get(SafeLogger));
  app.useGlobalFilters(app.get(SafeExceptionFilter));
  return app;
}
