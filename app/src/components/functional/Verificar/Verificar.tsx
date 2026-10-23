'use client';
import { FileDrop } from '@/components/ui/FileDrop';
import { IconoPdf } from '@/components/ui/Iconos';
import { Logo } from '@/components/ui/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { useVerificacion } from '@/store/hooks/useVerificacion.hook';
import { ResultadoVerificacion, Veredicto } from './ResultadoVerificacion';

export function Verificar() {
  const { resultado, archivo, estado, verificacionVerificar } = useVerificacion();
  return (
    <div className="text-base leading-[1.6]">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[760px] items-center justify-between px-5">
          <a href="/" className="text-xl text-ink no-underline"><Logo /></a>
        </div>
      </header>
      <main className="mx-auto max-w-[760px] px-5 pb-20 pt-12">
        <div className="font-mono text-xs font-medium uppercase leading-none tracking-[0.08em] text-accent">Verificación de documentos</div>
        <h1 className="mb-3 mt-3.5 text-[clamp(30px,5vw,42px)] leading-[1.1] tracking-[-0.01em]">¿Este PDF es auténtico?</h1>
        <p className="mb-7 max-w-[56ch] text-ink-2">
          Sube un documento firmado con MatchOnCard para comprobar quién lo firmó y que no haya sido modificado después. El archivo se revisa y se descarta: no lo guardamos.
        </p>
        <FileDrop alElegir={verificacionVerificar} className="rounded-[14px] border-[1.5px] border-dashed border-line-2 bg-surface px-5 py-10 hover:border-accent hover:bg-[#16222a]">
          <IconoPdf className="text-accent" />
          <strong className="text-[17px]">Elige el PDF o arrástralo aquí</strong>
          <small className="text-ink-3">Hasta 25 MB</small>
        </FileDrop>
        <div className="mt-7" aria-live="polite">
          {estado.onLoading && <Spinner texto={`Revisando las firmas de ${archivo}…`} />}
          {estado.onError && <Veredicto tono="bad" icono="!" titulo="No se pudo verificar" texto={estado.error || ''} />}
          {resultado && <ResultadoVerificacion r={resultado} />}
        </div>
      </main>
    </div>
  );
}
