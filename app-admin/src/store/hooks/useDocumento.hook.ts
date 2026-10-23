import { useShallow } from 'zustand/react/shallow';
import { useDocumentoStore } from '../zustand/documento.store';

const errorAccion = () => useDocumentoStore.getState().estadoAccion.error;

export const useDocumento = () => ({
  errorAccion,
  ...useDocumentoStore(useShallow((s) => ({
    lista: s.lista,
    detalle: s.detalle,
    estadoLista: s.estadoLista,
    estadoDetalle: s.estadoDetalle,
    estadoAccion: s.estadoAccion,
    documentoListar: s.documentoListar,
    documentoDetalle: s.documentoDetalle,
    documentoCrear: s.documentoCrear,
    documentoPdf: s.documentoPdf,
    documentoEnlace: s.documentoEnlace,
    documentoCancelar: s.documentoCancelar,
    documentoLimpiarAccion: s.documentoLimpiarAccion,
    documentoCerrar: s.documentoCerrar,
  }))),
});
