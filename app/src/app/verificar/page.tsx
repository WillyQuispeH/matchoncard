import type { Metadata } from 'next';
import { Verificar } from '@/components/functional/Verificar/Verificar';

export const metadata: Metadata = {
  title: 'Verificar documento · MatchOnCard',
  description: 'Comprueba si un PDF firmado con MatchOnCard está íntegro y quién lo firmó.',
};

export default function Page() {
  return <Verificar />;
}
