import type { ReactNode } from 'react';

// Bloque con título dentro de los paneles laterales
export function Section({ titulo, aviso = false, children }: { titulo: string; aviso?: boolean; children: ReactNode }) {
  return (
    <div className={`grid gap-3 rounded-[14px] border bg-surface px-[18px] py-4 ${aviso ? 'border-warn/40' : 'border-line'}`}>
      <h3 className="text-[17px]">{titulo}</h3>
      {children}
    </div>
  );
}

// Lista de datos (dt/dd) en dos columnas
export function DataList({ items }: { items: [string, ReactNode, boolean?][] }) {
  return (
    <dl className="m-0 grid grid-cols-[150px_1fr] gap-x-3.5 gap-y-2 text-sm max-[900px]:grid-cols-1 max-[900px]:gap-y-0.5">
      {items.map(([k, v, mono]) => (
        <div key={k} className="contents">
          <dt className="text-ink-3 max-[900px]:mt-2">{k}</dt>
          <dd className={`m-0 break-words ${mono ? 'font-mono text-xs' : ''}`}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
