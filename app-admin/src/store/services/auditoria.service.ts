import { api } from '@/utils/api';
import type { IFiltroAuditoria, IListaAuditoria } from '../interfaces/auditoria.interface';
import type { IEstadoSistema } from '../interfaces/estado.interface';

export const auditoriaService = {
  // solo se envían los filtros con valor; las fechas del formulario (día) se pasan a ISO
  listar: (f: IFiltroAuditoria) => {
    const params: Record<string, string | number> = { pagina: f.pagina };
    if (f.desde) params.desde = new Date(`${f.desde}T00:00:00`).toISOString();
    if (f.hasta) params.hasta = new Date(`${f.hasta}T23:59:59`).toISOString();
    for (const k of ['actor', 'accion', 'validacion_id', 'ip'] as const) if (f[k].trim()) params[k] = f[k].trim();
    return api.get<IListaAuditoria>('/auditoria', { params });
  },
  acciones: () => api.get<string[]>('/auditoria/acciones'),
  estado: () => api.get<IEstadoSistema>('/estado'),
};
