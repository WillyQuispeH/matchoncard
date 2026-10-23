import 'dotenv/config';      // primero: el .env debe estar cargado antes de que cualquier módulo lea process.env
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app';
import { config } from './utils/config';

// Servicio interno: no recibe tráfico de Internet. Solo la API lo llama (/entregar y /health).
async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['log', 'warn', 'error'] });
  app.disable('x-powered-by');
  app.enableShutdownHooks();
  await app.listen(config.puerto, process.env.HOST || '127.0.0.1');
  new Logger('API-WEBHOOK').log(`api-webhook escuchando en ${process.env.HOST || '127.0.0.1'}:${config.puerto}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
