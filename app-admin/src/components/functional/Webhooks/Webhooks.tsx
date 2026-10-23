'use client';
import { useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InputSelect } from '@/components/ui/InputSelect';
import { Table, type Columna } from '@/components/ui/Table';
import { config } from '@/utils/config';
import { fechaCorta } from '@/utils/formato';
import { TONO_WEBHOOK } from '@/utils/textos';
import { useCliente } from '@/store/hooks/useCliente.hook';
import { usePanel } from '@/store/hooks/usePanel.hook';
import { useWebhook } from '@/store/hooks/useWebhook.hook';
import type { EstadoWebhook, IWebhook } from '@/store/interfaces/webhook.interface';
import { DetalleWebhook } from './DetalleWebhook';

const ESTADOS: [EstadoWebhook | '', string][] = [['fallido', 'Fallidos'], ['pendiente', 'Pendientes'], ['entregado', 'Entregados'], ['descartado', 'Descartados'], ['', 'Todos']];

const COLUMNAS: Columna<IWebhook>[] = [
  { titulo: '#', celda: (w) => <span className="font-mono text-[13px]">{w.id}</span> },
  { titulo: 'Evento', celda: (w) => <span className="font-mono text-[13px]">{w.evento}</span> },
  { titulo: 'Cliente', ocultarMovil: true, celda: (w) => w.cliente_id },
  { titulo: 'Estado', celda: (w) => <Badge tono={TONO_WEBHOOK[w.estado]}>{w.estado}</Badge> },
  { titulo: 'Intentos', numerica: true, celda: (w) => w.intentos },
  { titulo: 'Último error', ocultarMovil: true, clase: 'max-w-[280px] truncate text-ink-3', celda: (w) => w.ultimo_error || '—' },
  { titulo: 'Próximo / entregado', ocultarMovil: true, celda: (w) => <span className="font-mono text-[13px]">{fechaCorta(w.entregado_en || (w.estado === 'pendiente' ? w.proximo_en : null))}</span> },
];

export function Webhooks() {
  const { lista, filtro, detalle, estadoLista, estadoAccion, webhookListar, webhookFiltrar, webhookDetalle, webhookReintentar, webhookDescartar } = useWebhook();
  const { lista: clientes } = useCliente();
  const { panelAviso } = usePanel();

  useEffect(() => { void webhookListar(); }, [webhookListar]);
  useEffect(() => {
    if (detalle) return;
    const t = setInterval(() => void webhookListar(), config.refrescoMs);
    return () => clearInterval(t);
  }, [detalle, webhookListar]);

  const n = (e: EstadoWebhook) => lista?.resumen.find((x) => x.estado === e)?.n || 0;
  const paginas = lista ? Math.max(1, Math.ceil(lista.total / lista.tam)) : 1;

  return (
    <>
      <PageHeader sobretitulo="AVISOS A LOS CLIENTES" titulo="Webhooks">
        <Button variante="ghost" onClick={() => void webhookListar()}>Actualizar</Button>
      </PageHeader>
      <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2">
        {(['fallido', 'pendiente', 'entregado', 'descartado'] as EstadoWebhook[]).map((e) => (
          <button key={e} onClick={() => void webhookFiltrar({ estado: e })}
            className={`rounded-[14px] border bg-surface px-4 py-3.5 text-left ${filtro.estado === e ? 'border-accent' : 'border-line'}`}>
            <b className={`block font-cond text-[28px] font-semibold ${e === 'fallido' && n(e) ? 'text-bad' : ''}`}>{n(e)}</b>
            <span className="text-[13px] text-ink-2">{ESTADOS.find(([k]) => k === e)?.[1]}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <InputSelect aria-label="Estado" className="max-w-[200px]" opciones={ESTADOS} value={filtro.estado} onChange={(e) => void webhookFiltrar({ estado: e.target.value })} />
        <InputSelect aria-label="Cliente" className="max-w-[240px]" value={filtro.cliente} onChange={(e) => void webhookFiltrar({ cliente: e.target.value })}
          opciones={[['', 'Todos los clientes'], ...(clientes || []).map((c): [string, string] => [c.id, c.nombre])]} />
        <span className="text-[13px] text-ink-3">Un webhook queda <b>fallido</b> tras 8 intentos (1, 2, 4… minutos). Reintentar lo vuelve a la cola de inmediato.</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <Table columnas={COLUMNAS} filas={estadoLista.error ? [] : lista?.filas || null} clave={(w) => String(w.id)} alElegir={(w) => void webhookDetalle(w.id)}
          vacio={estadoLista.error || (lista ? 'No hay webhooks con este filtro.' : 'Cargando…')} />
        {lista && (
          <div className="flex items-center justify-end gap-2.5 px-3.5 py-2.5 text-sm text-ink-2">
            {lista.total} en total · página {lista.pagina} de {paginas}
            <Button disabled={lista.pagina <= 1} onClick={() => void webhookFiltrar({ pagina: lista.pagina - 1 })}>Anterior</Button>
            <Button disabled={lista.pagina >= paginas} onClick={() => void webhookFiltrar({ pagina: lista.pagina + 1 })}>Siguiente</Button>
          </div>
        )}
      </div>
      {detalle && (
        <DetalleWebhook w={detalle} error={estadoAccion.error} ocupado={estadoAccion.onLoading} alCerrar={() => void webhookDetalle(null)}
          alReintentar={async () => { if (await webhookReintentar(detalle.id)) panelAviso('Webhook en cola: se envía ahora'); }}
          alDescartar={async () => { if (await webhookDescartar(detalle.id)) panelAviso('Webhook descartado'); }} />
      )}
    </>
  );
}
