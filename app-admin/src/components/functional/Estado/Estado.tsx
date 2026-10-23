'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { config } from '@/utils/config';
import { fechaCorta } from '@/utils/formato';
import { useAuditoria } from '@/store/hooks/useAuditoria.hook';

export function Estado() {
  const { sistema, estadoSistema, auditoriaEstado } = useAuditoria();
  useEffect(() => {
    void auditoriaEstado();
    const t = setInterval(() => void auditoriaEstado(), config.refrescoMs);
    return () => clearInterval(t);
  }, [auditoriaEstado]);
  const n = (e: string) => sistema?.webhooks.find((x) => x.estado === e)?.n || 0;

  return (
    <>
      <PageHeader sobretitulo={sistema ? `REVISADO ${fechaCorta(sistema.fecha).toUpperCase()}` : 'SALUD DEL SISTEMA'} titulo="Estado">
        <Button variante="ghost" disabled={estadoSistema.onLoading} onClick={() => void auditoriaEstado()}>Revisar ahora</Button>
      </PageHeader>
      <ErrorMessage mensaje={estadoSistema.error} />
      {!sistema ? <Spinner texto="Revisando los servicios…" /> : (
        <>
          <div className={`rounded-[14px] border px-5 py-4 font-cond text-xl font-semibold ${sistema.ok ? 'border-ok/40 text-ok' : 'border-bad/50 text-bad'}`}>
            {sistema.ok ? 'Todo funciona' : 'Hay servicios con problemas'}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {sistema.componentes.map((c) => (
              <div key={c.nombre} className={`grid gap-1.5 rounded-[14px] border bg-surface px-4 py-3.5 ${c.ok ? 'border-line' : 'border-bad/50'}`}>
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${c.ok ? 'bg-ok' : 'bg-bad'}`} />
                  <b className="font-cond text-lg">{c.nombre}</b>
                  <span className="ml-auto font-mono text-xs text-ink-3">{c.ms} ms</span>
                </div>
                <span className={`text-sm ${c.ok ? 'text-ink-2' : 'text-bad'}`}>{c.detalle}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-2">
            <h2 className="text-lg">Cola de webhooks</h2>
            <p className="text-sm text-ink-2">
              {n('pendiente')} pendientes · <span className={n('fallido') ? 'text-bad' : ''}>{n('fallido')} fallidos</span> · {n('entregado')} entregados · {n('descartado')} descartados.{' '}
              {n('fallido') > 0 && <Link href="/webhooks" className="text-accent">Revisar los fallidos</Link>}
            </p>
          </div>
        </>
      )}
    </>
  );
}
