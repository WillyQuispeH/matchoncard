import { useShallow } from 'zustand/react/shallow';
import { useAuditoriaStore } from '../zustand/auditoria.store';

export const useAuditoria = () =>
  useAuditoriaStore(useShallow((s) => ({
    lista: s.lista,
    filtro: s.filtro,
    acciones: s.acciones,
    sistema: s.sistema,
    estadoLista: s.estadoLista,
    estadoSistema: s.estadoSistema,
    auditoriaListar: s.auditoriaListar,
    auditoriaFiltrar: s.auditoriaFiltrar,
    auditoriaLimpiar: s.auditoriaLimpiar,
    auditoriaAcciones: s.auditoriaAcciones,
    auditoriaEstado: s.auditoriaEstado,
  })));
