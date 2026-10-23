// Textos y colores del informe PDF de una validación.
export const C = { ink: '#14202A', ink2: '#56656F', ink3: '#8A979F', line: '#D5DDE2', soft: '#F2F5F7', accent: '#2C7FA3', ok: '#13805A', warn: '#A86A00', bad: '#B23A2A' };
export const ESTADO: Record<string, [string, string]> = {
  aprobada: ['Identidad validada', C.ok], rechazada: ['No validada', C.bad], revision: ['Requiere revisión', C.warn],
  expirada: ['Expirada', C.ink2], borrada: ['Datos eliminados', C.ink2],
};
export const MOTIVOS: Record<string, string> = {
  run_distinto: 'El RUN leído de la cédula no corresponde al firmante esperado.',
  run_no_leido: 'No se pudo leer el RUN de la cédula.',
  huella_no_coincide: 'La huella no coincide con la de la cédula.',
  huella_no_confirmada: 'La huella no se pudo confirmar.',
  huella_omitida: 'El titular siguió sin huella (no se pudo leer).',
  rostro_no_coincide: 'El rostro no coincide con la foto de la cédula.',
  rostro_no_confirmada: 'El rostro no se pudo confirmar.',
  firma_no_coincide: 'La firma no coincide con la de la cédula.',
  firma_no_confirmada: 'La firma no se pudo confirmar.',
  hash_distinto: 'La huella digital (SHA-256) del paquete no coincide con la declarada.',
  evidencia_ilegible: 'No se pudo descifrar la evidencia.',
  no_es_zip: 'La evidencia no tiene el formato esperado.',
};
