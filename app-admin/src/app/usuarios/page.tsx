import type { Metadata } from 'next';
import { Usuarios } from '@/components/functional/Usuarios/Usuarios';
import { SoloSuperadmin } from '@/components/functional/Shell/SoloSuperadmin';

export const metadata: Metadata = { title: 'Usuarios · MatchOnCard Admin' };

export default function Page() {
  return <SoloSuperadmin><Usuarios /></SoloSuperadmin>;
}
