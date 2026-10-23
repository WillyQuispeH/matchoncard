export interface IPuntajes {
  huella: number | null;
  rostro: number | null;
  prueba_de_vida: boolean | null;
  firma: number | null;
}

export interface IValidacion {
  validacion_id: string;
  estado: string;
  motivos: string[];
  rut: string | null;
  nombre?: string | null;
  documento_id: string | null;
  referencia: string | null;
  veredicto_dispositivo: string | null;
  puntajes: IPuntajes | null;
  evidencia_sha256: string | null;
  integridad: string;
  verificacion_servidor: string;
  consentimiento: { version: string; otorgado_en: string; recibido_en: string } | null;
  creada_en: string;
  actualizada_en: string;
  retener_hasta: string | null;
  dispositivo?: string | null;
  duracion_ms?: number | null;
}

export interface IResultadoDispositivo {
  huella?: { veredicto?: string | null };
  firma?: { veredicto?: string | null };
  dispositivo?: { modelo?: string; perfil?: string };
  duracion_ms?: number;
}

export interface IHistorial {
  en: string;
  actor: string;
  accion: string;
  ip: string | null;
  detalle: { motivo?: string } | null;
}

export interface IInforme {
  folio: string;
  sha256: string;
  emitido_por: string;
  emitido_en: string;
}

export interface IValidacionDetalle extends IValidacion {
  resultado: IResultadoDispositivo | null;
  consentimiento_texto: string | null;
  tiene_evidencia: boolean;
  historial: IHistorial[];
  informes: IInforme[];
}

export interface IListaValidaciones {
  total: number;
  pagina: number;
  tam: number;
  filas: IValidacion[];
}

export interface IFiltroValidaciones {
  estado: string;
  rut: string;
  pagina: number;
}

export interface IResumen {
  porEstado: { estado: string; n: number }[];
  porDia: { dia: string; total: number; aprobadas: number }[];
}

export interface INuevaValidacion {
  rut: string;
  nombre?: string;
  documento_id?: string;
}

export interface IValidacionCreada {
  validacion_id: string;
  estado: string;
  url_captura: string;
  expira_en: string;
}
