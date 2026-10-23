'use client';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CopyField } from '@/components/ui/CopyField';
import { Modal } from '@/components/ui/Modal';
import { vence } from '@/utils/formato';
import { usePanel } from '@/store/hooks/usePanel.hook';
import type { IValidacionCreada } from '@/store/interfaces/validacion.interface';

export function LinkCreado({ validacion, nombre }: { validacion: IValidacionCreada; nombre?: string }) {
  const { panelDialogo, panelAviso } = usePanel();
  const texto = `${nombre ? `Hola ${nombre}, ` : 'Hola, '}para validar tu identidad abre este enlace en tu teléfono y ten tu cédula a mano: ${validacion.url_captura}`;
  return (
    <Modal titulo="Link creado" alCerrar={() => panelDialogo(null)}>
      <p className="text-ink-2">Envíalo al firmante. Vence el {vence(validacion.expira_en)}. Es personal: quien lo tenga puede hacer la validación.</p>
      <CopyField valor={validacion.url_captura} alCopiar={() => panelAviso('Link copiado')} />
      <div className="flex flex-wrap gap-2.5">
        <ButtonLink variante="primary" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(texto)}`}>Enviar por WhatsApp</ButtonLink>
        <ButtonLink href={`mailto:?subject=${encodeURIComponent('Validación de identidad')}&body=${encodeURIComponent(texto)}`}>Enviar por correo</ButtonLink>
        <Button variante="ghost" className="ml-auto" onClick={() => panelDialogo(null)}>Listo</Button>
      </div>
    </Modal>
  );
}
