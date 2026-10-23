import { api } from '@/utils/api';
import type { IAdmin, ILogin } from '../interfaces/auth.interface';

export const authService = {
  login: (datos: ILogin) => api.post<IAdmin>('/login', datos),
  logout: () => api.post<{ ok: boolean }>('/logout'),
  yo: () => api.get<IAdmin>('/yo'),
};
