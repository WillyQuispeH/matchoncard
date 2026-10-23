'use client';
import { usePanel } from '@/store/hooks/usePanel.hook';
import { EnlacesModal } from '../Documentos/EnlacesModal';
import { MotivoModal } from './MotivoModal';
import { LinkCreado } from '../Validaciones/LinkCreado';
import { NuevaValidacion } from '../Validaciones/NuevaValidacion';

// Muestra el diálogo abierto del panel (uno a la vez)
export function Dialogos() {
  const { dialogo, panelDialogo } = usePanel();
  if (!dialogo) return null;
  switch (dialogo.tipo) {
    case 'nuevaValidacion': return <NuevaValidacion />;
    case 'linkCreado': return <LinkCreado validacion={dialogo.validacion} nombre={dialogo.nombre} />;
    case 'enlaces': return <EnlacesModal datos={dialogo.datos} />;
    case 'motivo': return <MotivoModal {...dialogo} alCerrar={() => panelDialogo(null)} />;
  }
}
