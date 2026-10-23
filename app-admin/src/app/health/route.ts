import type { NextRequest } from 'next/server';
import { reenviar } from '@/utils/proxy';

export const dynamic = 'force-dynamic';
export const GET = (req: NextRequest) => reenviar(req);
