import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { config } from '../utils/config';
import { Entrega, ResultadoEntrega } from '../interfaces/webhook';

const FIRMA = /^sha256=[0-9a-f]{64}$/;

// Envía al cliente el webhook que arma y firma la API. No guarda nada: el resultado vuelve a la API,
// que lo registra en la cola y decide los reintentos.
@Injectable()
export class EmisorService {
  private log = new Logger('Webhooks');

  async entregar(e: Entrega): Promise<ResultadoEntrega> {
    this.validar(e);
    try {
      const r = await fetch(e.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-V3P-Evento': e.evento, 'X-V3P-Entrega': e.id, 'X-V3P-Firma': e.firma },
        body: e.cuerpo,
        signal: AbortSignal.timeout(config.timeoutMs),
        redirect: 'error',
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return { ok: true };
    } catch (err) {
      const error = (err as Error).message;
      this.log.warn(`Webhook ${e.id} a ${new URL(e.url).host}: ${error}`);
      return { ok: false, error };
    }
  }

  private validar(e: Entrega) {
    const textos = [e?.id, e?.url, e?.evento, e?.cuerpo, e?.firma];
    if (textos.some((t) => typeof t !== 'string' || !t)) throw new BadRequestException('Entrega incompleta');
    if (!FIRMA.test(e.firma)) throw new BadRequestException('Firma con formato inválido');
    let u: URL;
    try { u = new URL(e.url); } catch { throw new BadRequestException('URL inválida'); }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new BadRequestException('La URL debe ser http(s)');
  }
}
