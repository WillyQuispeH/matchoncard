import type { Metadata } from 'next';
import { FirmaPublica } from '@/components/functional/Verificar/FirmaPublica';
import { config } from '@/utils/config';
import type { IFirmaPublica } from '@/store/interfaces/verificacion.interface';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Verificar firma · MatchOnCard',
  description: 'Resultado de la validación de identidad de una firma hecha con MatchOnCard.',
  robots: { index: false, follow: false },
};

// Destino del QR de la estampa: el servidor consulta la API y muestra el resumen de esa firma.
async function buscar(id: string): Promise<IFirmaPublica | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  try {
    const r = await fetch(`${config.apiInterna}/verificar/${id}`, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FirmaPublica firma={await buscar(id)} />;
}
