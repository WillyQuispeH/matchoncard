import { api } from '@/utils/api';
import type { IDocumento, IDocumentoCreado, IDocumentoFila, IEnlaceNuevo, INuevoDocumento } from '../interfaces/documento.interface';

const P = '/documentos';
const id_ = (id: string) => `${P}/${encodeURIComponent(id)}`;

export const documentoService = {
  listar: () => api.get<IDocumentoFila[]>(P),
  detalle: (id: string) => api.get<IDocumento>(id_(id)),
  crear: (datos: INuevoDocumento) => api.post<IDocumentoCreado>(P, datos),
  pdf: (id: string) => api.get<Blob>(`${id_(id)}/pdf`, { responseType: 'blob' }),
  enlace: (id: string, firmanteId: string) => api.post<IEnlaceNuevo>(`${id_(id)}/firmantes/${encodeURIComponent(firmanteId)}/enlace`),
  cancelar: (id: string, motivo: string) => api.post<IDocumento>(`${id_(id)}/cancelar`, { motivo }),
};
