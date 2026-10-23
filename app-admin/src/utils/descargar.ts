// Descarga un blob como archivo (informe, evidencia, PDF).
export function descargar(blob: Blob, nombre: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

// nombre del archivo desde Content-Disposition
export const nombreDesde = (cd: string | undefined, def: string) => (cd?.match(/filename="([^"]+)"/) || [])[1] || def;
