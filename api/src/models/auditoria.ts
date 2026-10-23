import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../utils/database';
import { INSERTAR_AUDITORIA } from '../queries/auditoria';

@Injectable()
export class AuditoriaService {
  private log = new Logger('Auditoria');
  constructor(private db: DbService) {}

  async registrar(accion: string, actor: string, validacionId: string | null, ip: string | null, detalle?: Record<string, unknown>) {
    try {
      await this.db.q(INSERTAR_AUDITORIA, [validacionId, actor, accion, ip, detalle ?? null]);
    } catch (e) {
      // la auditoría no debe perderse en silencio: queda en el log del proceso (sin datos personales)
      this.log.error(`No se pudo registrar ${accion} de ${validacionId}: ${(e as Error).message}`);
      throw e;
    }
  }
}
