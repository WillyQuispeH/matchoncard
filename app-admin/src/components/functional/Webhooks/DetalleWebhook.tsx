'use client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Modal } from '@/components/ui/Modal';
import { DataList } from '@/components/ui/Section';
import { fechaCorta } from '@/utils/formato';
import type { IWebhookDetalle } from '@/store/interfaces/webhook.interface';
import { TONO_WEBHOOK } from '@/utils/textos';

interface Props { w: IWebhookDetalle; error: string | null; ocupado: boolean; alReintentar: () => void; alDescartar: () => void; alCerrar: () => void }

export function DetalleWebhook({ w, error, ocupado, alReintentar, alDescartar, alCerrar }: Props) {
  const abierto = w.estado === 'pendiente' || w.estado === 'fallido';
  return (
    <Modal titulo={`Webhook #${w.id}`} ancho="lg" alCerrar={alCerrar}>
      <div className="flex items-center gap-2"><Badge tono={TONO_WEBHOOK[w.estado]}>{w.estado}</Badge><span className="font-mono text-sm">{w.evento}</span></div>
      <DataList items={[
        ['Cliente', w.cliente_id],
        ['URL', w.url, true],
        ['Intentos', String(w.intentos)],
        ['Próximo intento', abierto && w.estado === 'pendiente' ? fechaCorta(w.proximo_en) : '—'],
        ['Entregado', fechaCorta(w.entregado_en)],
        ['Último error', w.ultimo_error || '—'],
        ...(w.descartado_en ? [['Descartado', `${fechaCorta(w.descartado_en)} · ${w.descartado_por}`] as [string, string]] : []),
        ...(w.validacion_id ? [['Validación', w.validacion_id, true] as [string, string, boolean]] : []),
        ...(w.documento_id ? [['Documento', w.documento_id, true] as [string, string, boolean]] : []),
      ]} />
      <div className="grid gap-1.5">
        <span className="text-[13px] text-ink-3">Cuerpo enviado (firmado con HMAC en cada intento)</span>
        <pre className="m-0 max-h-[260px] overflow-auto rounded-xl border border-line bg-deep p-3 font-mono text-xs text-ink-2">{JSON.stringify(w.cuerpo, null, 2)}</pre>
      </div>
      <ErrorMessage mensaje={error} />
      <div className="flex flex-wrap justify-end gap-2.5">
        {abierto && <Button variante="danger" disabled={ocupado} onClick={alDescartar}>Descartar</Button>}
        {abierto && <Button variante="primary" disabled={ocupado} onClick={alReintentar}>Reintentar ahora</Button>}
        <Button variante="ghost" onClick={alCerrar}>Cerrar</Button>
      </div>
    </Modal>
  );
}
