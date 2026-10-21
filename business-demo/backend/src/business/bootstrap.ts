import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BusinessModule } from './business.module';
import { AppResponseInterceptor } from '../common/interceptors/app-response.interceptor';

export async function createBusinessApp() {
  const app = await NestFactory.create(BusinessModule, { logger: ['error', 'warn'] });
  app.useGlobalInterceptors(new AppResponseInterceptor());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.enableCors({ origin: ['http://127.0.0.1:3038', 'http://localhost:3038'] });
  app.enableShutdownHooks();
  return app;
}
