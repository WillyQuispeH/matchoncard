import 'dotenv/config';      // primero: el .env debe estar cargado antes de que cualquier módulo lea process.env
import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, raw } from 'express';
import { AppModule } from './app';
import { config } from './utils/config';
import { setSecurityHeaders } from './middlewares/setSecurityHeaders';
import { allowedOrigins } from './middlewares/allowedOrigins';

async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['log', 'warn', 'error'] });
  app.set('trust proxy', process.env.TRUST_PROXY || 'loopback, uniquelocal'); // detrás de "app" (nginx en la red de Docker): la IP real viene en X-Forwarded-For
  app.disable('x-powered-by');
  app.use(setSecurityHeaders());
  app.use('/v1/documentos', json({ limit: '36mb' }));                           // PDF en base64 (máx. 25 MB)
  app.use('/admin/api/documentos', json({ limit: '36mb' }));
  app.use('/verificar/api', raw({ type: 'application/pdf', limit: '26mb' }));   // verificación pública: PDF crudo
  app.use(json({ limit: '256kb' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const cors = allowedOrigins();
  if (cors) app.enableCors(cors);
  app.enableShutdownHooks();
  await app.listen(config.puerto, process.env.HOST || '127.0.0.1');
  new Logger('API').log(`API escuchando en ${process.env.HOST || '127.0.0.1'}:${config.puerto} · pública ${config.urlPublica}`);
  if (config.adminSinLogin) new Logger('API').warn('ADMIN_SIN_LOGIN activo: app-admin entra como superadmin sin clave');
}
main().catch((e) => { console.error(e); process.exit(1); });
