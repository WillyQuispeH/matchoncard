export interface IFirmaVerificada {
  tipo: 'sello' | 'firma';
  nombre: string | null;
  fecha: string | null;
  motivo: string | null;
  integra: boolean;
  emitida_por_matchoncard: boolean;
  modificaciones_permitidas: boolean;
  error?: string;
}

export interface IVerificacion {
  sha256: string;
  valido: boolean;
  resumen: string;
  firmas: IFirmaVerificada[];
  firmas_pendientes: number;
  registro: { encontrado: false } | {
    encontrado: true; estado: string; version: number; es_version_vigente: boolean;
    firmantes: number; firmados: number; completado_en: string | null;
  };
}
