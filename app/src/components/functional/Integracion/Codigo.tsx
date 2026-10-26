'use client';
import { useEffect, useState } from 'react';
import { useLenguajeStore } from '@/store/zustand/lenguaje.store';

export interface Muestra { lenguaje: string; codigo: string }

// Bloque de código con pestañas por lenguaje y botón para copiar.
// Las pestañas de lenguaje (cURL, Node.js, Python…) se sincronizan entre todos los bloques de la página.
export function Codigo({ titulo, muestras }: { titulo?: string; muestras: Muestra[] }) {
  const { lenguaje, lenguajeElegir } = useLenguajeStore();
  const [local, setLocal] = useState(0);
  const [copiado, setCopiado] = useState(false);

  // al cargar, recupera el lenguaje elegido en otra visita
  useEffect(() => {
    try { const l = localStorage.getItem('moc-lenguaje'); if (l && l !== useLenguajeStore.getState().lenguaje) useLenguajeStore.setState({ lenguaje: l }); } catch { /* sin almacenamiento */ }
  }, []);

  const global = muestras.findIndex((m) => m.lenguaje === lenguaje);
  const i = global >= 0 ? global : Math.min(local, muestras.length - 1);
  const actual = muestras[i];

  const elegir = (k: number) => {
    setLocal(k);
    lenguajeElegir(muestras[k].lenguaje);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(actual.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch { /* sin permiso de portapapeles */ }
  };

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-deep shadow-[0_2px_0_#0b0b0c]">
      <div className="flex items-center gap-1 border-b border-line bg-sunken px-2">
        <span aria-hidden="true" className="ml-1.5 mr-1 flex shrink-0 gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-[#ff6159]" /><i className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" /><i className="h-2.5 w-2.5 rounded-full bg-[#28c941]" />
        </span>
        {titulo && <span className="mr-2 truncate px-2 py-2.5 font-mono text-xs text-ink-3">{titulo}</span>}
        <div role="tablist" className="flex min-w-0 gap-1 overflow-x-auto">
          {muestras.length > 1 && muestras.map((m, k) => (
            <button key={m.lenguaje} role="tab" aria-selected={k === i} onClick={() => elegir(k)}
              className={`whitespace-nowrap border-b-2 px-2.5 py-2.5 font-mono text-xs ${k === i ? 'border-accent text-ink' : 'border-transparent text-ink-3 hover:text-ink-2'}`}>
              {m.lenguaje}
            </button>
          ))}
          {muestras.length === 1 && !titulo && <span className="px-2.5 py-2.5 font-mono text-xs text-ink-3">{actual.lenguaje}</span>}
        </div>
        <button onClick={copiar} className="ml-auto shrink-0 rounded-md px-2.5 py-1.5 font-mono text-xs text-ink-3 hover:bg-surface hover:text-ink">
          {copiado ? 'Copiado ✓' : 'Copiar'}
        </button>
      </div>
      <pre className="m-0 max-h-[520px] overflow-auto p-4 font-mono text-[13px] leading-[1.65] text-ink-2"><code>{actual.codigo}</code></pre>
    </div>
  );
}
