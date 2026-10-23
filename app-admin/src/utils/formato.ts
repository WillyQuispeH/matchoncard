// Formatos de presentación (es-CL)

export const pct = (v: number | null | undefined) => (v == null ? '—' : (v * 100).toFixed(v >= 0.995 && v < 1 ? 2 : 0) + '%');

export const fechaCorta = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const fechaLarga = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short', hour12: false }) : '—';

export const fechaDia = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('es-CL') : '—');

export const vence = (d: string, corto = false) =>
  new Date(d).toLocaleString('es-CL', { dateStyle: corto ? 'short' : 'medium', timeStyle: 'short' });

// RUT chileno: dígito verificador (la API lo vuelve a validar)
export function rutValido(r: string): boolean {
  const s = String(r).toUpperCase().replace(/[^0-9K]/g, '');
  if (s.length < 7) return false;
  const c = s.slice(0, -1), dv = s.slice(-1);
  if (!/^\d+$/.test(c)) return false;
  let sum = 0, m = 2;
  for (let i = c.length - 1; i >= 0; i--) { sum += +c[i] * m; m = m === 7 ? 2 : m + 1; }
  const x = 11 - (sum % 11);
  return dv === (x === 11 ? '0' : x === 10 ? 'K' : String(x));
}
export const rutNormal = (r: string) => r.toUpperCase().replace(/[^0-9K]/g, '');

// PDF → base64 (lo que espera POST /documentos)
export function base64(u8: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + 0x8000)));
  return btoa(bin);
}
