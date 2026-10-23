import { api } from '@/utils/api';
import type { IFiltroValidaciones, IListaValidaciones, INuevaValidacion, IResumen, IValidacionCreada, IValidacionDetalle } from '../interfaces/validacion.interface';
import type { IOperacion } from '../interfaces/operacion.interface';

const P = '/validaciones';
const id_ = (id: string) => `${P}/${encodeURIComponent(id)}`;

export const validacionService = {
  resumen: () => api.get<IResumen>('/resumen'),
  listar: (f: IFiltroValidaciones) =>
    api.get<IListaValidaciones>(P, { params: { ...(f.estado ? { estado: f.estado } : {}), ...(f.rut ? { rut: f.rut } : {}), pagina: f.pagina } }),
  detalle: (id: string) => api.get<IValidacionDetalle>(id_(id)),
  operacion: (id: string) => api.get<IOperacion>(`${id_(id)}/operacion`),
  crear: (datos: INuevaValidacion) => api.post<IValidacionCreada>(P, datos),
  informe: (id: string) => api.post<Blob>(`${id_(id)}/informe`, undefined, { responseType: 'blob' }),
  evidencia: (id: string, motivo: string) => api.get<Blob>(`${id_(id)}/evidencia`, { params: { motivo }, responseType: 'blob' }),
  borrar: (id: string, motivo: string) => api.delete<{ validacion_id: string; estado: string }>(id_(id), { data: { motivo } }),
};
