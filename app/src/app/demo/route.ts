import { paginaCaptura } from '@/utils/captura';

// Demo: la misma app de captura sin token (no se conecta a la API ni guarda nada).
export const dynamic = 'force-dynamic';

export function GET() {
  return paginaCaptura(false);
}
