import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { config } from '../utils/config';

// Las páginas llegan por el mismo origen (app → api), así que CORS va apagado salvo que se defina CORS_ORIGINS.
export const allowedOrigins = (): CorsOptions | null =>
  config.captura.origenesCors.length ? { origin: config.captura.origenesCors, methods: ['GET', 'POST', 'DELETE'] } : null;
