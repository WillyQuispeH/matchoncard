'use client';
import { useState, type ReactNode } from 'react';

interface Props { alElegir: (f: File) => void; children: ReactNode; className?: string }

// Zona para elegir o arrastrar un PDF
export function FileDrop({ alElegir, children, className = '' }: Props) {
  const [sobre, setSobre] = useState(false);
  const evitar = (e: React.DragEvent, on: boolean) => { e.preventDefault(); setSobre(on); };
  return (
    <label
      onDragEnter={(e) => evitar(e, true)} onDragOver={(e) => evitar(e, true)} onDragLeave={(e) => evitar(e, false)}
      onDrop={(e) => { evitar(e, false); const f = e.dataTransfer.files[0]; if (f) alElegir(f); }}
      className={`grid cursor-pointer place-items-center gap-2 text-center transition ${sobre ? 'border-accent bg-[#16222a]' : ''} ${className}`}>
      <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) alElegir(f); e.target.value = ''; }} />
      {children}
    </label>
  );
}
