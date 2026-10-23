export function SiteFooter() {
  return (
    <footer className="border-t border-line pb-14 pt-10 text-sm text-ink-3">
      <div className="mx-auto max-w-[1120px] px-6 max-[560px]:px-4">
        <div className="flex flex-wrap justify-between gap-x-8 gap-y-4">
          <span>© {new Date().getFullYear()} MatchOnCard</span>
          <span>Contacto: <a href="mailto:jgomez@portalfirma.cl" className="text-inherit">jgomez@portalfirma.cl</a></span>
        </div>
        <p className="mt-[18px] max-w-[80ch] leading-[1.55]">
          Servicio en etapa piloto. El resultado es una validación de apoyo para firma electrónica simple (Ley 19.799) y no reemplaza a la firma electrónica
          avanzada. Las comparaciones biométricas no están certificadas por organismos externos.
        </p>
      </div>
    </footer>
  );
}
