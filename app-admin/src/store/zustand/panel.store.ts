import { create } from 'zustand';
import type { IEnlacesModal } from '../interfaces/documento.interface';
import type { IValidacionCreada } from '../interfaces/validacion.interface';

// Estado de la interfaz de app-admin: panel lateral, diálogos, editor de documentos y avisos.
export type Lateral = { tipo: 'validacion' | 'documento'; id: string } | null;
export type Dialogo =
  | { tipo: 'nuevaValidacion' }
  | { tipo: 'linkCreado'; validacion: IValidacionCreada; nombre?: string }
  | { tipo: 'enlaces'; datos: IEnlacesModal }
  | { tipo: 'motivo'; titulo: string; texto: string; accion: string; peligro?: boolean; alConfirmar: (motivo: string) => Promise<string | null> }
  | null;

interface PanelState {
  lateral: Lateral;
  dialogo: Dialogo;
  editor: boolean;
  aviso: string | null;
  panelLateral: (l: Lateral) => void;
  panelDialogo: (d: Dialogo) => void;
  panelEditor: (abierto: boolean) => void;
  panelAviso: (texto: string) => void;
}

let temporizador: ReturnType<typeof setTimeout> | undefined;

export const usePanelStore = create<PanelState>((set) => ({
  lateral: null,
  dialogo: null,
  editor: false,
  aviso: null,
  panelLateral: (lateral) => set({ lateral }),
  panelDialogo: (dialogo) => set({ dialogo }),
  panelEditor: (editor) => set({ editor }),
  panelAviso: (aviso) => {
    set({ aviso });
    clearTimeout(temporizador);
    temporizador = setTimeout(() => set({ aviso: null }), 3200);
  },
}));
