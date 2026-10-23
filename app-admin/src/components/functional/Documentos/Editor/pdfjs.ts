// pdf.js se carga desde /pdfjs (mismo origen, lo copia scripts/copiar-pdfjs.mjs): la CSP del panel no permite scripts externos.
// Se importa con una URL en variable para que el bundler no intente empaquetarlo.

export interface PdfPagina {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number }; transform?: number[] | null }) => { promise: Promise<void> };
}
export interface PdfDocumento {
  numPages: number;
  getPage: (n: number) => Promise<PdfPagina>;
  destroy: () => Promise<void>;
}
interface PdfJs {
  getDocument: (o: { data: Uint8Array }) => { promise: Promise<PdfDocumento> };
  GlobalWorkerOptions: { workerSrc: string };
}

let lib: Promise<PdfJs> | null = null;

export function cargarPdfjs(): Promise<PdfJs> {
  if (!lib) {
    const url = '/pdfjs/pdf.min.mjs';
    lib = (import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url) as Promise<PdfJs>).then((m) => {
      m.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
      return m;
    });
  }
  return lib;
}
