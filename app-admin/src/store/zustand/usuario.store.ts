import { create } from 'zustand';
import { usuarioService } from '../services/usuario.service';
import type { ICambioUsuario, INuevoUsuario, IUsuario } from '../interfaces/usuario.interface';
import type { IEstadoCarga } from '../interfaces/response.interface';
import { INICIAL, ejecutar } from './estado';

interface UsuarioState {
  lista: IUsuario[] | null;
  estadoLista: IEstadoCarga;
  estadoAccion: IEstadoCarga;
  usuarioListar: () => Promise<void>;
  usuarioCrear: (d: INuevoUsuario) => Promise<boolean>;
  usuarioActualizar: (usuario: string, d: ICambioUsuario) => Promise<boolean>;
  usuarioClave: (usuario: string, clave: string) => Promise<boolean>;
  usuarioDesbloquear: (usuario: string) => Promise<boolean>;
  usuarioLimpiarAccion: () => void;
}

export const useUsuarioStore = create<UsuarioState>((set, get) => {
  // toda acción que cambia algo vuelve a cargar la lista
  const accion = async (fn: () => Promise<unknown>, recargar = true) => {
    const r = await ejecutar<UsuarioState, unknown>(set, 'estadoAccion', async () => { await fn(); return true; });
    if (r && recargar) void get().usuarioListar();
    return !!r;
  };
  return {
    lista: null,
    estadoLista: INICIAL,
    estadoAccion: INICIAL,
    usuarioListar: async () => {
      const r = await ejecutar<UsuarioState, IUsuario[]>(set, 'estadoLista', async () => (await usuarioService.listar()).data);
      if (r) set({ lista: r });
    },
    usuarioCrear: (d) => accion(() => usuarioService.crear(d)),
    usuarioActualizar: (u, d) => accion(() => usuarioService.actualizar(u, d)),
    usuarioClave: (u, clave) => accion(() => usuarioService.clave(u, clave)),
    usuarioDesbloquear: (u) => accion(() => usuarioService.desbloquear(u)),
    usuarioLimpiarAccion: () => set({ estadoAccion: INICIAL }),
  };
});
