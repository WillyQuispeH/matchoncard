import { ButtonLink } from '@/components/ui/Button';
import { IconoPlay } from '@/components/ui/Iconos';
import { Eyebrow, Wrap } from '@/components/layout/Wrap';
import { PhoneMock } from './PhoneMock';

export function Hero() {
  return (
    <div className="relative overflow-hidden py-[88px] pb-[72px] max-[560px]:py-14 max-[560px]:pb-12
      before:pointer-events-none before:absolute before:right-[-10%] before:top-[-40%] before:size-[720px] before:bg-[radial-gradient(closest-side,rgba(93,177,209,.18),transparent_70%)] before:content-['']">
      <Wrap className="grid grid-cols-[1.25fr_.75fr] items-center gap-14 max-[980px]:grid-cols-1">
        <div>
          <Eyebrow>Validación de identidad · Chile</Eyebrow>
          <h1 className="mb-[22px] mt-[18px] text-balance text-[clamp(38px,4.8vw,60px)] leading-[1.12] tracking-[-0.01em]">
            Tu cédula, tu huella, tu rostro y tu firma. <em className="not-italic text-accent">Comparados en el momento.</em>
          </h1>
          <p className="max-w-[34ch] text-xl text-ink-2">
            MatchOnCard verifica que quien firma es el titular de la cédula, usando solo la cámara del teléfono. Sin lectores biométricos y sin instalar apps.
          </p>
          <div className="mt-[34px] flex flex-wrap gap-3.5">
            <ButtonLink href="/demo" variante="primary" tamano="lg" className="max-[560px]:flex-[1_1_100%]"><IconoPlay />Probar la DEMO</ButtonLink>
            <ButtonLink href="#como" tamano="lg" className="max-[560px]:flex-[1_1_100%]">Cómo funciona</ButtonLink>
          </div>
          <p className="mt-[18px] flex items-center gap-2 text-sm text-ink-3 before:size-2 before:rounded-full before:bg-ok before:shadow-[0_0_0_4px_rgba(63,212,154,.16)] before:content-['']">
            La demo corre entera en tu teléfono: no se guarda ni se envía nada.
          </p>
        </div>
        <PhoneMock />
      </Wrap>
    </div>
  );
}
