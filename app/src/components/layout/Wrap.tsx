import type { ReactNode } from 'react';

// Contenedor centrado de la landing
export function Wrap({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1120px] px-6 max-[560px]:px-4 ${className}`}>{children}</div>;
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono text-[13px] font-medium uppercase leading-none tracking-[0.08em] text-accent ${className}`}>{children}</span>;
}

// Sección de la landing con encabezado
export function SeccionSitio({ id, eyebrow, titulo, texto, children, className = '' }: {
  id?: string; eyebrow: string; titulo: string; texto?: string; children?: ReactNode; className?: string;
}) {
  return (
    <section id={id} className={`border-t border-line py-24 max-[560px]:py-[72px] ${className}`}>
      <Wrap>
        <div className="mb-[52px] max-w-[720px]">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mb-4 mt-3.5 text-balance font-display text-[clamp(32px,4vw,46px)] font-normal tracking-[-0.01em]">{titulo}</h2>
          {texto && <p className="text-[19px] text-ink-2">{texto}</p>}
        </div>
        {children}
      </Wrap>
    </section>
  );
}
