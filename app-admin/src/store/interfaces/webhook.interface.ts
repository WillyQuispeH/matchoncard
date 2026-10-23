export type EstadoWebhook = 'pendiente' | 'fallido' | 'entregado' | 'descartado';

export interface IWebhook {
  id: number;
  validacion_id: string | null;
  documento_id: string | null;
  cliente_id: string;
  url: string;
  evento: string;
  intentos: number;
  proximo_en: string;
  entregado_en: string | null;
  ultimo_error: string | null;
  descartado_en: string | null;
  descartado_por: string | null;
  estado: EstadoWebhook;
}

export interface IWebhookDetalle extends IWebhook {
  cuerpo: Record<string, unknown>;
}

export interface IListaWebhooks {
  total: number;
  pagina: number;
  tam: number;
  resumen: { estado: EstadoWebhook; n: number }[];
  filas: IWebhook[];
}

export interface IFiltroWebhooks {
  estado: string;
  cliente: string;
  pagina: number;
}
