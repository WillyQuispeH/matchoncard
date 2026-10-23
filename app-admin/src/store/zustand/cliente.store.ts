import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { alPedirCliente } from '@/utils/api';
import { clienteService } from '../services/cliente.service';
import type { ICambioCliente, ICliente, INuevoCliente, ISecretosCliente, SecretoRotable } from '../interfaces/cliente.interface';
import type { IEstadoCarga } from '../interfaces/response.interface';
import { INICIAL, ejecutar } from './estado';

interface ClienteState {
  lista: ICliente[] | null;
  actual: string | null;          // cliente elegido en el selector (validaciones y documentos)
  estadoLista: IEstadoCarga;
  estadoAccion: IEstadoCarga;
  clienteListar: () => Promise<void>;
  clienteElegir: (id: string) => void;
  clienteCrear: (d: INuevoCliente) => Promise<ISecretosCliente | null>;
  clienteActualizar: (id: string, d: ICambioCliente) => Promise<boolean>;
  clienteRotar: (id: string, secreto: SecretoRotable, motivo: string) => Promise<ISecretosCliente | null>;
  clienteLimpiarAccion: () => void;
}

export const useClienteStore = create<ClienteState>()(persist((set, get) => ({
  lista: null,
  actual: null,
  estadoLista: INICIAL,
  estadoAccion: INICIAL,

  clienteListar: async () => {
    const r = await ejecutar<ClienteState, ICliente[]>(set, 'estadoLista', async () => (await clienteService.listar()).data);
    if (!r) return;
    set({ lista: r });
    // si el elegido ya no existe, se toma el primero activo
    if (!r.some((c) => c.id === get().actual)) set({ actual: r.find((c) => c.activo)?.id ?? r[0]?.id ?? null });
  },
  clienteElegir: (actual) => set({ actual }),
  clienteCrear: async (d) => {
    const r = await ejecutar<ClienteState, ISecretosCliente>(set, 'estadoAccion', async () => (await clienteService.crear(d)).data);
    if (r) void get().clienteListar();
    return r;
  },
  clienteActualizar: async (id, d) => {
    const r = await ejecutar<ClienteState, ICliente>(set, 'estadoAccion', async () => (await clienteService.actualizar(id, d)).data);
    if (r) void get().clienteListar();
    return !!r;
  },
  clienteRotar: async (id, secreto, motivo) =>
    ejecutar<ClienteState, ISecretosCliente>(set, 'estadoAccion', async () => (await clienteService.rotar(id, secreto, motivo)).data),
  clienteLimpiarAccion: () => set({ estadoAccion: INICIAL }),
}), {
  name: 'moc-admin.cliente',
  storage: createJSONStorage(() => localStorage),
  partialize: (s) => ({ actual: s.actual }),   // solo se recuerda el cliente elegido
}));

// el cliente HTTP manda el cliente elegido en la cabecera X-Cliente
alPedirCliente(() => useClienteStore.getState().actual);
