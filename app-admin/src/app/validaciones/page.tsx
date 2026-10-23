import type { Metadata } from 'next';
import { Validaciones } from '@/components/functional/Validaciones/Validaciones';

export const metadata: Metadata = { title: 'Validaciones · MatchOnCard Admin' };

export default function Page() {
  return <Validaciones />;
}
