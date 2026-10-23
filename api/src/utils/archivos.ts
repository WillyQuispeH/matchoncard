// Nombre de descarga de un PDF: sin acentos ni caracteres raros, con la versión o "-firmado" si está completo.
export const nombreArchivo = (nombre: string, version: number, estado: string) =>
  `${nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80) || 'documento'}${estado === 'completado' ? '-firmado' : `-v${version}`}.pdf`;

// 12345678-5 → 12.345.678-5
export function formatoRut(n: string) {
  const [c, dv] = n.split('-');
  return `${c.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}
