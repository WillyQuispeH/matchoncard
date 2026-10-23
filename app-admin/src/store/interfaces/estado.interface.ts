import type { EstadoWebhook } from './webhook.interface';

export interface IComponente {
  nombre: string;
  ok: boolean;
  detalle: string;
  ms: number;
}

export interface IEstadoSistema {
  fecha: string;
  ok: boolean;
  componentes: IComponente[];
  webhooks: { estado: EstadoWebhook; n: number }[];
}
