import { create } from 'zustand';
import { webhookService } from '../services/webhook.service';
import type { IFiltroWebhooks, IListaWebhooks, IWebhookDetalle } from '../interfaces/webhook.interface';
import type { IEstadoCarga } from '../interfaces/response.interface';
import { INICIAL, ejecutar } from './estado';

interface WebhookState {
  lista: IListaWebhooks | null;
  filtro: IFiltroWebhooks;
  detalle: IWebhookDetalle | null;
  estadoLista: IEstadoCarga;
  estadoAccion: IEstadoCarga;
  webhookListar: () => Promise<void>;
  webhookFiltrar: (f: Partial<IFiltroWebhooks>) => Promise<void>;
  webhookDetalle: (id: number | null) => Promise<void>;
  webhookReintentar: (id: number) => Promise<boolean>;
  webhookDescartar: (id: number) => Promise<boolean>;
}

export const useWebhookStore = create<WebhookState>((set, get) => ({
  lista: null,
  // por defecto se muestra lo que necesita atención
  filtro: { estado: 'fallido', cliente: '', pagina: 1 },
  detalle: null,
  estadoLista: INICIAL,
  estadoAccion: INICIAL,

  webhookListar: async () => {
    const r = await ejecutar<WebhookState, IListaWebhooks>(set, 'estadoLista', async () => (await webhookService.listar(get().filtro)).data);
    if (r) set({ lista: r });
  },
  webhookFiltrar: async (f) => {
    set({ filtro: { ...get().filtro, pagina: 1, ...f } });
    await get().webhookListar();
  },
  webhookDetalle: async (id) => {
    if (id == null) { set({ detalle: null }); return; }
    const r = await ejecutar<WebhookState, IWebhookDetalle>(set, 'estadoAccion', async () => (await webhookService.detalle(id)).data);
    set({ detalle: r });
  },
  webhookReintentar: async (id) => {
    const r = await ejecutar<WebhookState, unknown>(set, 'estadoAccion', async () => (await webhookService.reintentar(id)).data);
    if (r) { void get().webhookListar(); if (get().detalle?.id === id) void get().webhookDetalle(id); }
    return !!r;
  },
  webhookDescartar: async (id) => {
    const r = await ejecutar<WebhookState, unknown>(set, 'estadoAccion', async () => (await webhookService.descartar(id)).data);
    if (r) { void get().webhookListar(); if (get().detalle?.id === id) void get().webhookDetalle(id); }
    return !!r;
  },
}));
