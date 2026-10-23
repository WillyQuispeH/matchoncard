'use client';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { DataList, Section } from '@/components/ui/Section';
import { descargar } from '@/utils/descargar';
import { fechaCorta } from '@/utils/formato';
import { COLORES, ESTADOS } from '@/utils/textos';
import { useDocumento } from '@/store/hooks/useDocumento.hook';
import { usePanel } from '@/store/hooks/usePanel.hook';
import type { IFirmante } from '@/store/interfaces/documento.interface';

export function DetalleDocumento({ id, alCerrar }: { id: string; alCerrar: () => void }) {
  const { detalle: doc, estadoDetalle, estadoAccion, errorAccion, documentoDetalle, documentoPdf, documentoEnlace, documentoCancelar } = useDocumento();
  const { panelLateral, panelDialogo, panelAviso } = usePanel();
  useEffect(() => { void documentoDetalle(id); }, [id, documentoDetalle]);

  if (estadoDetalle.onError && !doc) return <ErrorMessage mensaje={estadoDetalle.error} />;
  if (!doc || doc.documento_id !== id) return <p className="text-ink-2">Cargando…</p>;

  const enCurso = doc.estado === 'pendiente';
  const bajarPdf = async () => { const r = await documentoPdf(id); if (r) descargar(r.blob, r.nombre); };
  const nuevoLink = async (f: IFirmante) => {
    const r = await documentoEnlace(id, f.firmante_id);
    if (r) panelDialogo({ tipo: 'enlaces', datos: { titulo: 'Link nuevo', nota: 'El link anterior de este firmante ya no sirve.', documento: doc.nombre,
      items: [{ nombre: f.nombre, url: r.url_captura, expira: r.expira_en }] } });
  };
  const cancelar = () => panelDialogo({
    tipo: 'motivo', titulo: 'Cancelar documento', peligro: true, accion: 'Cancelar documento',
    texto: 'Los firmantes que faltan ya no podrán firmar y sus links dejan de servir. Las firmas ya estampadas se conservan.',
    alConfirmar: async (motivo) => ((await documentoCancelar(id, motivo)) ? (panelAviso('Documento cancelado'), null) : errorAccion() || 'No se pudo cancelar.'),
  });

  return (
    <>
      <div className="flex items-start gap-3">
        <div>
          <span className="font-mono text-xs text-ink-3">{doc.documento_id}</span>
          <h2 className="mt-1 text-[26px]">{doc.nombre}</h2>
          <div className="mt-2">
            <Badge tono={doc.estado}>{ESTADOS[doc.estado] || doc.estado}</Badge>
            <span className="ml-1.5 text-[13px] text-ink-3">{doc.firmantes.filter((f) => f.estado === 'firmado').length} de {doc.firmantes.length} firmas · orden {doc.orden}</span>
          </div>
        </div>
        <Button variante="ghost" className="ml-auto" aria-label="Cerrar" onClick={alCerrar}>✕</Button>
      </div>

      {doc.motivo_cancelacion && <Section titulo="Cancelado" aviso><p className="text-ink-2">{doc.motivo_cancelacion}</p></Section>}

      <Section titulo="Firmantes">
        <div className="grid gap-2.5">
          {doc.firmantes.map((f, i) => (
            <div key={f.firmante_id} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-xl bg-sunken p-3">
              <span className="grid size-7 place-items-center rounded-full font-mono text-[13px] font-semibold text-accent-ink" style={{ background: COLORES[i % COLORES.length] }}>{f.orden}</span>
              <div>
                <b>{f.nombre}</b> <span className="font-mono text-[13px] text-ink-3">{f.rut}</span>
                <small className="block text-ink-3">
                  {f.ubicaciones.length} recuadro(s) en página(s) {[...new Set(f.ubicaciones.map((u) => u.pagina))].join(', ')}
                  {f.validacion_estado && ` · validación: ${ESTADOS[f.validacion_estado] || f.validacion_estado}`}
                  {f.firmado_en && ` · firmó ${fechaCorta(f.firmado_en)}`}
                  {f.observaciones && <> · <span className="text-warn">{f.observaciones}</span></>}
                </small>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tono={f.estado}>{ESTADOS[f.estado] || f.estado}</Badge>
                {enCurso && f.estado === 'pendiente' && <Button tamano="sm" disabled={estadoAccion.onLoading} onClick={() => void nuevoLink(f)}>Nuevo link</Button>}
                {f.validacion_id && <Button tamano="sm" variante="ghost" onClick={() => panelLateral({ tipo: 'validacion', id: f.validacion_id! })}>Ver validación</Button>}
              </div>
            </div>
          ))}
        </div>
        {enCurso && <p className="text-[13px] text-ink-3">El link solo se muestra al crearlo. Si el firmante lo perdió, venció o su validación fue rechazada, genera uno nuevo (el anterior deja de servir).</p>}
      </Section>

      <Section titulo="Documento">
        <DataList items={[
          ['Páginas', doc.paginas],
          ['Versión vigente', doc.version],
          ['SHA-256 original', doc.sha256_original, true],
          ['SHA-256 vigente', doc.sha256_actual, true],
          ['Registrado', fechaCorta(doc.creado_en)],
          ...(doc.completado_en ? [['Completado', fechaCorta(doc.completado_en)] as [string, string]] : []),
          ...(doc.referencia ? [['Referencia', doc.referencia] as [string, string]] : []),
        ]} />
      </Section>

      <div className="flex flex-wrap gap-2.5">
        <Button variante="primary" disabled={estadoAccion.onLoading} onClick={bajarPdf}>
          {doc.estado === 'completado' ? 'Descargar PDF firmado' : `Descargar PDF (versión ${doc.version})`}
        </Button>
        <Button variante="ghost" onClick={() => void documentoDetalle(id)}>Actualizar</Button>
        {enCurso && <Button variante="danger" onClick={cancelar}>Cancelar documento</Button>}
      </div>
      <ErrorMessage mensaje={estadoAccion.error} />
    </>
  );
}
