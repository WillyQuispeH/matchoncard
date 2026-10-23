import 'server-only';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

// Fase 1: la app de captura (FPEngine + SigEngine + interfaz) se sirve TAL CUAL desde legacy/.
// La fase 2 la pasará a componentes sin tocar los motores.

// ruta estática: así Next la incluye en el build standalone
const RUTA = join(process.cwd(), 'legacy', 'validacion_3_pasos.html');
let cache: { mtime: number; html: string } | null = null;

async function html(): Promise<string> {
  const m = (await stat(RUTA)).mtimeMs;
  if (!cache || cache.mtime !== m) cache = { mtime: m, html: await readFile(RUTA, 'utf8') };
  return cache.html;
}

export async function paginaCaptura(conToken: boolean): Promise<Response> {
  return new Response(await html(), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': conToken ? 'no-store' : 'no-cache',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      // con token: no debe filtrarse a las CDN de los motores
      'Referrer-Policy': conToken ? 'no-referrer' : 'strict-origin-when-cross-origin',
      ...(conToken ? { 'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()' } : {}),
    },
  });
}
