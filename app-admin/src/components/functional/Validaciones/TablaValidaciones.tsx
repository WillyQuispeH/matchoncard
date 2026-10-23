import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, type Columna } from '@/components/ui/Table';
import { fechaCorta, pct } from '@/utils/formato';
import { ESTADOS } from '@/utils/textos';
import type { IListaValidaciones, IValidacion } from '@/store/interfaces/validacion.interface';

const COLUMNAS: Columna<IValidacion>[] = [
  { titulo: 'Fecha', celda: (v) => <span className="font-mono text-[13px]">{fechaCorta(v.creada_en)}</span> },
  { titulo: 'RUT', celda: (v) => <span className="font-mono">{v.rut || '—'}</span> },
  { titulo: 'Nombre', ocultarMovil: true, celda: (v) => v.nombre || '—' },
  { titulo: 'Referencia', ocultarMovil: true, clase: 'text-ink-3', celda: (v) => v.referencia || v.documento_id || '—' },
  { titulo: 'Estado', celda: (v) => <Badge tono={v.estado}>{ESTADOS[v.estado] || v.estado}</Badge> },
  { titulo: 'Huella', numerica: true, ocultarMovil: true, celda: (v) => (v.puntajes ? pct(v.puntajes.huella) : '—') },
  { titulo: 'Rostro', numerica: true, ocultarMovil: true, celda: (v) => (v.puntajes ? pct(v.puntajes.rostro) : '—') },
  { titulo: 'Firma', numerica: true, ocultarMovil: true, celda: (v) => (v.puntajes?.firma != null ? `${v.puntajes.firma}/100` : '—') },
];

interface Props { lista: IListaValidaciones | null; error: string | null; alElegir: (id: string) => void; alPaginar: (pagina: number) => void }

export function TablaValidaciones({ lista, error, alElegir, alPaginar }: Props) {
  const pagina = lista?.pagina || 1;
  const paginas = lista ? Math.max(1, Math.ceil(lista.total / lista.tam || 1)) : 1;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Table columnas={COLUMNAS} filas={error ? [] : lista?.filas || null} clave={(v) => v.validacion_id} alElegir={(v) => alElegir(v.validacion_id)}
        vacio={error || (lista ? 'No hay validaciones con estos filtros.' : 'Cargando…')} />
      {lista && (
        <div className="flex items-center justify-end gap-2.5 px-3.5 py-2.5 text-sm text-ink-2">
          {lista.total} en total · página {pagina} de {paginas}
          <Button disabled={pagina <= 1} onClick={() => alPaginar(pagina - 1)}>Anterior</Button>
          <Button disabled={pagina >= paginas} onClick={() => alPaginar(pagina + 1)}>Siguiente</Button>
        </div>
      )}
    </div>
  );
}
