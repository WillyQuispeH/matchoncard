import { useShallow } from 'zustand/react/shallow';
import { usePanelStore } from '../zustand/panel.store';

export type { Dialogo, Lateral } from '../zustand/panel.store';

export const usePanel = () =>
  usePanelStore(useShallow((s) => ({
    lateral: s.lateral,
    dialogo: s.dialogo,
    editor: s.editor,
    aviso: s.aviso,
    panelLateral: s.panelLateral,
    panelDialogo: s.panelDialogo,
    panelEditor: s.panelEditor,
    panelAviso: s.panelAviso,
  })));
