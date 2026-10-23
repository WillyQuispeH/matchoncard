import type { Metadata } from 'next';
import { Webhooks } from '@/components/functional/Webhooks/Webhooks';

export const metadata: Metadata = { title: 'Webhooks · MatchOnCard Admin' };

export default function Page() {
  return <Webhooks />;
}
