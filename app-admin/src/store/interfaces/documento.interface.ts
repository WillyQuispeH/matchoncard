// Coordenadas en puntos PDF (1/72"), página desde 1, origen arriba-izquierda
export interface IUbicacion {
  pagina: number;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface IFirmante {
  firmante_id: string;
  orden: number;
  nombre: string;
  rut: string;
  estado: string;
  ubicaciones: IUbicacion[];
  validacion_id: string | null;
  validacion_estado: string | null;
  firmado_en: string | null;
  observaciones: string | null;
}

export interface IDocumento {
  documento_id: string;
  nombre: string;
  referencia: string | null;
  estado: string;
  orden: 'libre' | 'secuencial';
  paginas: number;
  version: number;
  sha256_original: string;
  sha256_actual: string;
  creado_en: string;
  completado_en: string | null;
  motivo_cancelacion: string | null;
  firmantes: IFirmante[];
}

export interface IDocumentoFila {
  id: string;
  nombre: string;
  referencia: string | null;
  estado: string;
  orden: 'libre' | 'secuencial';
  version: number;
  creado_en: string;
  completado_en: string | null;
  firmantes: number;
  firmados: number;
}

export interface INuevoDocumento {
  nombre: string;
  pdf: string;   // base64
  orden: 'libre' | 'secuencial';
  referencia?: string;
  firmantes: { nombre: string; rut: string; ubicaciones: IUbicacion[] }[];
}

export interface IEnlaceFirmante {
  firmante_id: string;
  orden: number;
  nombre: string;
  url_captura: string | null;
  expira_en: string | null;
}

export interface IDocumentoCreado extends IDocumento {
  enlaces_firmantes: IEnlaceFirmante[];
}

export interface IEnlaceNuevo {
  firmante_id: string;
  url_captura: string;
  expira_en: string;
  validacion_id: string;
}

// lo que muestra el modal de links
export interface IEnlacesModal {
  titulo: string;
  nota: string;
  documento: string;
  items: { nombre: string; url: string | null; expira: string | null }[];
}
