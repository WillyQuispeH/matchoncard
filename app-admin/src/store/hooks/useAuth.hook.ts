import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../zustand/auth.store';

export const useAuth = () =>
  useAuthStore(useShallow((s) => ({
    admin: s.admin,
    revisada: s.revisada,
    estado: s.estado,
    authYo: s.authYo,
    authLogin: s.authLogin,
    authLogout: s.authLogout,
  })));
