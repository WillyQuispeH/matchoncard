'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { InputText } from '@/components/ui/InputText';
import type { EditorDocumento } from './useEditorDocumento';

export function ListaFirmantes({ ed }: { ed: EditorDocumento }) {
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [error, setError] = useState<string | null>(null);
  const agregar = (e: React.FormEvent) => {
    e.preventDefault();
    const err = ed.agregarFirmante(nombre, rut);
    setError(err);
    if (!err) { setNombre(''); setRut(''); }
  };
  return (
    <div className="grid gap-2">
      <span className="text-[13px] font-medium text-ink-2">Firmantes</span>
      {ed.firmantes.map((f, i) => (
        <div key={f.rut} onClick={() => ed.setActivo(i)}
          className={`grid cursor-pointer grid-cols-[14px_1fr_auto_auto] items-center gap-2.5 rounded-[10px] border bg-surface px-3 py-2.5 ${i === ed.activo ? 'border-accent shadow-[inset_0_0_0_1px_var(--color-accent)]' : 'border-line-2'}`}>
          <i className="size-3.5 rounded-full" style={{ background: f.color }} />
          <div><b className="text-sm">{ed.orden === 'secuencial' ? `${i + 1}. ` : ''}{f.nombre}</b><br /><small className="font-mono text-ink-3">{f.rut}</small></div>
          <small className="font-mono text-ink-3">{f.cajas.length ? `${f.cajas.length} firma${f.cajas.length > 1 ? 's' : ''}` : 'sin ubicar'}</small>
          <button aria-label="Quitar" onClick={(e) => { e.stopPropagation(); ed.quitarFirmante(i); }} className="border-0 bg-transparent px-0.5 text-base text-ink-3">✕</button>
        </div>
      ))}
      <form onSubmit={agregar} className="grid gap-2 rounded-xl border border-line bg-surface p-3">
        <InputText placeholder="Nombre completo" maxLength={160} autoComplete="off" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <InputText placeholder="RUT (12.345.678-5)" autoComplete="off" value={rut} onChange={(e) => setRut(e.target.value)} />
        <Button type="submit">+ Agregar firmante</Button>
        <ErrorMessage mensaje={error} />
      </form>
      <p className="text-[13px] text-ink-3">
        Elige un firmante y haz clic en la página donde va su firma. Un firmante puede firmar en varias páginas. Arrastra un recuadro para moverlo y su esquina para cambiar el tamaño.
      </p>
    </div>
  );
}
