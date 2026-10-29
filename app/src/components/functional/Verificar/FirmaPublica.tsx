import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { fechaLarga } from '@/utils/formato';
import type { IFirmaPublica, NivelFactor } from '@/store/interfaces/verificacion.interface';
import { Veredicto } from './ResultadoVerificacion';

const FACTOR: Record<string, [string, string, string]> = {   // nivel -> [ícono, texto, color]
  ok: ['✓', 'Coincide', 'border-ok/40 text-ok'],
  warn: ['−', 'No confirmada', 'border-warn/40 text-warn'],
  omitida: ['−', 'Omitida', 'border-warn/40 text-warn'],
  bad: ['✕', 'No coincide', 'border-bad/40 text-bad'],
};

const Factor = ({ nombre, nivel }: { nombre: string; nivel: NivelFactor }) => {
  const [icono, texto, color] = FACTOR[nivel || ''] || ['·', 'Sin dato', 'border-line-2 text-ink-3'];
  return (
    <div className={`flex items-center justify-between rounded-[10px] border bg-sunken px-4 py-3 ${color}`}>
      <span className="font-semibold text-ink">{nombre}</span>
      <span className="font-mono text-[13px] font-medium">{icono} {texto}</span>
    </div>
  );
};

const Dato = ({ k, children, mono }: { k: string; children: React.ReactNode; mono?: boolean }) => (
  <div className="grid gap-1 border-b border-line py-2.5 sm:grid-cols-[200px_1fr] sm:gap-4">
    <dt className="text-[13.5px] text-ink-3">{k}</dt>
    <dd className={`break-words ${mono ? 'break-all font-mono text-[13px]' : 'text-[15px]'}`}>{children}</dd>
  </div>
);

export function FirmaPublica({ firma: f }: { firma: IFirmaPublica | null }) {
  return (
    <div className="text-base leading-[1.6]">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[760px] items-center justify-between px-5">
          <Link href="/" className="text-xl text-ink no-underline"><Logo /></Link>
        </div>
      </header>
      <main className="mx-auto max-w-[760px] px-5 pb-20 pt-12">
        <div className="font-mono text-xs font-medium uppercase leading-none tracking-[0.08em] text-accent">Verificación de firma</div>
        {!f ? (
          <div className="mt-6">
            <Veredicto tono="bad" icono="!" titulo="Firma no encontrada" texto="El enlace no corresponde a una firma registrada en MatchOnCard, o el código está incompleto." />
          </div>
        ) : (
          <>
            <h1 className="mb-6 mt-3.5 text-[clamp(28px,5vw,40px)] leading-[1.1] tracking-[-0.01em]">{f.nombre}</h1>
            <Veredicto
              tono={f.estado === 'aprobada' ? 'ok' : f.estado === 'revision' ? 'warn' : 'bad'}
              icono={f.estado === 'aprobada' ? '✓' : '!'}
              titulo={f.estado_texto}
              texto={`Firmó «${f.documento}» el ${fechaLarga(f.firmado_en)}, después de validar su identidad con la cédula.`}
            />
            <h2 className="mb-2.5 mt-7 font-sans text-[15px] font-semibold text-ink-2">Resultado de los tres factores</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <Factor nombre="Huella" nivel={f.factores.huella} />
              <Factor nombre="Rostro" nivel={f.factores.rostro} />
              <Factor nombre="Firma" nivel={f.factores.firma} />
            </div>
            {f.observaciones.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-[14px] text-ink-2">{f.observaciones.map((o) => <li key={o}>{o}</li>)}</ul>
            )}
            <dl className="mt-7">
              <Dato k="RUT">{f.rut}</Dato>
              <Dato k="Documento">{f.documento}</Dato>
              <Dato k="Solicitado por">{f.solicitado_por}</Dato>
              <Dato k="ID de validación" mono>{f.validacion_id}</Dato>
              <Dato k="SHA-256 de la evidencia" mono>{f.evidencia_sha256 || '—'}</Dato>
            </dl>
            <div className="mt-8 flex flex-wrap gap-3">
              {f.informe_disponible && (
                <ButtonLink href={`/verificar/${f.validacion_id}/informe`} variante="primary" download>Descargar informe de validación (PDF)</ButtonLink>
              )}
              <ButtonLink href="/verificar">Verificar el PDF firmado</ButtonLink>
            </div>
            <p className="mt-7 text-[13.5px] text-ink-3">
              {f.informe_disponible
                ? 'El informe incluye las imágenes de la cédula, la huella, el rostro y la firma con que se validó la identidad. Cada descarga queda registrada. '
                : 'La evidencia de esta validación ya se eliminó al cumplirse su plazo de conservación, por lo que el informe ya no se puede emitir. '}
              Para comprobar que el documento no fue modificado después de firmar, súbelo en Verificar el PDF firmado.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
