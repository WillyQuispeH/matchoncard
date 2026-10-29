import { fechaLarga } from '@/utils/formato';
import type { IFirmaVerificada, IVerificacion } from '@/store/interfaces/verificacion.interface';

type Tono = 'ok' | 'warn' | 'bad';
const BORDE: Record<Tono, string> = { ok: 'border-ok/50', warn: 'border-warn/50', bad: 'border-bad/50' };
const ICONO: Record<Tono, string> = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad' };

export function Veredicto({ tono, icono, titulo, texto }: { tono: Tono; icono: string; titulo: string; texto: string }) {
  return (
    <div className={`flex items-start gap-3.5 rounded-xl border bg-surface px-5 py-[18px] ${BORDE[tono]}`}>
      <div className={`grid size-[34px] flex-none place-items-center rounded-full font-bold text-accent-ink ${ICONO[tono]}`}>{icono}</div>
      <div>
        <h2 className="mb-1 mt-0.5 text-xl leading-[1.25]">{titulo}</h2>
        <p className="text-[15px] text-ink-2">{texto}</p>
      </div>
    </div>
  );
}

const Chip = ({ ok, si, no }: { ok: boolean; si: string; no: string }) => (
  <span className={`whitespace-nowrap rounded-full border px-2 py-[3px] font-mono text-xs font-medium ${ok ? 'border-ok/40 text-ok' : 'border-bad/40 text-bad'}`}>{ok ? si : no}</span>
);
const Tarjeta = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-2.5 rounded-[10px] border border-line bg-sunken px-4 py-3.5">{children}</div>
);
const Subtitulo = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2.5 mt-7 font-sans text-[15px] font-semibold text-ink-2">{children}</h3>
);

const valida = (f: IFirmaVerificada) => f.integra && f.emitida_por_matchoncard && f.modificaciones_permitidas;

export function ResultadoVerificacion({ r }: { r: IVerificacion }) {
  const personas = r.firmas.filter((f) => f.tipo === 'firma');
  const sello = r.firmas.find((f) => f.tipo === 'sello');
  const previas = r.firmas.filter((f) => f.tipo === 'previa');
  const tono: Tono = r.valido ? (r.firmas_pendientes ? 'warn' : 'ok') : 'bad';
  const titulo = r.valido
    ? (r.firmas_pendientes ? 'Firmas válidas · documento aún en proceso' : 'Documento auténtico e íntegro')
    : (!r.firmas.length ? 'Sin firmas electrónicas' : 'Documento no válido');
  // un firmante puede firmar en varios recuadros: se agrupa por nombre
  const porNombre = new Map<string, IFirmaVerificada[]>();
  for (const f of personas) { const k = f.nombre || '—'; porNombre.set(k, [...(porNombre.get(k) || []), f]); }

  return (
    <>
      <Veredicto tono={tono} icono={r.valido ? '✓' : '!'} titulo={titulo} texto={r.resumen} />
      {r.registro.encontrado && !r.registro.es_version_vigente && (
        <p className="mt-7 text-[13.5px] text-ink-3">Esta es una versión intermedia del documento: existe una versión posterior con más firmas.</p>
      )}
      {personas.length > 0 && (
        <>
          <Subtitulo>Firmantes ({personas.length}{r.firmas_pendientes ? ` · faltan ${r.firmas_pendientes} recuadro(s) por firmar` : ''})</Subtitulo>
          {[...porNombre].map(([nombre, fs]) => {
            const val = (fs[0].motivo || '').match(/\(([0-9a-f-]{36})\)/i);
            return (
              <Tarjeta key={nombre}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <b className="text-base">{nombre}</b><Chip ok={fs.every(valida)} si="firma válida" no="firma no válida" />
                </div>
                <div className="mt-1 break-words text-[13.5px] text-ink-3">
                  {fechaLarga(fs[0].fecha)}{fs.length > 1 ? ` · firmó en ${fs.length} lugares del documento` : ''}<br />
                  Firma electrónica simple con validación de huella, rostro y firma contra la cédula{val ? ` · validación ${val[1].slice(0, 8)}` : ''}
                </div>
              </Tarjeta>
            );
          })}
        </>
      )}
      {sello && (
        <>
          <Subtitulo>Sello del documento</Subtitulo>
          <Tarjeta>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <b className="text-base">MatchOnCard</b><Chip ok={sello.integra && sello.modificaciones_permitidas} si="sin alteraciones" no="alterado" />
            </div>
            <div className="mt-1 text-[13.5px] text-ink-3">
              Registrado el {fechaLarga(sello.fecha)}.{' '}
              {sello.certificacion
                ? 'Después del registro el documento solo admite firmas electrónicas de los firmantes designados.'
                : 'El documento ya traía firmas de otro sistema: se conservaron y se agregaron las de los firmantes designados.'}
            </div>
          </Tarjeta>
        </>
      )}
      {previas.length > 0 && (
        <>
          <Subtitulo>Firmas anteriores al registro ({previas.length})</Subtitulo>
          {previas.map((f, i) => (
            <Tarjeta key={i}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <b className="text-base">{f.nombre || 'Firma de otro sistema'}</b><Chip ok={f.integra && f.modificaciones_permitidas} si="íntegra" no="no válida" />
              </div>
              <div className="mt-1 text-[13.5px] text-ink-3">
                {f.fecha ? `${fechaLarga(f.fecha)} · ` : ''}El PDF ya traía esta firma al registrarse. Verificamos que siga íntegra; no la emite MatchOnCard.
              </div>
            </Tarjeta>
          ))}
        </>
      )}
      <Subtitulo>Huella digital del archivo (SHA-256)</Subtitulo>
      <div className="break-all font-mono text-[13px] text-ink-3">{r.sha256}</div>
      <p className="mt-7 text-[13.5px] text-ink-3">La verificación revisa la criptografía de cada firma y que el contenido no haya cambiado después de firmar. El archivo no se almacena.</p>
    </>
  );
}
