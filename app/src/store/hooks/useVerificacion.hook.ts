import { useShallow } from 'zustand/react/shallow';
import { useVerificacionStore } from '../zustand/verificacion.store';

export const useVerificacion = () =>
  useVerificacionStore(useShallow((s) => ({
    resultado: s.resultado,
    archivo: s.archivo,
    estado: s.estado,
    verificacionVerificar: s.verificacionVerificar,
  })));
