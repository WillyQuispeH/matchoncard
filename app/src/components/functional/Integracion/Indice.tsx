'use client';
import { useEffect, useState } from 'react';

export interface GrupoIndice { titulo: string; items: { id: string; texto: string; metodo?: string }[] }

const COLOR_METODO: Record<string, string> = { GET: 'text-menta', POST: 'text-lila', DELETE: 'text-rosa' };

// Índice lateral que marca la sección visible
export function Indice({ grupos }: { grupos: GrupoIndice[] }) {
  const [activo, setActivo] = useState('');

  useEffect(() => {
    const ids = grupos.flatMap((g) => g.items.map((x) => x.id));
    const obs = new IntersectionObserver((entradas) => {
      const visibles = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visibles[0]) setActivo(visibles[0].target.id);
    }, { rootMargin: '-80px 0px -65% 0px' });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [grupos]);

  return (
    <nav aria-label="Contenido de la documentación" className="grid gap-6 text-sm">
      {grupos.map((g) => (
        <div key={g.titulo}>
          <div className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{g.titulo}</div>
          <ul className="grid list-none gap-0.5 p-0">
            {g.items.map((x) => (
              <li key={x.id}>
                <a href={`#${x.id}`}
                  className={`flex items-center gap-2 rounded-md border-l-2 px-2.5 py-1.5 no-underline ${activo === x.id ? 'border-lila bg-lila/10 font-medium text-ink' : 'border-transparent text-ink-2 hover:bg-sunken hover:text-ink'}`}>
                  {x.metodo && <span className={`w-[42px] shrink-0 font-mono text-[10px] font-medium ${COLOR_METODO[x.metodo] || 'text-ink-3'}`}>{x.metodo}</span>}
                  <span className="truncate">{x.texto}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
