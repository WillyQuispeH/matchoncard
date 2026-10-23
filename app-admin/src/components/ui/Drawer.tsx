'use client';
import { useEffect, type ReactNode } from 'react';

interface Props { etiqueta: string; alCerrar: () => void; children: ReactNode }

// Panel lateral derecho con fondo oscurecido
export function Drawer({ etiqueta, alCerrar, children }: Props) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') alCerrar(); };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [alCerrar]);
  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/55" onClick={alCerrar} />
      <aside aria-label={etiqueta}
        className="fixed inset-y-0 right-0 z-[21] grid w-full max-w-[820px] content-start gap-5 overflow-y-auto border-l border-line bg-bg p-6">
        {children}
      </aside>
    </>
  );
}
