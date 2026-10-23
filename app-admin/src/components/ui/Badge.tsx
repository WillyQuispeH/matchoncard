// Pastilla de estado (validaciones, documentos y firmantes)
const TONOS: Record<string, string> = {
  aprobada: 'bg-[#143328] text-ok', completado: 'bg-[#143328] text-ok', firmado: 'bg-[#143328] text-ok',
  rechazada: 'bg-[#3a1e1a] text-bad',
  revision: 'bg-[#362a12] text-warn',
  en_captura: 'bg-[#14262f] text-accent', consentida: 'bg-[#14262f] text-accent', creada: 'bg-[#14262f] text-accent',
  pendiente: 'bg-[#14262f] text-accent', validado: 'bg-[#14262f] text-accent',
};

export function Badge({ tono, children }: { tono: string; children: React.ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-[9px] py-[3px] font-mono text-xs font-semibold ${TONOS[tono] || 'bg-sunken text-ink-2'}`}>
      {children}
    </span>
  );
}
