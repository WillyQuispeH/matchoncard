import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { config } from '../utils/config';
import { DbService } from '../utils/database';
import { TAM_PAGINA } from '../data/panel';
import * as Q from '../queries/admin';
import { AuditoriaService } from './auditoria';
import { WebhooksService } from './webhooks';

// Cola de webhooks: revisar, reintentar o descartar. La entrega la hace WebhooksService a través de api-webhook.
@Injectable()
export class AdminWebhooksService {
  constructor(private db: DbService, private audit: AuditoriaService, private webhooks: WebhooksService) {}

  async listar(f: { estado?: string; cliente?: string; pagina?: number }) {
    const params: unknown[] = [config.webhooks.maxIntentos];
    let where = 'true';
    if (f.estado) { params.push(f.estado); where += ` and (${Q.ESTADO_WEBHOOK}) = $${params.length}`; }
    if (f.cliente) { params.push(f.cliente); where += ` and w.cliente_id = $${params.length}`; }
    const pagina = Math.max(1, f.pagina || 1);
    const [total, filas, resumen] = await Promise.all([
      this.db.uno(Q.contarWebhooks(where), params),
      this.db.q(Q.listarWebhooks(where, TAM_PAGINA, (pagina - 1) * TAM_PAGINA), params),
      this.db.q(Q.RESUMEN_WEBHOOKS, [config.webhooks.maxIntentos]),
    ]);
    return { total: total!.n, pagina, tam: TAM_PAGINA, resumen, filas };
  }

  async detalle(id: number) {
    const w = await this.db.uno(Q.WEBHOOK, [config.webhooks.maxIntentos, id]);
    if (!w) throw new NotFoundException('Webhook no encontrado');
    return w;
  }

  async reintentar(id: number, actor: string, ip: string) {
    const w = await this.detalle(id);
    if (!['pendiente', 'fallido'].includes(w.estado)) throw new ConflictException(`El webhook está ${w.estado}`);
    await this.db.q(Q.REINTENTAR_WEBHOOK, [id]);
    this.webhooks.despertar();
    await this.audit.registrar('webhook.reintentado', actor, w.validacion_id, ip, { webhook_id: id, intentos_previos: w.intentos });
    return { id, estado: 'pendiente' };
  }

  async descartar(id: number, actor: string, ip: string) {
    const w = await this.detalle(id);
    if (!['pendiente', 'fallido'].includes(w.estado)) throw new ConflictException(`El webhook está ${w.estado}`);
    await this.db.q(Q.DESCARTAR_WEBHOOK, [id, actor]);
    await this.audit.registrar('webhook.descartado', actor, w.validacion_id, ip, { webhook_id: id });
    return { id, estado: 'descartado' };
  }
}
