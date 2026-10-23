'use client';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CopyField } from '@/components/ui/CopyField';
import { Modal } from '@/components/ui/Modal';
import { vence } from '@/utils/formato';
import { usePanel } from '@/store/hooks/usePanel.hook';
import type { IEnlacesModal } from '@/store/interfaces/documento.interface';

// Links de los firmantes de un documento (solo se pueden ver al crearlos)
export function EnlacesModal({ datos }: { datos: IEnlacesModal }) {
  const { panelDialogo, panelAviso } = usePanel();
  return (
    <Modal titulo={datos.titulo} ancho="lg" alCerrar={() => panelDialogo(null)}>
      <p className="text-ink-2">{datos.nota} Cada link es personal: quien lo tenga puede hacer la validación.</p>
      {datos.items.map((it, i) => {
        const texto = `Hola ${it.nombre}, para firmar "${datos.documento}" abre este enlace en tu teléfono y ten tu cédula a mano: ${it.url}`;
        return (
          <div key={i} className={`grid gap-2 ${i ? 'border-t border-line pt-3.5' : ''}`}>
            <b>{it.nombre}</b>
            {it.url ? (
              <>
                <CopyField valor={it.url} alCopiar={() => panelAviso('Link copiado')} />
                <div className="flex flex-wrap gap-2.5">
                  <ButtonLink target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(texto)}`}>WhatsApp</ButtonLink>
                  <ButtonLink variante="ghost" href={`mailto:?subject=${encodeURIComponent(`Firma de ${datos.documento}`)}&body=${encodeURIComponent(texto)}`}>Correo</ButtonLink>
                  {it.expira && <span className="self-center text-xs text-ink-3">vence {vence(it.expira, true)}</span>}
                </div>
              </>
            ) : (
              <span className="text-[13px] text-ink-3">Recibirá su link cuando firme el anterior (orden secuencial). Lo verás con “Nuevo link” en el detalle.</span>
            )}
          </div>
        );
      })}
      <div className="flex justify-end"><Button variante="primary" onClick={() => panelDialogo(null)}>Listo</Button></div>
    </Modal>
  );
}
