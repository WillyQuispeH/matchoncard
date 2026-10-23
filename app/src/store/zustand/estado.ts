import { mensajeError } from '@/utils/api';
import type { IEstadoCarga } from '../interfaces/response.interface';

export const INICIAL: IEstadoCarga = { onLoading: false, onError: false, error: null };

// Ejecuta una acción del store con el ciclo onLoading → (ok | onError + error).
// Devuelve el resultado, o null si falló (el mensaje queda en el estado indicado por `clave`).
export async function ejecutar<S, T>(
  set: (p: Partial<S>) => void,
  clave: keyof S,
  fn: () => Promise<T>,
): Promise<T | null> {
  set({ [clave]: { onLoading: true, onError: false, error: null } } as Partial<S>);
  try {
    const r = await fn();
    set({ [clave]: INICIAL } as Partial<S>);
    return r;
  } catch (e) {
    set({ [clave]: { onLoading: false, onError: true, error: await mensajeError(e) } } as Partial<S>);
    return null;
  }
}
