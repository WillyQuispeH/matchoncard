import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

// Claves del panel: scrypt con sal propia, formato "scrypt$N$r$p$sal$hash".
const scrypt = promisify(scryptCb) as (p: string, s: Buffer, l: number, o: object) => Promise<Buffer>;
const N = 32768, R = 8, P = 1;

export async function hashClave(clave: string): Promise<string> {
  const salt = randomBytes(16);
  const h = await scrypt(clave, salt, 32, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${h.toString('base64')}`;
}

export async function verificarClave(clave: string, guardado: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = guardado.split('$');
  if (alg !== 'scrypt') return false;
  const esperado = Buffer.from(hash, 'base64');
  const h = await scrypt(clave, Buffer.from(salt, 'base64'), esperado.length, { N: +n, r: +r, p: +p, maxmem: 64 * 1024 * 1024 });
  return h.length === esperado.length && timingSafeEqual(h, esperado);
}
