import { Eyebrow, Wrap } from '@/components/layout/Wrap';
import { IconoCheck } from '@/components/ui/Iconos';

const PUNTOS = [
  ['Consentimiento antes de la cámara', 'Se informa qué se captura, para qué, cuánto tiempo se guarda y cómo ejercer los derechos del titular.'],
  ['Cifrada desde el teléfono', 'La evidencia se cifra en el propio equipo con una clave única por validación, antes de salir hacia el servidor.'],
  ['Huella digital del paquete', 'Cada paquete lleva su código SHA-256: cualquier alteración posterior se detecta.'],
  ['Borrado verificable', 'Al vencer el plazo, o cuando el titular lo pide, se destruye la clave y la evidencia queda ilegible para siempre.'],
  ['Cada acceso queda registrado', 'Quién consultó o descargó evidencia, cuándo y por qué.'],
];

export function Seguridad() {
  return (
    <section id="seguridad" className="border-t border-line py-24 max-[560px]:py-[72px]">
      <Wrap className="grid grid-cols-2 items-start gap-14 max-[980px]:grid-cols-1">
        <div className="max-w-[720px]">
          <Eyebrow>Seguridad y privacidad</Eyebrow>
          <h2 className="mb-4 mt-3.5 text-balance text-[clamp(32px,4vw,46px)] tracking-[-0.01em]">La evidencia sirve como prueba. Y solo para eso.</h2>
          <p className="text-[19px] text-ink-2">
            La huella y el rostro son datos sensibles. MatchOnCard está diseñado para tratarlos con consentimiento expreso, el mínimo de datos y un plazo de conservación definido.
          </p>
        </div>
        <div className="grid gap-3.5">
          {PUNTOS.map(([t, x]) => (
            <div key={t} className="flex items-start gap-3.5 rounded-2xl border border-line bg-surface px-5 py-[18px]">
              <IconoCheck className="mt-[3px] flex-none text-ok" />
              <div><b className="mb-[3px] block text-[17px]">{t}</b><span className="text-[15px] text-ink-2">{x}</span></div>
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  );
}
