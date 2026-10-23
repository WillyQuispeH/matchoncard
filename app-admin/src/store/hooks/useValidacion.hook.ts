import { useShallow } from 'zustand/react/shallow';
import { useValidacionStore } from '../zustand/validacion.store';

// mensaje del último error de una acción (para mostrarlo dentro de un diálogo justo después de fallar)
const errorAccion = () => useValidacionStore.getState().estadoAccion.error;

export const useValidacion = () => ({
  errorAccion,
  ...useValidacionStore(useShallow((s) => ({
    resumen: s.resumen,
    lista: s.lista,
    filtro: s.filtro,
    detalle: s.detalle,
    operacion: s.operacion,
    estadoLista: s.estadoLista,
    estadoDetalle: s.estadoDetalle,
    estadoOperacion: s.estadoOperacion,
    estadoAccion: s.estadoAccion,
    validacionResumen: s.validacionResumen,
    validacionListar: s.validacionListar,
    validacionFiltrar: s.validacionFiltrar,
    validacionDetalle: s.validacionDetalle,
    validacionCrear: s.validacionCrear,
    validacionInforme: s.validacionInforme,
    validacionEvidencia: s.validacionEvidencia,
    validacionBorrar: s.validacionBorrar,
    validacionLimpiarAccion: s.validacionLimpiarAccion,
    validacionCerrar: s.validacionCerrar,
  }))),
});
