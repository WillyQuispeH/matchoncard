'use client';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { DataList, Section } from '@/components/ui/Section';
import { Spinner } from '@/components/ui/Spinner';
import { descargar } from '@/utils/descargar';
import { fechaCorta, fechaDia, pct } from '@/utils/formato';
import { ESTADOS, MOTIVOS } from '@/utils/textos';
import { usePanel } from '@/store/hooks/usePanel.hook';
import { useValidacion } from '@/store/hooks/useValidacion.hook';
import { RevisionFactores } from './RevisionFactores';

function Puntaje({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  return (
    <div className="rounded-xl bg-sunken p-3">
      <span className="text-xs text-ink-3">{titulo}</span>
      <b className="block font-cond text-2xl font-semibold">{valor}</b>
      <span className="text-xs text-ink-3">{nota}</span>
    </div>
  );
}

const Linea = ({ cuando, children }: { cuando: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[118px_1fr] gap-2.5"><span className="font-mono text-ink-3">{fechaCorta(cuando)}</span><span>{children}</span></div>
);

export function DetalleValidacion({ id, alCerrar }: { id: string; alCerrar: () => void }) {
  const { detalle: v, operacion, estadoDetalle, estadoOperacion, estadoAccion, errorAccion, validacionDetalle, validacionInforme, validacionEvidencia, validacionBorrar } = useValidacion();
  const { panelDialogo, panelAviso } = usePanel();
  useEffect(() => { void validacionDetalle(id); }, [id, validacionDetalle]);

  if (estadoDetalle.onError) return <ErrorMessage mensaje={estadoDetalle.error} />;
  if (!v || v.validacion_id !== id) return <p className="text-ink-2">Cargando…</p>;

  const res = v.resultado || {}, p = v.puntajes;
  const emitirInforme = async () => {
    const r = await validacionInforme(id);
    if (r) { descargar(r.blob, `informe-${r.folio}.pdf`); panelAviso(`Informe ${r.folio} emitido`); }
  };
  // la acción devuelve un mensaje de error (o null si salió bien) para mostrarlo en el propio diálogo
  const pedirEvidencia = () => panelDialogo({
    tipo: 'motivo', titulo: 'Descargar evidencia', texto: 'La descarga queda registrada con tu usuario y el motivo.', accion: 'Descargar',
    alConfirmar: async (motivo) => {
      const blob = await validacionEvidencia(id, motivo);
      if (!blob) return errorAccion() || 'No se pudo descargar la evidencia.';
      descargar(blob, `evidencia-${id}.zip`); panelAviso('Evidencia descargada'); return null;
    },
  });
  const pedirBorrado = () => panelDialogo({
    tipo: 'motivo', titulo: 'Borrar datos de esta validación', peligro: true, accion: 'Borrar definitivamente',
    texto: 'Se elimina la evidencia y se destruye su clave: no se puede deshacer. Queda solo el registro de que existió.',
    alConfirmar: async (motivo) => ((await validacionBorrar(id, motivo)) ? (panelAviso('Datos borrados'), null) : errorAccion() || 'No se pudieron borrar los datos.'),
  });

  return (
    <>
      <div className="flex items-start gap-3">
        <div>
          <span className="font-mono text-xs text-ink-3">{v.validacion_id}</span>
          <h2 className="mt-1 text-[26px]">{v.nombre || v.rut || 'Validación'}</h2>
          <div className="mt-2"><Badge tono={v.estado}>{ESTADOS[v.estado] || v.estado}</Badge></div>
        </div>
        <Button variante="ghost" className="ml-auto" aria-label="Cerrar" onClick={alCerrar}>✕</Button>
      </div>

      {v.motivos.length > 0 && (
        <Section titulo="Observaciones" aviso>
          <ul className="m-0 pl-[18px] text-ink-2">{v.motivos.map((m) => <li key={m}>{MOTIVOS[m] || m}</li>)}</ul>
        </Section>
      )}

      {p && (
        <div className="grid grid-cols-3 gap-2.5">
          <Puntaje titulo="Huella" valor={pct(p.huella)} nota={res.huella?.veredicto || ''} />
          <Puntaje titulo="Rostro" valor={pct(p.rostro)} nota={p.prueba_de_vida ? 'vida ✓' : 'vida —'} />
          <Puntaje titulo="Firma" valor={p.firma != null ? `${p.firma}/100` : '—'} nota={res.firma?.veredicto || ''} />
        </div>
      )}

      {v.tiene_evidencia && (
        <Section titulo="Revisión de los 3 factores">
          {estadoOperacion.onError ? <ErrorMessage mensaje={estadoOperacion.error} />
            : operacion ? <RevisionFactores op={operacion} /> : <Spinner texto="Abriendo la evidencia cifrada…" />}
        </Section>
      )}

      {v.informes.length > 0 && (
        <Section titulo="Informes emitidos">
          <div className="grid gap-2.5 text-[13px]">
            {v.informes.map((i) => (
              <Linea key={i.folio} cuando={i.emitido_en}>
                <b className="font-mono">{i.folio}</b> · {i.emitido_por}<br /><span className="font-mono text-[11px] text-ink-3">{i.sha256}</span>
              </Linea>
            ))}
          </div>
        </Section>
      )}

      <Section titulo="Datos">
        <DataList items={[
          ['RUT', <span key="r" className="font-mono">{v.rut || '—'}</span>],
          ['Documento', v.documento_id || '—'],
          ['Referencia', v.referencia || '—'],
          ['Resultado en el teléfono', v.veredicto_dispositivo || '—'],
          ['Dispositivo', res.dispositivo?.modelo || res.dispositivo?.perfil || '—'],
          ['Duración', res.duracion_ms ? `${Math.round(res.duracion_ms / 1000)} s` : '—'],
          ['Integridad', v.integridad],
          ['SHA-256 evidencia', v.evidencia_sha256 || '—', true],
          ['Creada', fechaCorta(v.creada_en)],
          ['Se borra el', fechaDia(v.retener_hasta)],
        ]} />
      </Section>

      {v.consentimiento && (
        <Section titulo="Consentimiento">
          <p className="text-sm text-ink-2">{v.consentimiento_texto || ''}</p>
          <DataList items={[['Otorgado', fechaCorta(v.consentimiento.otorgado_en)], ['Versión', v.consentimiento.version]]} />
        </Section>
      )}

      <div className="flex flex-wrap gap-2.5">
        <Button variante="primary" disabled={!v.tiene_evidencia || estadoAccion.onLoading} onClick={emitirInforme}>
          {estadoAccion.onLoading ? 'Procesando…' : 'Emitir informe'}
        </Button>
        <Button disabled={!v.tiene_evidencia} onClick={pedirEvidencia}>Descargar evidencia</Button>
        {v.estado !== 'borrada' && <Button variante="danger" onClick={pedirBorrado}>Borrar datos</Button>}
      </div>
      <ErrorMessage mensaje={estadoAccion.error} />

      <Section titulo="Historial">
        <div className="grid gap-2.5 text-[13px]">
          {v.historial.map((h, i) => (
            <Linea key={i} cuando={h.en}>
              {h.accion} <span className="text-ink-3">· {h.actor}</span>
              {h.detalle?.motivo && <><br /><span className="text-ink-3">“{h.detalle.motivo}”</span></>}
            </Linea>
          ))}
        </div>
      </Section>
    </>
  );
}
