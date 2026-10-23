'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { InputSelect } from '@/components/ui/InputSelect';
import { InputText } from '@/components/ui/InputText';
import { Table, type Columna } from '@/components/ui/Table';
import { useAuditoria } from '@/store/hooks/useAuditoria.hook';
import type { IFiltroAuditoria, IRegistroAuditoria } from '@/store/interfaces/auditoria.interface';

const fecha = (d: string) => new Date(d).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export function Auditoria() {
  const { lista, filtro, acciones, estadoLista, auditoriaListar, auditoriaFiltrar, auditoriaLimpiar, auditoriaAcciones } = useAuditoria();
  const [f, setF] = useState<IFiltroAuditoria>(filtro);
  const [abierto, setAbierto] = useState<number | null>(null);
  useEffect(() => { void auditoriaListar(); void auditoriaAcciones(); }, [auditoriaListar, auditoriaAcciones]);
  useEffect(() => setF(filtro), [filtro]);

  const campo = (k: keyof IFiltroAuditoria) => ({ value: String(f[k]), onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }) });
  const columnas: Columna<IRegistroAuditoria>[] = [
    { titulo: 'Fecha', celda: (r) => <span className="whitespace-nowrap font-mono text-[13px]">{fecha(r.en)}</span> },
    { titulo: 'Acción', celda: (r) => <span className="font-mono text-[13px]">{r.accion}</span> },
    { titulo: 'Actor', celda: (r) => r.actor },
    { titulo: 'IP', ocultarMovil: true, celda: (r) => <span className="font-mono text-[13px] text-ink-3">{r.ip || '—'}</span> },
    { titulo: 'Validación', ocultarMovil: true, celda: (r) => <span className="font-mono text-xs text-ink-3">{r.validacion_id ? r.validacion_id.slice(0, 8) : '—'}</span> },
    { titulo: 'Detalle', clase: 'max-w-[380px]', celda: (r) => (r.detalle ? (
      abierto === r.id
        ? <pre className="m-0 whitespace-pre-wrap break-all font-mono text-xs text-ink-2">{JSON.stringify(r.detalle, null, 2)}</pre>
        : <span className="block truncate font-mono text-xs text-ink-3">{JSON.stringify(r.detalle)}</span>
    ) : '—') },
  ];

  return (
    <>
      <PageHeader sobretitulo="SOLO LECTURA" titulo="Auditoría" />
      <form className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] items-end gap-2.5" onSubmit={(e) => { e.preventDefault(); void auditoriaFiltrar(f); }}>
        <InputText etiqueta="Desde" type="date" {...campo('desde')} />
        <InputText etiqueta="Hasta" type="date" {...campo('hasta')} />
        <label className="grid gap-1.5 text-[13px] font-medium text-ink-2">Acción
          <InputSelect value={f.accion} onChange={(e) => setF({ ...f, accion: e.target.value })} opciones={[['', 'Todas'], ...acciones.map((a): [string, string] => [a, a])]} />
        </label>
        <InputText etiqueta="Actor (contiene)" placeholder="admin:ana, cliente:portalfirma…" {...campo('actor')} />
        <InputText etiqueta="Id de validación" placeholder="uuid completo" {...campo('validacion_id')} />
        <InputText etiqueta="IP" {...campo('ip')} />
        <div className="flex gap-2">
          <Button type="submit" variante="primary">Buscar</Button>
          <Button variante="ghost" onClick={() => void auditoriaLimpiar()}>Limpiar</Button>
        </div>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <Table columnas={columnas} filas={estadoLista.error ? [] : lista?.filas || null} clave={(r) => String(r.id)} alElegir={(r) => setAbierto(abierto === r.id ? null : r.id)}
          vacio={estadoLista.error || (lista ? 'No hay registros con estos filtros.' : 'Cargando…')} />
        {lista && (
          <div className="flex items-center justify-end gap-2.5 px-3.5 py-2.5 text-sm text-ink-2">
            Página {lista.pagina}
            <Button disabled={lista.pagina <= 1} onClick={() => void auditoriaFiltrar({ pagina: lista.pagina - 1 })}>Anterior</Button>
            <Button disabled={!lista.hay_mas} onClick={() => void auditoriaFiltrar({ pagina: lista.pagina + 1 })}>Siguiente</Button>
          </div>
        )}
      </div>
    </>
  );
}
