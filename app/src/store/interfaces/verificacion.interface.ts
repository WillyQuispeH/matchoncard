export interface IFirmaVerificada {
  tipo: 'sello' | 'firma' | 'previa';   // previa: firma que el PDF ya traía antes de registrarse en MatchOnCard
  certificacion: boolean;
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

// Resumen público de una firma (destino del QR de la estampa)
export type NivelFactor = 'ok' | 'warn' | 'bad' | 'omitida' | null;
export interface IFirmaPublica {
  validacion_id: string;
  estado: string;
  estado_texto: string;
  nombre: string;
  rut: string;
  firmado_en: string;
  documento: string;
  solicitado_por: string;
  factores: { huella: NivelFactor; rostro: NivelFactor; firma: NivelFactor };
  observaciones: string[];
  evidencia_sha256: string | null;
  informe_disponible: boolean;   // false si la evidencia ya se eliminó (retención)
}
