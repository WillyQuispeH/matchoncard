import { IconoFirma, IconoHuella, IconoRostro } from '@/components/ui/Iconos';

const FILAS = [
  { icono: <IconoHuella />, titulo: 'Huella', detalle: 'vs. cédula', estado: 'Coincide' },
  { icono: <IconoRostro />, titulo: 'Rostro', detalle: 'prueba de vida', estado: 'Coincide' },
  { icono: <IconoFirma />, titulo: 'Firma', detalle: 'con el dedo', estado: 'Compatible' },
];

// Ilustración del resultado en el teléfono (decorativa)
export function PhoneMock() {
  return (
    <div aria-hidden="true"
      className="relative aspect-[9/18.5] w-[300px] justify-self-center rounded-[44px] border border-line-2 bg-deep p-3.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,.7),inset_0_0_0_6px_#151618] max-[980px]:w-[270px]">
      <div className="flex h-full flex-col gap-3 overflow-hidden rounded-[32px] bg-surface px-[18px] pb-[18px] pt-[26px]">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-accent">Validación en 3 pasos</span>
        <span className="font-cond text-lg font-semibold">Resultado</span>
        {FILAS.map((f) => (
          <div key={f.titulo} className="flex items-center gap-3 rounded-[14px] border border-line bg-sunken px-3.5 py-3">
            <span className="grid size-[38px] flex-none place-items-center rounded-[10px] bg-accent/12 text-accent">{f.icono}</span>
            <div className="min-w-0">
              <b className="block text-sm leading-[1.3]">{f.titulo}</b>
              <small className="whitespace-nowrap text-xs leading-[1.3] text-ink-3">{f.detalle}</small>
            </div>
            <span className="ml-auto whitespace-nowrap rounded-full bg-ok/12 px-2 py-1 font-mono text-[11px] font-semibold text-ok">{f.estado}</span>
          </div>
        ))}
        <div className="mt-auto rounded-2xl border border-ok/35 bg-ok/10 p-4">
          <b className="block font-cond text-xl font-semibold leading-[1.2] text-ok">Identidad validada</b>
          <small className="mt-1 block text-xs leading-[1.4] text-ink-2">Los tres factores coinciden con la cédula.</small>
        </div>
      </div>
    </div>
  );
}
