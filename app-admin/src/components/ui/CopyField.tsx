'use client';
import { useRef } from 'react';
import { Button } from './Button';
import { claseCampo } from './InputText';

// Campo de solo lectura con botón Copiar
export function CopyField({ valor, alCopiar }: { valor: string; alCopiar?: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(valor); alCopiar?.(); } catch { ref.current?.select(); }
  };
  return (
    <div className="flex gap-2">
      <input ref={ref} readOnly value={valor} className={`${claseCampo} font-mono text-[13px]`} />
      <Button onClick={copiar}>Copiar</Button>
    </div>
  );
}
