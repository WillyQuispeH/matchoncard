import { api } from '@/utils/api';
import { config } from '@/utils/config';
import type { IVerificacion } from '../interfaces/verificacion.interface';

export const verificacionService = {
  // el PDF va crudo (no se guarda)
  verificar: (pdf: File) => api.post<IVerificacion>(config.rutas.verificar, pdf, { headers: { 'Content-Type': 'application/pdf' } }),
};
