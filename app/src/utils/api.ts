import axios, { AxiosError } from 'axios';

// Cliente HTTP único: todos los services lo usan y ninguno crea el suyo.
// baseURL vacía: el navegador llama a su mismo origen y Next reenvía a la API.
export const api = axios.create({ baseURL: '', timeout: 130_000 });

// Mensaje legible a partir del error de la API ({ message: string | string[] })
export async function mensajeError(e: unknown): Promise<string> {
  if (!(e instanceof AxiosError)) return e instanceof Error ? e.message : 'Error inesperado';
  if (!e.response) return 'No hay conexión con el servidor.';
  const m = (e.response.data as { message?: string | string[] } | null)?.message;
  return Array.isArray(m) ? m.join('. ') : m || `Error ${e.response.status}`;
}
