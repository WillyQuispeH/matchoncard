import type { Metadata } from 'next';
import { Documentacion } from '@/components/functional/Integracion/Documentacion';

export const metadata: Metadata = {
  title: 'API e integración · MatchOnCard',
  description: 'Documentación de la API de MatchOnCard: validaciones de identidad, firma de documentos, webhooks y colección Postman.',
  openGraph: { title: 'API e integración · MatchOnCard', url: 'https://matchoncard.cl/integracion' },
};

export default function Page() {
  return <Documentacion />;
}
