import { useShallow } from 'zustand/react/shallow';
import { useUsuarioStore } from '../zustand/usuario.store';

// mensaje del último error de una acción (para mostrarlo en el diálogo que la pidió)
const errorAccion = () => useUsuarioStore.getState().estadoAccion.error;

export const useUsuario = () => ({
  errorAccion,
  ...useUsuarioStore(useShallow((s) => ({
    lista: s.lista,
    estadoLista: s.estadoLista,
    estadoAccion: s.estadoAccion,
    usuarioListar: s.usuarioListar,
    usuarioCrear: s.usuarioCrear,
    usuarioActualizar: s.usuarioActualizar,
    usuarioClave: s.usuarioClave,
    usuarioDesbloquear: s.usuarioDesbloquear,
    usuarioLimpiarAccion: s.usuarioLimpiarAccion,
  }))),
});
