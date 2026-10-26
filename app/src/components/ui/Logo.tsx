// Marca de MatchOnCard (ícono + nombre)
export function Logo({ tamano = 28, fondo = '#2a2b2d', texto }: { tamano?: number; fondo?: string; texto?: string }) {
  return (
    <span className="flex items-center gap-2.5 font-sans font-bold tracking-[-0.01em]">
      <svg width={tamano} height={tamano} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill={fondo} />
        <rect x="6" y="9" width="20" height="14" rx="3" fill="none" stroke="#D1C3FE" strokeWidth="2" />
        <path d="M11 18l3 3 7-7" fill="none" stroke="#A1E0A9" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Match<b className="text-accent">On</b>Card{texto ? ` · ${texto}` : ''}</span>
    </span>
  );
}
