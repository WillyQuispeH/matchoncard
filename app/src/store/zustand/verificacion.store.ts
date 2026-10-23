import { create } from 'zustand';
import { config } from '@/utils/config';
import { verificacionService } from '../services/verificacion.service';
import type { IVerificacion } from '../interfaces/verificacion.interface';
import type { IEstadoCarga } from '../interfaces/response.interface';
import { INICIAL, ejecutar } from './estado';

interface VerificacionState {
  resultado: IVerificacion | null;
  archivo: string | null;
  estado: IEstadoCarga;
  verificacionVerificar: (f: File) => Promise<void>;
}

export const useVerificacionStore = create<VerificacionState>((set) => ({
  resultado: null,
  archivo: null,
  estado: INICIAL,
  verificacionVerificar: async (f) => {
    set({ resultado: null, archivo: f.name });
    if (f.size > config.maxPdfBytes) {
      set({ estado: { onLoading: false, onError: true, error: 'El máximo es 25 MB.' } });
      return;
    }
    const r = await ejecutar<VerificacionState, IVerificacion>(set, 'estado', async () => (await verificacionService.verificar(f)).data);
    if (r) set({ resultado: r });
  },
}));
