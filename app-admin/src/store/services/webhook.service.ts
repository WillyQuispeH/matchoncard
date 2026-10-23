import { api } from '@/utils/api';
import type { IFiltroWebhooks, IListaWebhooks, IWebhookDetalle } from '../interfaces/webhook.interface';

const P = '/webhooks';

export const webhookService = {
  listar: (f: IFiltroWebhooks) =>
    api.get<IListaWebhooks>(P, { params: { ...(f.estado ? { estado: f.estado } : {}), ...(f.cliente ? { cliente: f.cliente } : {}), pagina: f.pagina } }),
  detalle: (id: number) => api.get<IWebhookDetalle>(`${P}/${id}`),
  reintentar: (id: number) => api.post<{ estado: string }>(`${P}/${id}/reintentar`),
  descartar: (id: number) => api.post<{ estado: string }>(`${P}/${id}/descartar`),
};
