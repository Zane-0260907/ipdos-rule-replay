import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ReplayModule } from './replay.module';

async function bootstrap() {
  const app = await NestFactory.create(ReplayModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = Number(process.env.REPLAY_PORT ?? 3017);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Invalid REPLAY_PORT');
  await app.listen(port, '127.0.0.1');
  console.log(`IPDOS synthetic rule replay: http://127.0.0.1:${port}/demo`);
}
void bootstrap();
