// Aplica sql/schema.sql (idempotente). Uso: yarn migrar
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from 'pg';
import { conexionDb } from '../utils/conexion-db';

async function main() {
  const c = new Client(conexionDb());
  await c.connect();
  await c.query(readFileSync(resolve(__dirname, '../../sql/schema.sql'), 'utf8'));
  // Auditoría de solo inserción: si se define DB_APP_USER, se le quitan UPDATE/DELETE sobre auditoria.
  if (process.env.DB_APP_USER) await c.query(`revoke update, delete, truncate on auditoria from ${process.env.DB_APP_USER.replace(/[^a-zA-Z0-9_]/g, '')}`);
  await c.end();
  console.log('Esquema aplicado.');
}
main().catch((e) => { console.error(e); process.exit(1); });
