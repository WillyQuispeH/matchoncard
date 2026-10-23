'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { InputText } from '@/components/ui/InputText';
import { Modal } from '@/components/ui/Modal';

interface Props {
  titulo: string; texto: string; accion: string; peligro?: boolean;
  alConfirmar: (motivo: string) => Promise<string | null>;   // null = salió bien
  alCerrar: () => void;
}

// Toda acción sensible (descargar evidencia, borrar, cancelar) pide un motivo que queda en la auditoría
export function MotivoModal({ titulo, texto, accion, peligro, alConfirmar, alCerrar }: Props) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    const m = motivo.trim();
    if (m.length < 5) { setError('Escribe un motivo (mínimo 5 caracteres).'); return; }
    setEnviando(true);
    const e = await alConfirmar(m);
    setEnviando(false);
    if (e) setError(e); else alCerrar();
  };
  return (
    <Modal titulo={titulo} alCerrar={alCerrar}>
      <p className="text-ink-2">{texto}</p>
      <InputText etiqueta="Motivo" autoFocus maxLength={300} placeholder="Ej.: solicitud del titular, peritaje caso 123" value={motivo}
        onChange={(e) => setMotivo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void confirmar(); }} />
      <ErrorMessage mensaje={error} reservar />
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button variante="ghost" onClick={alCerrar}>Cancelar</Button>
        <Button variante={peligro ? 'danger' : 'primary'} disabled={enviando} onClick={confirmar}>{accion}</Button>
      </div>
    </Modal>
  );
}
