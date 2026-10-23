'use client';
import { useState } from 'react';
import { pct } from '@/utils/formato';
import type { IOperacion } from '@/store/interfaces/operacion.interface';

const tonoVeredicto = (t: string | null) =>
  /coincide|compatible/i.test(t || '') ? 'bg-[#143328] text-ok' : /no /i.test(t || '') ? 'bg-[#3a1e1a] text-bad' : 'bg-[#362a12] text-warn';

function Veredicto({ texto }: { texto: string | null }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-[9px] py-[3px] font-mono text-xs font-semibold ${tonoVeredicto(texto)}`}>{texto || '—'}</span>;
}

function Figura({ src, titulo, clara, alAmpliar }: { src: string | null; titulo: string; clara?: boolean; alAmpliar: (s: string) => void }) {
  return (
    <figure className="m-0 grid grid-rows-[170px_auto] overflow-hidden rounded-xl border border-line bg-deep">
      {src   // data: URI descifrada al vuelo (no pasa por next/image)
        ? <img src={src} alt={titulo} onClick={() => alAmpliar(src)} className={`h-[170px] w-full cursor-zoom-in object-contain ${clara ? 'bg-[#f4f4f4]' : 'bg-[#0f171d]'}`} />
        : <div className="grid h-[170px] place-items-center text-[13px] text-ink-3">sin imagen</div>}
      <figcaption className="px-2.5 py-1.5 text-xs text-ink-3">{titulo}</figcaption>
    </figure>
  );
}

function Factor({ titulo, valor, veredicto, children, nota }: { titulo: string; valor?: string; veredicto?: string | null; children: React.ReactNode; nota?: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <b className="font-cond text-base font-semibold">{titulo}</b>
        {valor && <span className="font-mono">{valor}</span>}
        {veredicto !== undefined && <Veredicto texto={veredicto} />}
      </div>
      <div className="grid grid-cols-2 gap-2.5 max-[700px]:grid-cols-1">{children}</div>
      {nota && <p className="text-[13px] text-ink-2">{nota}</p>}
    </div>
  );
}

export function RevisionFactores({ op }: { op: IOperacion }) {
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const I = op.imagenes, D = op.datos;
  const f = (k: string, t: string, clara?: boolean) => <Figura src={I[k]} titulo={t} clara={clara} alAmpliar={setAmpliada} />;
  return (
    <div className="grid gap-3.5">
      <Factor titulo="1 · Huella" valor={pct(D.huella.probabilidad)} veredicto={D.huella.veredicto}
        nota={<>{D.huella.fragmentos ?? '—'} fotogramas evaluados
          {D.huella.zonas != null && ` · ${D.huella.zonas} de ${D.huella.zonasTotal} zonas calzan en el mejor`}
          {D.huella.cobertura != null && ` · cobertura ${Math.round(D.huella.cobertura * 100)}%`}
          {D.huella.muestraDebil && <> · <span className="text-warn">huella de la cédula de baja calidad</span></>}</>}>
        {f('huella_cedula', 'Huella impresa en la cédula')}{f('huella_capturada', 'Huella capturada con el teléfono')}
      </Factor>
      <Factor titulo="2 · Rostro" valor={pct(D.rostro.probabilidad)} veredicto={D.rostro.veredicto}
        nota={<>Distancia {D.rostro.distancia ?? '—'} · prueba de vida {D.rostro.vida ? `superada (${D.rostro.desafios.join(' y ')})` : <span className="text-warn">incompleta</span>}
          {D.rostro.alertas.length > 0 && ` · ${D.rostro.alertas.join('; ')}`}</>}>
        {f('rostro_cedula', 'Foto de la cédula')}{f('rostro_selfie', 'Selfie con prueba de vida')}
      </Factor>
      <Factor titulo="3 · Firma" valor={`${D.firma.parecido ?? '—'}/100`} veredicto={D.firma.veredicto}
        nota={<>Consistencia entre firmas {D.firma.consistencia ?? '—'}/100{D.firma.porFirma.length > 0 && ` · por firma: ${D.firma.porFirma.join(' · ')}`}</>}>
        {f('firma_cedula', 'Firma impresa en la cédula', true)}{f('firma_dibujada', `Mejor firma dibujada (n.º ${D.firma.mejor + 1})`)}
      </Factor>
      <Factor titulo="Cédula">
        {f('cedula_frente', 'Frente')}{f('cedula_reverso', 'Reverso')}
      </Factor>
      <p className="-mt-2 text-[13px] text-ink-3">
        {[D.cedula.nombres, D.cedula.apellidos].filter(Boolean).join(' ')} · RUN {D.cedula.run || '—'}{D.cedula.runMrz ? ` · MRZ ${D.cedula.runMrz}` : ''}
      </p>
      {ampliada && (
        <div onClick={() => setAmpliada(null)} className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-black/85 p-5">
          <img src={ampliada} alt="" className="max-h-full max-w-full rounded-lg bg-white" />
        </div>
      )}
    </div>
  );
}
