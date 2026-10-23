import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { DbService } from '../utils/database';
import { VALIDACIONES_ABANDONADAS, VALIDACIONES_RETENCION_VENCIDA } from '../queries/validaciones';
import { ValidacionesService } from './validaciones';

@Injectable()
export class RetencionService {
  private log = new Logger('Retencion');
  constructor(private db: DbService, private validaciones: ValidacionesService) {}

  // Cada 5 minutos: cierra validaciones abandonadas (link o sesión vencidos) y destruye su evidencia parcial.
  @Interval(5 * 60_000)
  async expirar() {
    const filas = await this.db.q(VALIDACIONES_ABANDONADAS);
    for (const r of filas) {
      try { await this.validaciones.suprimir(r, 'sistema', null, 'expiracion'); } catch (e) { this.log.error(`expirar ${r.id}: ${(e as Error).message}`); }
    }
    if (filas.length) this.log.log(`Expiradas: ${filas.length}`);
  }

  // Todos los días 03:15 (UTC): borra la evidencia cuya retención venció.
  @Cron('15 3 * * *')
  async retencion() {
    let total = 0;
    for (;;) {
      const filas = await this.db.q(VALIDACIONES_RETENCION_VENCIDA);
      if (!filas.length) break;
      for (const r of filas) {
        try { await this.validaciones.suprimir(r, 'sistema', null, 'retencion'); total++; } catch (e) { this.log.error(`retención ${r.id}: ${(e as Error).message}`); return; }
      }
    }
    if (total) this.log.log(`Retención vencida, eliminadas: ${total}`);
  }
}
