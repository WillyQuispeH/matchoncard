import type { IResumen } from '@/store/interfaces/validacion.interface';

interface Props { resumen: IResumen | null; estado: string; alElegir: (estado: string) => void }

// Tarjetas de los últimos 30 días; al elegir una se filtra la lista
export function ResumenEstados({ resumen, estado, alElegir }: Props) {
  const n = (e: string) => resumen?.porEstado.find((x) => x.estado === e)?.n || 0;
  const items: [string, string, number][] = [
    ['', 'Total', resumen?.porEstado.reduce((a, x) => a + x.n, 0) || 0],
    ['aprobada', 'Aprobadas', n('aprobada')],
    ['rechazada', 'Rechazadas', n('rechazada')],
    ['revision', 'En revisión', n('revision')],
    ['en_curso', 'En curso', n('creada') + n('en_captura') + n('consentida')],
    ['expirada', 'Expiradas', n('expirada')],
  ];
  return (
    <div className="grid grid-cols-6 gap-3 max-[900px]:grid-cols-3">
      {items.map(([k, t, v]) => {
        const on = estado === k || (k === 'en_curso' && estado === 'en_captura');
        return (
          <button key={k || 'total'} onClick={() => alElegir(k === 'en_curso' ? 'en_captura' : k)}
            className={`rounded-[14px] border bg-surface px-4 py-3.5 text-left ${on ? 'border-accent' : 'border-line'}`}>
            <b className="block font-cond text-[28px] font-semibold">{v}</b>
            <span className="text-[13px] text-ink-2">{t}</span>
          </button>
        );
      })}
    </div>
  );
}
