'use client';
import { Button } from '@/components/ui/Button';
import { CopyField } from '@/components/ui/CopyField';
import { Modal } from '@/components/ui/Modal';
import type { ISecretosCliente } from '@/store/interfaces/cliente.interface';

interface Props { titulo: string; secretos: ISecretosCliente; alCopiar: () => void; alCerrar: () => void }

// Los secretos no se guardan en claro: esta es la ÚNICA vez que se pueden ver
export function SecretosCliente({ titulo, secretos, alCopiar, alCerrar }: Props) {
  return (
    <Modal titulo={titulo} ancho="lg" alCerrar={alCerrar}>
      <p className="rounded-xl border border-warn/40 bg-[#362a12]/40 px-3.5 py-3 text-sm text-warn">
        Copia estos secretos ahora y guárdalos en el gestor de secretos del cliente. No se vuelven a mostrar: si se pierden, hay que rotarlos.
      </p>
      <div className="grid gap-1.5 text-sm">
        <span className="text-ink-3">Cabecera <code className="font-mono text-ink">id</code></span>
        <CopyField valor={secretos.id} alCopiar={alCopiar} />
      </div>
      {secretos.secreto_jwt && (
        <div className="grid gap-1.5 text-sm">
          <span className="text-ink-3">Secreto JWT (firma HS256 de los tokens del cliente)</span>
          <CopyField valor={secretos.secreto_jwt} alCopiar={alCopiar} />
        </div>
      )}
      {secretos.secreto_webhook && (
        <div className="grid gap-1.5 text-sm">
          <span className="text-ink-3">Secreto de webhook (verificación HMAC de los avisos)</span>
          <CopyField valor={secretos.secreto_webhook} alCopiar={alCopiar} />
        </div>
      )}
      <div className="flex justify-end"><Button variante="primary" onClick={alCerrar}>Ya los guardé</Button></div>
    </Modal>
  );
}
