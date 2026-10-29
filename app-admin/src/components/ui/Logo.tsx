// Marca de MatchOnCard (isotipo + nombre) para fondo oscuro; los archivos están en public/
export function Logo({ tamano = 28, texto }: { tamano?: number; texto?: string }) {
  const alto = Math.round(tamano * 1.25);
  return (
    <span className="flex items-center gap-2.5 font-cond font-bold tracking-[-0.01em]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/matchoncard-logo-fondo-oscuro.svg" alt="MatchOnCard" height={alto} width={Math.round((alto * 2339) / 512)} />
      {texto ? <span>· {texto}</span> : null}
    </span>
  );
}
