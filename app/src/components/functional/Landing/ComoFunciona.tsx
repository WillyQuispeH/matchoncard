import { SeccionSitio } from '@/components/layout/Wrap';
import { IconoCedula, IconoFirma, IconoHuella, IconoRostro } from '@/components/ui/Iconos';

const PASOS = [
  { n: '00', icono: IconoCedula, titulo: 'La cédula', texto: 'Fotos del frente y reverso, de cerca a la firma y a la huella impresa. Se lee el RUN para verificar que es la persona esperada.', base: true },
  { n: '01', icono: IconoHuella, titulo: 'Huella', texto: 'Con la cámara trasera y la linterna se escanea la yema del pulgar y se compara con la huella impresa en la cédula.' },
  { n: '02', icono: IconoRostro, titulo: 'Rostro', texto: 'Selfie con prueba de vida (parpadear y girar la cabeza) y comparación con la foto de la cédula.' },
  { n: '03', icono: IconoFirma, titulo: 'Firma', texto: 'La persona firma tres veces con el dedo. Se comparan los rasgos que se mantienen aunque la firma en pantalla nunca salga igual.' },
];

export function ComoFunciona() {
  return (
    <SeccionSitio id="como" eyebrow="Cómo funciona" titulo="Tres pruebas contra un mismo documento."
      texto="La cédula chilena ya trae la huella del pulgar, la foto y la firma del titular. MatchOnCard las lee del documento y las compara con la persona que está frente al teléfono.">
      <div className="grid grid-cols-4 gap-[18px] max-[980px]:grid-cols-2 max-[560px]:grid-cols-1">
        {PASOS.map(({ n, icono: Icono, titulo, texto, base }) => (
          <div key={n} className={`relative rounded-[20px] border border-line px-[22px] py-[26px] ${base ? 'bg-sunken' : 'bg-surface'}`}>
            <span className="font-mono text-[13px] font-medium text-ink-3">{n}</span>
            <Icono tamano={34} grosor={1.6} className="mt-3.5 text-accent" />
            <h3 className="mb-2.5 mt-4 text-[23px]">{titulo}</h3>
            <p className="text-base text-ink-2">{texto}</p>
          </div>
        ))}
      </div>
    </SeccionSitio>
  );
}
