import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import type { ClientConfig } from 'pg';

dotenv.config();

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

export function conexionDb(): ClientConfig {
  return {
    host: req('DB_HOST'),
    port: Number(process.env.DB_PORT || 5432),
    user: req('DB_USER'),
    password: req('DB_PASSWORD'),
    database: req('DB_NAME'),
    ssl: process.env.DATABASE_SSL === 'true'
      ? {
        rejectUnauthorized: true,
        ca: process.env.DATABASE_CA_PATH ? readFileSync(process.env.DATABASE_CA_PATH, 'utf8') : undefined,
        servername: process.env.DATABASE_SSL_SERVERNAME || undefined,
      }
      : undefined,
  };
}
