import { Injectable } from '@nestjs/common';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { config } from '../utils/config';
import { DbService } from '../utils/database';
import { AlmacenService } from '../utils/almacen';
import { FirmadorClient } from '../utils/firmador';
import { EmisorWebhooksClient } from '../utils/emisorWebhooks';
import * as Q from '../queries/admin';

interface Componente { nombre: string; ok: boolean; detalle: string; ms: number }

// Salud de cada pieza del sistema, para la pantalla de estado de app-admin
@Injectable()
export class AdminEstadoService {
  constructor(private db: DbService, private almacen: AlmacenService, private firmador: FirmadorClient, private emisor: EmisorWebhooksClient) {}

  private async medir(nombre: string, fn: () => Promise<string>): Promise<Componente> {
    const t = Date.now();
    try { return { nombre, ok: true, detalle: await fn(), ms: Date.now() - t }; }
    catch (e) { return { nombre, ok: false, detalle: (e as Error).message.slice(0, 200), ms: Date.now() - t }; }
  }

  async estado() {
    const componentes = await Promise.all([
      this.medir('api', async () => `versión ${process.env.npm_package_version || '1.0.0'} · activa hace ${Math.round(process.uptime() / 60)} min`),
      this.medir('base de datos', async () => {
        const r = await this.db.uno(Q.ESTADO_BASE);
        return `PostgreSQL ${r.version} · ${(Number(r.bytes) / 1048576).toFixed(1)} MB`;
      }),
      this.medir('bucket', async () => {
        await this.almacen.r2.send(new HeadBucketCommand({ Bucket: this.almacen.bucket }));
        return `${this.almacen.bucket} accesible`;
      }),
      this.medir('api-signature', async () => {
        const s = await this.firmador.salud();
        if (!s?.ok) throw new Error('No responde');
        return `certificado vence ${String(s.vence).slice(0, 10)}`;
      }),
      this.medir('api-webhook', async () => {
        const s = await this.emisor.salud();
        if (!s?.ok) throw new Error('No responde');
        return 'listo para entregar';
      }),
    ]);
    const webhooks = await this.db.q(Q.RESUMEN_WEBHOOKS, [config.webhooks.maxIntentos]).catch(() => []);
    return { fecha: new Date().toISOString(), ok: componentes.every((c) => c.ok), componentes, webhooks };
  }
}
