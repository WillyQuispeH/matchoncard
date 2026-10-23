import type { Metadata } from 'next';
import { Documentos } from '@/components/functional/Documentos/Documentos';

export const metadata: Metadata = { title: 'Documentos · MatchOnCard Admin' };

export default function Page() {
  return <Documentos />;
}
