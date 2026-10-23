import type { NextRequest } from 'next/server';
import { paginaCaptura } from '@/utils/captura';

// Link real de validación: el token lo lee la propia página desde la URL.
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{30,64}$/.test(token)) {
    return new Response('Enlace no válido', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
  return paginaCaptura(true);
}
