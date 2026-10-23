// Contrato con api-signature (coordenadas en puntos PDF, página desde 1, origen arriba-izquierda).
export interface Ubicacion { nombre: string; pagina: number; x: number; y: number; ancho: number; alto: number }

export interface FirmarParams {
  pdf: Buffer; campos: string[]; nombre: string; rut: string; validacion_id: string;
  evidencia_sha256: string; estado_validacion: string; firma_png: Buffer | null; documento_id: string;
}
