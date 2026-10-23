import { Injectable } from '@nestjs/common';
import { DbService } from '../utils/database';
import { TAM_PAGINA } from '../data/panel';
import * as Q from '../queries/admin';

// Buscador del registro de auditoría (solo lectura)
@Injectable()
export class AdminAuditoriaService {
  constructor(private db: DbService) {}

  async listar(f: { desde?: string; hasta?: string; actor?: string; accion?: string; validacion_id?: string; ip?: string; pagina?: number }) {
    const params: unknown[] = [];
    const conds: string[] = [];
    const agregar = (sql: string, v: unknown) => { params.push(v); conds.push(sql.replace('?', `$${params.length}`)); };
    if (f.desde) agregar('en >= ?', f.desde);
    if (f.hasta) agregar('en <= ?', f.hasta);
    if (f.actor) agregar('actor ilike ?', `%${f.actor}%`);
    if (f.accion) agregar('accion = ?', f.accion);
    if (f.validacion_id) agregar('validacion_id = ?', f.validacion_id);
    if (f.ip) agregar('ip = ?', f.ip);
    const pagina = Math.max(1, f.pagina || 1);
    // se pide una fila de más para saber si hay página siguiente (contar toda la auditoría sería lento)
    const filas = await this.db.q(Q.listarAuditoria(conds.join(' and ') || 'true', TAM_PAGINA + 1, (pagina - 1) * TAM_PAGINA), params);
    return { pagina, tam: TAM_PAGINA, hay_mas: filas.length > TAM_PAGINA, filas: filas.slice(0, TAM_PAGINA) };
  }

  acciones() {
    return this.db.q<{ accion: string }>(Q.ACCIONES_AUDITORIA).then((r) => r.map((x) => x.accion));
  }
}
