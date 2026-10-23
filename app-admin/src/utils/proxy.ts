import 'server-only';
import type { NextRequest } from 'next/server';
import { config } from './config';

// Reenvía la solicitud tal cual a la API interna (mismo camino y query), por streaming:
// sin límite de tamaño (PDF de hasta 36 MB), con las cookies, la IP del visitante y las cabeceras de la API.

// cabeceras que no se reenvían (salto a salto, o que fetch recalcula)
const FUERA = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-connection', 'te', 'trailer', 'host', 'content-length']);
const FUERA_RESPUESTA = new Set([...FUERA, 'content-encoding']);   // fetch ya descomprimió el cuerpo

export async function reenviar(req: NextRequest): Promise<Response> {
  const destino = `${config.apiInterna}${req.nextUrl.pathname}${req.nextUrl.search}`;
  const cabeceras = new Headers();
  req.headers.forEach((v, k) => { if (!FUERA.has(k)) cabeceras.set(k, v); });
  // El proxy del servidor (nginx) manda la IP real en X-Forwarded-For; la API confía en los saltos de la red de Docker.
  cabeceras.set('x-forwarded-proto', req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', ''));
  cabeceras.set('x-forwarded-host', req.headers.get('host') || '');

  const conCuerpo = !['GET', 'HEAD'].includes(req.method);
  let r: Response;
  try {
    r = await fetch(destino, {
      method: req.method,
      headers: cabeceras,
      body: conCuerpo ? req.body : undefined,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(130_000),   // la firma de un PDF puede tardar
      // @ts-expect-error: necesario en Node para enviar un cuerpo en streaming
      duplex: conCuerpo ? 'half' : undefined,
    });
  } catch {
    return Response.json({ statusCode: 502, message: 'El servicio no está disponible. Intenta en unos minutos.' }, { status: 502 });
  }

  const salida = new Headers();
  r.headers.forEach((v, k) => { if (!FUERA_RESPUESTA.has(k) && k !== 'set-cookie') salida.set(k, v); });
  for (const c of r.headers.getSetCookie()) salida.append('set-cookie', c);
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: salida });
}
