import { useShallow } from 'zustand/react/shallow';
import { useClienteStore } from '../zustand/cliente.store';

// mensaje del último error de una acción (para mostrarlo en el diálogo que la pidió)
const errorAccion = () => useClienteStore.getState().estadoAccion.error;

export const useCliente = () => ({
  errorAccion,
  ...useClienteStore(useShallow((s) => ({
    lista: s.lista,
    actual: s.actual,
    estadoLista: s.estadoLista,
    estadoAccion: s.estadoAccion,
    clienteListar: s.clienteListar,
    clienteElegir: s.clienteElegir,
    clienteCrear: s.clienteCrear,
    clienteActualizar: s.clienteActualizar,
    clienteRotar: s.clienteRotar,
    clienteLimpiarAccion: s.clienteLimpiarAccion,
  }))),
});
