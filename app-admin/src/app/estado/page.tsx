import type { Metadata } from 'next';
import { Estado } from '@/components/functional/Estado/Estado';

export const metadata: Metadata = { title: 'Estado · MatchOnCard Admin' };

export default function Page() {
  return <Estado />;
}
