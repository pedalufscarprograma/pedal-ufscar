process.env.TZ = 'America/Sao_Paulo';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'uploads')),
  );

  const port = process.env.PORT || 3000;

  await app.listen(port, '0.0.0.0');
}

bootstrap();