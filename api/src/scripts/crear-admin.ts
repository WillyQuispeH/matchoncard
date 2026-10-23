// Crea o cambia la clave de un usuario del panel. La clave se pasa por variable de entorno para que no quede
// en el historial ni en la pantalla:
//   read -rsp "Clave: " C; echo; docker compose run --rm --no-deps -e ADMIN_CLAVE="$C" api node /app/dist/scripts/crear-admin.js admin [--rol=operador]; unset C
// Sirve para crear el PRIMER superadmin; los demás usuarios se gestionan desde app-admin (Usuarios).
// Desactivar:  docker compose run --rm --no-deps api node /app/dist/scripts/crear-admin.js admin --desactivar
import { Client } from 'pg';
import { hashClave } from '../utils/claves';
import { conexionDb } from '../utils/conexion-db';

async function main() {
  const [usuario, opcion] = process.argv.slice(2);
  if (!usuario || !/^[a-zA-Z0-9._-]{3,40}$/.test(usuario)) throw new Error('Uso: crear-admin <usuario> [--rol=superadmin|operador] [--desactivar]');
  const rol = opcion?.startsWith('--rol=') ? opcion.slice(6) : 'superadmin';
  if (!['superadmin', 'operador'].includes(rol)) throw new Error('Rol inválido: superadmin u operador');
  const c = new Client(conexionDb());
  await c.connect();
  if (opcion === '--desactivar') {
    await c.query('update admins set activo = false where usuario = $1', [usuario]);
    await c.query('delete from admin_sesiones where usuario = $1', [usuario]);
    console.log(`Usuario ${usuario} desactivado.`);
  } else {
    const clave = process.env.ADMIN_CLAVE || '';
    if (clave.length < 12) throw new Error('La clave debe tener al menos 12 caracteres.');
    await c.query(
      `insert into admins (usuario, clave_hash, rol) values ($1, $2, $3)
       on conflict (usuario) do update set clave_hash = excluded.clave_hash, rol = excluded.rol, activo = true, intentos_fallidos = 0, bloqueado_hasta = null`,
      [usuario, await hashClave(clave), rol]);
    await c.query('delete from admin_sesiones where usuario = $1', [usuario]); // cierra sesiones abiertas al cambiar la clave
    console.log(`Usuario ${usuario} (${rol}) listo. Entra en https://admin.matchoncard.cl`);
  }
  await c.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
