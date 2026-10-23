import { api } from '@/utils/api';
import type { ICambioUsuario, INuevoUsuario, IUsuario } from '../interfaces/usuario.interface';

const P = '/usuarios';
const u_ = (u: string) => `${P}/${encodeURIComponent(u)}`;

export const usuarioService = {
  listar: () => api.get<IUsuario[]>(P),
  crear: (d: INuevoUsuario) => api.post<{ usuario: string }>(P, d),
  actualizar: (usuario: string, d: ICambioUsuario) => api.patch<{ ok: boolean }>(u_(usuario), d),
  clave: (usuario: string, clave: string) => api.post<{ ok: boolean }>(`${u_(usuario)}/clave`, { clave }),
  desbloquear: (usuario: string) => api.post<{ ok: boolean }>(`${u_(usuario)}/desbloquear`),
};
