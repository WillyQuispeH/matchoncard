// Crea (o rota) un cliente de la API. Uso: yarn cliente:crear <id> "<nombre>" [roles separados por coma]
// Ej.: yarn cliente:crear portalfirma "Portalfirma" integracion,auditor,dpo
// Imprime el secreto JWT y el secreto de webhook UNA sola vez: guárdalos en el gestor de secretos de Portalfirma.
import { randomBytes } from 'crypto';
import { Client } from 'pg';
import { CriptoService } from '../utils/cripto';
import { conexionDb } from '../utils/conexion-db';

async function main() {
  const [id, nombre, roles = 'integracion'] = process.argv.slice(2);
  if (!id || !nombre) throw new Error('Uso: crear-cliente <id> "<nombre>" [roles]');
  const validos = ['integracion', 'auditor', 'dpo'];
  const rs = roles.split(',').map((r) => r.trim()).filter(Boolean);
  if (rs.some((r) => !validos.includes(r))) throw new Error(`Roles válidos: ${validos.join(', ')}`);
  const cripto = new CriptoService();
  const secreto = randomBytes(32).toString('base64url'), webhook = randomBytes(32).toString('base64url');
  const c = new Client(conexionDb());
  await c.connect();
  await c.query(
    `insert into clientes (id, nombre, secreto_cifrado, webhook_secreto_cifrado, roles) values ($1,$2,$3,$4,$5)
     on conflict (id) do update set nombre = excluded.nombre, secreto_cifrado = excluded.secreto_cifrado, webhook_secreto_cifrado = excluded.webhook_secreto_cifrado, roles = excluded.roles, activo = true`,
    [id, nombre, cripto.envolver(Buffer.from(secreto)), cripto.envolver(Buffer.from(webhook)), rs]);
  await c.end();
  console.log(JSON.stringify({ id, roles: rs, secreto_jwt: secreto, secreto_webhook: webhook }, null, 2));
}
main().catch((e) => { console.error(e.message); process.exit(1); });
