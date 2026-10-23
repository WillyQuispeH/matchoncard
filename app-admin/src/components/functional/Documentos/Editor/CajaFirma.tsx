'use client';
import { useRef } from 'react';
import type { Caja } from './useEditorDocumento';

interface Props {
  caja: Caja;
  escala: number;              // píxeles por punto PDF
  limite: { ancho: number; alto: number };
  color: string;
  nombre: string;
  alActivar: () => void;
  alCambiar: (nueva: Caja) => boolean;
  alQuitar: () => void;
}

// Recuadro de firma: se arrastra para moverlo y desde la esquina para cambiar el tamaño
export function CajaFirma({ caja, escala, limite, color, nombre, alActivar, alCambiar, alQuitar }: Props) {
  const arrastre = useRef<{ x0: number; y0: number; o: Caja; redim: boolean; actual: Caja } | null>(null);

  const bajar = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).dataset.quitar) return;
    e.preventDefault(); e.stopPropagation();
    alActivar();
    arrastre.current = { x0: e.clientX, y0: e.clientY, o: caja, redim: !!(e.target as HTMLElement).dataset.redim, actual: caja };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const mover = (e: React.PointerEvent) => {
    const a = arrastre.current; if (!a) return;
    const dx = (e.clientX - a.x0) / escala, dy = (e.clientY - a.y0) / escala, o = a.o;
    const p: Caja = a.redim
      ? { ...a.actual, ancho: Math.max(90, Math.min(600, limite.ancho - o.x, o.ancho + dx)), alto: Math.max(36, Math.min(300, limite.alto - o.y, o.alto + dy)) }
      : { ...a.actual, x: Math.max(0, Math.min(limite.ancho - o.ancho, o.x + dx)), y: Math.max(0, Math.min(limite.alto - o.alto, o.y + dy)) };
    if (alCambiar(p)) a.actual = p;
  };
  const soltar = () => { arrastre.current = null; };

  return (
    <div onPointerDown={bajar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} onClick={(e) => e.stopPropagation()}
      className="absolute flex cursor-move touch-none select-none items-end rounded border-2 px-[5px] py-[3px] font-sans text-[11px] font-semibold text-bg"
      style={{ left: caja.x * escala, top: caja.y * escala, width: caja.ancho * escala, height: caja.alto * escala, borderColor: color, background: `${color}33` }}>
      <span className="rounded-[3px] px-[5px] py-px" style={{ background: color }}>{nombre}</span>
      <span data-redim="1" className="absolute -bottom-1.5 -right-1.5 size-3 cursor-nwse-resize rounded-[3px]" style={{ background: color }} />
      <button data-quitar="1" aria-label="Quitar" onClick={(e) => { e.stopPropagation(); alQuitar(); }}
        className="absolute -right-[9px] -top-[9px] size-[18px] rounded-full border-0 bg-bg p-0 text-[11px] font-semibold leading-[18px] text-white">✕</button>
    </div>
  );
}
