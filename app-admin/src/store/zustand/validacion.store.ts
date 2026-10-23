import { create } from 'zustand';
import { validacionService } from '../services/validacion.service';
import type { IFiltroValidaciones, IListaValidaciones, INuevaValidacion, IResumen, IValidacionCreada, IValidacionDetalle } from '../interfaces/validacion.interface';
import type { IOperacion } from '../interfaces/operacion.interface';
import type { IEstadoCarga } from '../interfaces/response.interface';
import { INICIAL, ejecutar } from './estado';

interface ValidacionState {
  resumen: IResumen | null;
  lista: IListaValidaciones | null;
  filtro: IFiltroValidaciones;
  detalle: IValidacionDetalle | null;
  operacion: IOperacion | null;
  estadoLista: IEstadoCarga;
  estadoDetalle: IEstadoCarga;
  estadoOperacion: IEstadoCarga;
  estadoAccion: IEstadoCarga;     // crear, informe, evidencia, borrar
  validacionResumen: () => Promise<void>;
  validacionListar: () => Promise<void>;
  validacionFiltrar: (f: Partial<IFiltroValidaciones>) => Promise<void>;
  validacionDetalle: (id: string) => Promise<void>;
  validacionCrear: (d: INuevaValidacion) => Promise<IValidacionCreada | null>;
  validacionInforme: (id: string) => Promise<{ blob: Blob; folio: string } | null>;
  validacionEvidencia: (id: string, motivo: string) => Promise<Blob | null>;
  validacionBorrar: (id: string, motivo: string) => Promise<boolean>;
  validacionLimpiarAccion: () => void;
  validacionCerrar: () => void;
}

export const useValidacionStore = create<ValidacionState>((set, get) => ({
  resumen: null,
  lista: null,
  filtro: { estado: '', rut: '', pagina: 1 },
  detalle: null,
  operacion: null,
  estadoLista: INICIAL,
  estadoDetalle: INICIAL,
  estadoOperacion: INICIAL,
  estadoAccion: INICIAL,

  validacionResumen: async () => {
    try { set({ resumen: (await validacionService.resumen()).data }); } catch { /* el resumen es secundario */ }
  },
  validacionListar: async () => {
    const r = await ejecutar<ValidacionState, IListaValidaciones>(set, 'estadoLista', async () => (await validacionService.listar(get().filtro)).data);
    if (r) set({ lista: r });
  },
  validacionFiltrar: async (f) => {
    set({ filtro: { ...get().filtro, pagina: 1, ...f } });
    await Promise.all([get().validacionListar(), get().validacionResumen()]);
  },
  validacionDetalle: async (id) => {
    if (get().detalle?.validacion_id !== id) set({ detalle: null, operacion: null, estadoOperacion: INICIAL });
    const d = await ejecutar<ValidacionState, IValidacionDetalle>(set, 'estadoDetalle', async () => (await validacionService.detalle(id)).data);
    if (!d) return;
    set({ detalle: d });
    // la revisión de los 3 factores abre la evidencia cifrada (queda auditado)
    if (d.tiene_evidencia) {
      const o = await ejecutar<ValidacionState, IOperacion>(set, 'estadoOperacion', async () => (await validacionService.operacion(id)).data);
      if (o && get().detalle?.validacion_id === id) set({ operacion: o });
    }
  },
  validacionCrear: async (d) => {
    const r = await ejecutar<ValidacionState, IValidacionCreada>(set, 'estadoAccion', async () => (await validacionService.crear(d)).data);
    if (r) void get().validacionFiltrar({});
    return r;
  },
  validacionInforme: async (id) => {
    const r = await ejecutar<ValidacionState, { blob: Blob; folio: string }>(set, 'estadoAccion', async () => {
      const x = await validacionService.informe(id);
      return { blob: x.data, folio: String(x.headers['x-informe-folio'] || 'informe') };
    });
    if (r) void get().validacionDetalle(id);
    return r;
  },
  validacionEvidencia: async (id, motivo) => {
    const r = await ejecutar<ValidacionState, Blob>(set, 'estadoAccion', async () => (await validacionService.evidencia(id, motivo)).data);
    if (r) void get().validacionDetalle(id);
    return r;
  },
  validacionBorrar: async (id, motivo) => {
    const r = await ejecutar<ValidacionState, unknown>(set, 'estadoAccion', async () => (await validacionService.borrar(id, motivo)).data);
    if (r) { void get().validacionDetalle(id); void get().validacionFiltrar({ pagina: get().filtro.pagina }); }
    return !!r;
  },
  validacionLimpiarAccion: () => set({ estadoAccion: INICIAL }),
  validacionCerrar: () => set({ detalle: null, operacion: null, estadoDetalle: INICIAL, estadoOperacion: INICIAL }),
}));
