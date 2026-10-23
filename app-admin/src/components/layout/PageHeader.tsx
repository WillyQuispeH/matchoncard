import type { ReactNode } from 'react';

export function PageHeader({ sobretitulo, titulo, children }: { sobretitulo: string; titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <span className="font-mono text-xs text-ink-3">{sobretitulo}</span>
        <h1 className="text-[30px]">{titulo}</h1>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
