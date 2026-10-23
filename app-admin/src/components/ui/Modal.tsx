'use client';
import { useEffect, type ReactNode } from 'react';

interface Props { titulo: string; alCerrar: () => void; children: ReactNode; ancho?: 'md' | 'lg' }

export function Modal({ titulo, alCerrar, children, ancho = 'md' }: Props) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') alCerrar(); };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [alCerrar]);
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4">
      <div role="dialog" aria-modal="true" aria-label={titulo}
        className={`grid max-h-[90vh] w-full gap-3.5 overflow-auto rounded-[18px] border border-line-2 bg-surface p-6 ${ancho === 'lg' ? 'max-w-[560px]' : 'max-w-[480px]'}`}>
        <h2 className="text-[22px]">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
