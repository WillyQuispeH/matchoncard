import { create } from 'zustand';
import { documentoService } from '../services/documento.service';
import type { IDocumento, IDocumentoCreado, IDocumentoFila, IEnlaceNuevo, INuevoDocumento } from '../interfaces/documento.interface';
import type { IEstadoCarga } from '../interfaces/response.interface';
import { INICIAL, ejecutar } from './estado';

interface DocumentoState {
  lista: IDocumentoFila[] | null;
  detalle: IDocumento | null;
  estadoLista: IEstadoCarga;
  estadoDetalle: IEstadoCarga;
  estadoAccion: IEstadoCarga;     // crear, pdf, enlace, cancelar
  documentoListar: () => Promise<void>;
  documentoDetalle: (id: string) => Promise<void>;
  documentoCrear: (d: INuevoDocumento) => Promise<IDocumentoCreado | null>;
  documentoPdf: (id: string) => Promise<{ blob: Blob; nombre: string } | null>;
  documentoEnlace: (id: string, firmanteId: string) => Promise<IEnlaceNuevo | null>;
  documentoCancelar: (id: string, motivo: string) => Promise<boolean>;
  documentoLimpiarAccion: () => void;
  documentoCerrar: () => void;
}

export const useDocumentoStore = create<DocumentoState>((set, get) => ({
  lista: null,
  detalle: null,
  estadoLista: INICIAL,
  estadoDetalle: INICIAL,
  estadoAccion: INICIAL,

  documentoListar: async () => {
    const r = await ejecutar<DocumentoState, IDocumentoFila[]>(set, 'estadoLista', async () => (await documentoService.listar()).data);
    if (r) set({ lista: r });
  },
  documentoDetalle: async (id) => {
    if (get().detalle?.documento_id !== id) set({ detalle: null });
    const r = await ejecutar<DocumentoState, IDocumento>(set, 'estadoDetalle', async () => (await documentoService.detalle(id)).data);
    if (r) set({ detalle: r });
  },
  documentoCrear: async (d) => {
    const r = await ejecutar<DocumentoState, IDocumentoCreado>(set, 'estadoAccion', async () => (await documentoService.crear(d)).data);
    if (r) void get().documentoListar();
    return r;
  },
  documentoPdf: async (id) =>
    ejecutar<DocumentoState, { blob: Blob; nombre: string }>(set, 'estadoAccion', async () => {
      const x = await documentoService.pdf(id);
      const cd = String(x.headers['content-disposition'] || '');
      return { blob: x.data, nombre: (cd.match(/filename="([^"]+)"/) || [])[1] || 'documento.pdf' };
    }),
  documentoEnlace: async (id, firmanteId) => {
    const r = await ejecutar<DocumentoState, IEnlaceNuevo>(set, 'estadoAccion', async () => (await documentoService.enlace(id, firmanteId)).data);
    if (r) void get().documentoDetalle(id);
    return r;
  },
  documentoCancelar: async (id, motivo) => {
    const r = await ejecutar<DocumentoState, IDocumento>(set, 'estadoAccion', async () => (await documentoService.cancelar(id, motivo)).data);
    if (r) { set({ detalle: r }); void get().documentoListar(); }
    return !!r;
  },
  documentoLimpiarAccion: () => set({ estadoAccion: INICIAL }),
  documentoCerrar: () => set({ detalle: null, estadoDetalle: INICIAL }),
}));
