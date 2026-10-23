import { create } from 'zustand';
import { auditoriaService } from '../services/auditoria.service';
import type { IFiltroAuditoria, IListaAuditoria } from '../interfaces/auditoria.interface';
import type { IEstadoSistema } from '../interfaces/estado.interface';
import type { IEstadoCarga } from '../interfaces/response.interface';
import { INICIAL, ejecutar } from './estado';

const SIN_FILTRO: IFiltroAuditoria = { desde: '', hasta: '', actor: '', accion: '', validacion_id: '', ip: '', pagina: 1 };

interface AuditoriaState {
  lista: IListaAuditoria | null;
  filtro: IFiltroAuditoria;
  acciones: string[];
  sistema: IEstadoSistema | null;
  estadoLista: IEstadoCarga;
  estadoSistema: IEstadoCarga;
  auditoriaListar: () => Promise<void>;
  auditoriaFiltrar: (f: Partial<IFiltroAuditoria>) => Promise<void>;
  auditoriaLimpiar: () => Promise<void>;
  auditoriaAcciones: () => Promise<void>;
  auditoriaEstado: () => Promise<void>;
}

export const useAuditoriaStore = create<AuditoriaState>((set, get) => ({
  lista: null,
  filtro: SIN_FILTRO,
  acciones: [],
  sistema: null,
  estadoLista: INICIAL,
  estadoSistema: INICIAL,

  auditoriaListar: async () => {
    const r = await ejecutar<AuditoriaState, IListaAuditoria>(set, 'estadoLista', async () => (await auditoriaService.listar(get().filtro)).data);
    if (r) set({ lista: r });
  },
  auditoriaFiltrar: async (f) => {
    set({ filtro: { ...get().filtro, pagina: 1, ...f } });
    await get().auditoriaListar();
  },
  auditoriaLimpiar: async () => { set({ filtro: SIN_FILTRO }); await get().auditoriaListar(); },
  auditoriaAcciones: async () => {
    try { set({ acciones: (await auditoriaService.acciones()).data }); } catch { /* el filtro por acción es opcional */ }
  },
  auditoriaEstado: async () => {
    const r = await ejecutar<AuditoriaState, IEstadoSistema>(set, 'estadoSistema', async () => (await auditoriaService.estado()).data);
    if (r) set({ sistema: r });
  },
}));
