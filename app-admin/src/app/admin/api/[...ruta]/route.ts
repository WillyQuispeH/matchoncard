import type { NextRequest } from 'next/server';
import { reenviar } from '@/utils/proxy';

// Proxy a la API de administración (mismo origen: la cookie httpOnly viaja sola).
export const dynamic = 'force-dynamic';
const proxy = (req: NextRequest) => reenviar(req);

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
