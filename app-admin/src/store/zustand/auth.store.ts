import { create } from 'zustand';
import { alVencerSesion } from '@/utils/api';
import { authService } from '../services/auth.service';
import type { IAdmin, ILogin } from '../interfaces/auth.interface';
import type { IEstadoCarga } from '../interfaces/response.interface';
import { INICIAL, ejecutar } from './estado';

// Sesión del panel: cookie httpOnly que pone la API (el navegador nunca ve el token).
interface AuthState {
  admin: IAdmin | null;
  revisada: boolean;          // ya se preguntó a la API si hay sesión
  estado: IEstadoCarga;
  authYo: () => Promise<void>;
  authLogin: (d: ILogin) => Promise<boolean>;
  authLogout: () => Promise<void>;
  authExpirar: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  revisada: false,
  estado: INICIAL,
  authYo: async () => {
    try { const r = await authService.yo(); set({ admin: r.data, revisada: true }); } catch { set({ admin: null, revisada: true }); }
  },
  authLogin: async (d) => {
    const r = await ejecutar<AuthState, IAdmin>(set, 'estado', async () => (await authService.login(d)).data);
    if (r) set({ admin: r });
    return !!r;
  },
  authLogout: async () => {
    try { await authService.logout(); } catch { /* la sesión igual se cierra en pantalla */ }
    set({ admin: null });
  },
  authExpirar: () => set({ admin: null, revisada: true }),
}));

// el cliente HTTP avisa cuando la API responde 401 en el panel
alVencerSesion(() => useAuthStore.getState().authExpirar());
