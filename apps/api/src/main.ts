import './config/load-env';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const webDistPath = resolve(__dirname, '../../..', 'apps/web/dist');
  const webIndexPath = join(webDistPath, 'index.html');
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: resolveCorsOrigin(),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  if (existsSync(webIndexPath)) {
    app.useStaticAssets(webDistPath);
    const server = app.getHttpAdapter().getInstance();
    server.get(/^\/(?!api(?:\/|$)).*/, (_request, response) => {
      response.sendFile(webIndexPath);
    });
  }

  await app.listen(Number(process.env.PORT) || 3000);
}

function resolveCorsOrigin() {
  const configuredOrigin = process.env.FRONTEND_URL?.trim();

  if (!configuredOrigin) {
    return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }

  if (configuredOrigin === '*') {
    return true;
  }

  return configuredOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

void bootstrap();
