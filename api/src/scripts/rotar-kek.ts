// Rotación de la clave maestra (KEK): re-envuelve DEKs y secretos de clientes con la KEK actual.
// Pasos: 1) KEK_PREVIOUS="k1:<vieja>" KEK_ID=k2 KEK_BASE64=<nueva> en api/.env Y api-webhook/.env  2) yarn kek:rotar  3) reiniciar api y api-webhook  4) quitar KEK_PREVIOUS de ambos.
import { Client } from 'pg';
import { CriptoService } from '../utils/cripto';
import { config } from '../utils/config';
import { conexionDb } from '../utils/conexion-db';

async function main() {
  const cripto = new CriptoService();
  const c = new Client(conexionDb());
  await c.connect();
  let n = 0;
  const re = (v: string) => (cripto.kekDe(v) === config.kek.id ? v : cripto.envolver(cripto.desenvolver(v)));
  for (const r of (await c.query('select id, dek_envuelta from validaciones where dek_envuelta is not null')).rows) {
    const nv = re(r.dek_envuelta); if (nv !== r.dek_envuelta) { await c.query('update validaciones set dek_envuelta = $2 where id = $1', [r.id, nv]); n++; }
  }
  for (const r of (await c.query('select id, secreto_cifrado, webhook_secreto_cifrado from clientes')).rows) {
    await c.query('update clientes set secreto_cifrado = $2, webhook_secreto_cifrado = $3 where id = $1', [r.id, re(r.secreto_cifrado), re(r.webhook_secreto_cifrado)]);
  }
  await c.end();
  console.log(`Re-envueltas ${n} claves de evidencia con ${config.kek.id}.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
