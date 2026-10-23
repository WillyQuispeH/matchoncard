import type { Metadata } from 'next';
import { Auditoria } from '@/components/functional/Auditoria/Auditoria';

export const metadata: Metadata = { title: 'Auditoría · MatchOnCard Admin' };

export default function Page() {
  return <Auditoria />;
}
