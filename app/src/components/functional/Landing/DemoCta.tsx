import { ButtonLink } from '@/components/ui/Button';
import { Eyebrow, Wrap } from '@/components/layout/Wrap';
import { QR_DEMO } from './qrDemo';

export function DemoCta() {
  return (
    <section id="demo" className="border-t border-line py-24 text-center max-[560px]:py-[72px]">
      <Wrap>
        <Eyebrow>Demo</Eyebrow>
        <h2 className="mx-auto mb-[18px] mt-3.5 max-w-[18ch] text-balance font-display text-[clamp(34px,4.6vw,54px)] font-normal tracking-[-0.01em]">Pruébalo con tu propia cédula.</h2>
        <p className="mx-auto max-w-[46ch] text-[19px] text-ink-2">
          Necesitas tu cédula y unos 3 minutos. En la demo todo ocurre dentro de tu teléfono: nada se envía ni se guarda en nuestros servidores.
        </p>
        <div className="mt-[34px] flex flex-wrap justify-center gap-3.5">
          <ButtonLink href="/demo" variante="primary" tamano="lg" className="max-[560px]:flex-[1_1_100%]">Abrir la DEMO</ButtonLink>
        </div>
        {/* solo en computador: el QR lleva la demo al teléfono */}
        <div aria-label="Código QR para abrir la demo en el teléfono"
          className="mx-auto mt-10 hidden w-max items-center gap-5 rounded-[20px] border border-line bg-surface py-[18px] pl-[18px] pr-[22px] text-left [@media(hover:hover)_and_(min-width:900px)]:flex">
          <svg viewBox="0 0 33 33" aria-hidden="true" className="size-[120px] rounded-[10px] bg-white p-1.5"><path fill="#222324" d={QR_DEMO} /></svg>
          <div>
            <b className="block text-[17px]">¿Estás en el computador?</b>
            <span className="text-[15px] text-ink-2">Escanea el código con tu teléfono.<br />La demo usa la cámara trasera y la linterna.</span>
          </div>
        </div>
      </Wrap>
    </section>
  );
}
