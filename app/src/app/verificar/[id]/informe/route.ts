import type { NextRequest } from 'next/server';
import { reenviar } from '@/utils/proxy';

// Proxy a la API: descarga del informe de validación completo de una firma (destino del QR de la estampa).
export const dynamic = 'force-dynamic';
const proxy = (req: NextRequest) => reenviar(req);

export { proxy as GET };
