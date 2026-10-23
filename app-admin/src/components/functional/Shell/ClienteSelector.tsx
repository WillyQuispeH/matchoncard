'use client';
import { InputSelect } from '@/components/ui/InputSelect';
import { useCliente } from '@/store/hooks/useCliente.hook';

// Cliente sobre el que se ven y crean validaciones y documentos
export function ClienteSelector() {
  const { lista, actual, clienteElegir } = useCliente();
  if (!lista?.length) return null;
  return (
    <label className="flex items-center gap-2 text-[13px] text-ink-3">
      Cliente
      <InputSelect aria-label="Cliente" className="min-w-[200px]" value={actual || ''} onChange={(e) => clienteElegir(e.target.value)}
        opciones={lista.map((c) => [c.id, `${c.nombre}${c.activo ? '' : ' (inactivo)'}`])} />
    </label>
  );
}
