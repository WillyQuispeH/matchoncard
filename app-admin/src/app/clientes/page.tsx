import type { Metadata } from 'next';
import { Clientes } from '@/components/functional/Clientes/Clientes';
import { SoloSuperadmin } from '@/components/functional/Shell/SoloSuperadmin';

export const metadata: Metadata = { title: 'Clientes · MatchOnCard Admin' };

export default function Page() {
  return <SoloSuperadmin><Clientes /></SoloSuperadmin>;
}
