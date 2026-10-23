import type { Metadata } from 'next';
import { Landing } from '@/components/functional/Landing/Landing';

export const metadata: Metadata = {
  openGraph: {
    title: 'MatchOnCard · Validación de identidad con la cédula',
    description: 'Huella, rostro y firma contra la cédula, desde el teléfono. Prueba la demo.',
    url: 'https://matchoncard.cl/',
  },
};

export default function Page() {
  return <Landing />;
}
