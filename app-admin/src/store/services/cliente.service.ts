import { api } from '@/utils/api';
import type { ICambioCliente, ICliente, INuevoCliente, ISecretosCliente, SecretoRotable } from '../interfaces/cliente.interface';

const P = '/clientes';
const id_ = (id: string) => `${P}/${encodeURIComponent(id)}`;

export const clienteService = {
  listar: () => api.get<ICliente[]>(P),
  crear: (d: INuevoCliente) => api.post<ISecretosCliente & { nombre: string }>(P, d),
  actualizar: (id: string, d: ICambioCliente) => api.patch<ICliente>(id_(id), d),
  rotar: (id: string, secreto: SecretoRotable, motivo: string) => api.post<ISecretosCliente>(`${id_(id)}/rotar`, { secreto, motivo }),
};
