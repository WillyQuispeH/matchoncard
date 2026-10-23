// Textos visibles de estados y motivos (los mismos de la API)

export const ESTADOS: Record<string, string> = {
  pendiente: 'Pendiente', completado: 'Completado', cancelado: 'Cancelado', firmado: 'Firmado', en_espera: 'En espera', validado: 'Firmando…',
  creada: 'Creada', en_captura: 'En captura', consentida: 'Consentida', aprobada: 'Aprobada', rechazada: 'Rechazada', revision: 'Revisión',
  expirada: 'Expirada', borrada: 'Borrada',
};

export const MOTIVOS: Record<string, string> = {
  run_distinto: 'El RUN de la cédula no es el del firmante',
  run_no_leido: 'No se pudo leer el RUN de la cédula',
  hash_distinto: 'La huella digital del paquete no coincide',
  evidencia_ilegible: 'No se pudo descifrar la evidencia',
  no_es_zip: 'La evidencia no tiene el formato esperado',
  huella_no_coincide: 'La huella no coincide con la de la cédula',
  huella_no_confirmada: 'La huella no se pudo confirmar',
  huella_omitida: 'El titular siguió sin huella (no se pudo leer)',
  rostro_no_coincide: 'El rostro no coincide con la foto de la cédula',
  rostro_no_confirmada: 'El rostro no se pudo confirmar',
  firma_no_coincide: 'La firma no coincide con la de la cédula',
  firma_no_confirmada: 'La firma no se pudo confirmar',
};

export const FILTROS_ESTADO: [string, string][] = [
  ['', 'Todos los estados'], ['aprobada', 'Aprobadas'], ['rechazada', 'Rechazadas'], ['revision', 'En revisión'],
  ['en_captura', 'En captura'], ['consentida', 'Consentidas'], ['creada', 'Creadas (sin abrir)'], ['expirada', 'Expiradas'], ['borrada', 'Borradas'],
];

// color de cada firmante en el editor y en el detalle del documento
export const COLORES = ['#5DB1D1', '#F1B84B', '#3FD49A', '#C792EA', '#F2786A', '#7FD1C7', '#E6A0C4', '#A3BE8C'];

// tamaño por defecto del recuadro de firma (puntos PDF)
export const CAJA = { ancho: 200, alto: 70 };

// color de cada estado de un webhook (tonos de Badge)
export const TONO_WEBHOOK: Record<string, string> = { pendiente: 'pendiente', fallido: 'rechazada', entregado: 'aprobada', descartado: '' };
