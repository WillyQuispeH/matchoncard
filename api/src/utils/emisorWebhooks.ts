import { Injectable, Logger } from '@nestjs/common';
import { config } from './config';
import { ESPERA_EMISOR_MS } from '../data/webhooks';
import { EntregaWebhook, ResultadoEntrega } from '../interfaces/webhook';

// Cliente del servicio interno api-webhook: hace la llamada HTTP al cliente y responde si llegó.
@Injectable()
export class EmisorWebhooksClient {
  private log = new Logger('EmisorWebhooks');
  private url = config.webhooks.servicioUrl;

  // null: api-webhook no respondió (el webhook vuelve a la cola sin gastar un intento)
  async entregar(e: EntregaWebhook): Promise<ResultadoEntrega | null> {
    let r: Response;
    try {
      r = await fetch(`${this.url}/entregar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e), signal: AbortSignal.timeout(ESPERA_EMISOR_MS) });
    } catch (err) {
      this.log.error(`entregar ${e.id}: ${(err as Error).message}`);
      return null;
    }
    if (r.status >= 500) return null;
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: `api-webhook rechazó la entrega: ${j.message || `HTTP ${r.status}`}` };
    return { ok: !!j.ok, error: j.error };
  }

  async salud(): Promise<{ ok: boolean } | null> {
    try { const r = await fetch(`${this.url}/health`, { signal: AbortSignal.timeout(5000) }); return r.ok ? await r.json() : null; } catch { return null; }
  }
}
