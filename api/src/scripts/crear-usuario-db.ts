// Crea (o rota la contraseña de) usuarios de base de datos para la API, sin permisos de administrador.
// Uso: yarn db:usuario <usuario> [usuario2 ...]      Ej.: yarn db:usuario matchoncard_app matchoncard_dev
// Se conecta como administrador (DB_ADMIN_USER si está definido, si no DB_USER).
// Permisos: leer y escribir datos en todas las tablas (también las que creen migraciones futuras),
// sin DDL ni cambios de permisos, y auditoria de solo inserción.
// Imprime cada contraseña UNA sola vez: guárdala en el .env que corresponda.
import { randomBytes } from 'crypto';
import { Client } from 'pg';
import { conexionDb } from '../utils/conexion-db';

async function main() {
  const usuarios = process.argv.slice(2);
  if (!usuarios.length) throw new Error('Uso: crear-usuario-db <usuario> [usuario2 ...]');
  for (const u of usuarios) if (!/^[a-z_][a-z0-9_]{2,40}$/.test(u)) throw new Error(`Nombre de usuario inválido: ${u}`);

  const cfg = conexionDb(true);
  const c = new Client(cfg);
  await c.connect();
  const db = (await c.query('select current_database() as db')).rows[0].db as string;
  const salida: { usuario: string; password: string; nuevo: boolean }[] = [];
  try {
    for (const u of usuarios) {
      const password = randomBytes(24).toString('base64url');
      const existe = (await c.query('select 1 from pg_roles where rolname = $1', [u])).rowCount;
      // CREATE/ALTER ROLE no admiten parámetros: el nombre ya se validó y la contraseña es base64url
      await c.query(existe ? `alter role ${u} with login password '${password}'` : `create role ${u} with login password '${password}'`);
      for (const sql of [
        `grant connect on database "${db}" to ${u}`,
        `grant usage on schema public to ${u}`,
        `grant select, insert, update, delete on all tables in schema public to ${u}`,
        `grant usage, select on all sequences in schema public to ${u}`,
        `alter default privileges for role ${cfg.user} in schema public grant select, insert, update, delete on tables to ${u}`,
        `alter default privileges for role ${cfg.user} in schema public grant usage, select on sequences to ${u}`,
        `revoke update, delete, truncate on auditoria from ${u}`,
      ]) await c.query(sql);
      salida.push({ usuario: u, password, nuevo: !existe });
    }
  } finally {
    await c.end();
  }
  console.log(JSON.stringify(salida, null, 2));
}
main().catch((e) => { console.error(e.message); process.exit(1); });
