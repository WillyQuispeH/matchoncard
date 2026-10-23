'use client';
import { useEffect, useRef } from 'react';
import type { PdfDocumento } from './pdfjs';
import type { EditorDocumento, PaginaPdf } from './useEditorDocumento';
import { CajaFirma } from './CajaFirma';

interface Props { doc: PdfDocumento; pagina: PaginaPdf; total: number; escala: number; ed: EditorDocumento }

// Una página del PDF dibujada con pdf.js, con los recuadros de firma encima
export function HojaPdf({ doc, pagina, total, escala, ed }: Props) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const ancho = pagina.ancho * escala, alto = pagina.alto * escala;

  useEffect(() => {
    let vigente = true;
    (async () => {
      const page = await doc.getPage(pagina.n);
      const cv = lienzo.current; if (!cv || !vigente) return;
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.floor(ancho * dpr); cv.height = Math.floor(alto * dpr);
      await page.render({ canvasContext: cv.getContext('2d')!, viewport: page.getViewport({ scale: escala }), transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
    })().catch(() => undefined);
    return () => { vigente = false; };
  }, [doc, pagina.n, escala, ancho, alto]);

  const clic = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== lienzo.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    ed.ponerCaja(pagina, (e.clientX - r.left) / escala, (e.clientY - r.top) / escala);
  };

  return (
    <div onClick={clic} className="relative cursor-crosshair bg-white shadow-[0_2px_18px_rgba(0,0,0,.5)]" style={{ width: ancho, height: alto }}>
      <span className="absolute -top-5 left-0 font-mono text-xs text-ink-3">Página {pagina.n} de {total}</span>
      <canvas ref={lienzo} className="block" style={{ width: ancho, height: alto }} />
      {ed.firmantes.map((f, fi) => f.cajas.filter((c) => c.pagina === pagina.n).map((c) => (
        <CajaFirma key={c.id} caja={c} escala={escala} limite={pagina} color={f.color} nombre={f.nombre}
          alActivar={() => ed.setActivo(fi)} alCambiar={(nueva) => ed.cambiarCaja(fi, c, nueva)} alQuitar={() => ed.quitarCaja(fi, c)} />
      )))}
    </div>
  );
}
