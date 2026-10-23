// Formatos de presentación (es-CL)

export const fechaLarga = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short', hour12: false }) : '—';
