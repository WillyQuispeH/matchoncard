// Estados de una validación y de un documento que usan varias capas.

export const ESTADOS_VALIDACION = ['creada', 'en_captura', 'consentida', 'aprobada', 'rechazada', 'revision', 'expirada', 'borrada'] as const;
export const ESTADOS_FINALES = ['aprobada', 'rechazada', 'revision', 'expirada', 'borrada'];
// en curso: el teléfono todavía puede usar el link
export const ABIERTAS = ['creada', 'en_captura', 'consentida'];
// La validación habilita la firma si quedó aprobada o en revisión (en revisión la estampa dice "validación con observaciones").
export const HABILITAN_FIRMA = ['aprobada', 'revision'];
