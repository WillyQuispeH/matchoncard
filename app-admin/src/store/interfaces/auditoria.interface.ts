export interface IRegistroAuditoria {
  id: number;
  en: string;
  validacion_id: string | null;
  actor: string;
  accion: string;
  ip: string | null;
  detalle: Record<string, unknown> | null;
}

export interface IListaAuditoria {
  pagina: number;
  tam: number;
  hay_mas: boolean;
  filas: IRegistroAuditoria[];
}

export interface IFiltroAuditoria {
  desde: string;
  hasta: string;
  actor: string;
  accion: string;
  validacion_id: string;
  ip: string;
  pagina: number;
}
