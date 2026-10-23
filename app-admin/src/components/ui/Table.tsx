import type { ReactNode } from 'react';

export interface Columna<T> {
  titulo: string;
  celda: (fila: T) => ReactNode;
  numerica?: boolean;
  ocultarMovil?: boolean;
  clase?: string;
}

interface Props<T> {
  columnas: Columna<T>[];
  filas: T[] | null;
  clave: (fila: T) => string;
  alElegir?: (fila: T) => void;
  vacio: ReactNode;
}

export function Table<T>({ columnas, filas, clave, alElegir, vacio }: Props<T>) {
  const cls = (c: Columna<T>) => `${c.numerica ? 'text-right font-mono tabular' : ''} ${c.ocultarMovil ? 'max-[900px]:hidden' : ''} ${c.clase || ''}`;
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {columnas.map((c) => (
            <th key={c.titulo} className={`border-b border-line bg-sunken px-3.5 py-3 text-left font-mono text-xs font-medium uppercase tracking-wider text-ink-3 ${cls(c)}`}>{c.titulo}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas && filas.length ? filas.map((f) => (
          <tr key={clave(f)} onClick={alElegir ? () => alElegir(f) : undefined} className={`${alElegir ? 'cursor-pointer hover:bg-accent/5' : ''} [&:last-child>td]:border-b-0`}>
            {columnas.map((c) => <td key={c.titulo} className={`border-b border-line px-3.5 py-3 align-middle ${cls(c)}`}>{c.celda(f)}</td>)}
          </tr>
        )) : (
          <tr><td colSpan={columnas.length} className="p-10 text-center text-ink-3">{vacio}</td></tr>
        )}
      </tbody>
    </table>
  );
}
