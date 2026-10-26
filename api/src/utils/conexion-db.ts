import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import type { ClientConfig } from 'pg';

dotenv.config();

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

// admin = true: usa DB_ADMIN_USER / DB_ADMIN_PASSWORD si están definidos (migraciones y creación de usuarios);
// la API y el resto de los scripts usan DB_USER, un usuario sin permisos de DDL.
export function conexionDb(admin = false): ClientConfig {
  const comoAdmin = admin && !!process.env.DB_ADMIN_USER;
  return {
    host: req('DB_HOST'),
    port: Number(process.env.DB_PORT || 5432),
    user: comoAdmin ? req('DB_ADMIN_USER') : req('DB_USER'),
    password: comoAdmin ? req('DB_ADMIN_PASSWORD') : req('DB_PASSWORD'),
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
