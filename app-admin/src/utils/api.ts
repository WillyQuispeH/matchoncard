import axios, { AxiosError } from 'axios';
import { config } from './config';

// Cliente HTTP único: todos los services lo usan y ninguno crea el suyo.
// baseURL = /admin/api en el mismo origen; Next la reenvía a la API. La sesión viaja en una cookie httpOnly.
export const api = axios.create({ baseURL: config.rutaApi, withCredentials: true, timeout: 130_000 });

// Quien se registre informa el cliente elegido en el selector (el store de clientes).
let clienteActual: () => string | null = () => null;
export const alPedirCliente = (fn: () => string | null) => { clienteActual = fn; };

api.interceptors.request.use((req) => {
  req.headers.set('X-Panel', '1');                     // defensa CSRF, además de la cookie SameSite=Strict
  const c = clienteActual();
  if (c) req.headers.set('X-Cliente', c);              // validaciones y documentos son del cliente elegido
  return req;
});

// Sesión vencida: lo avisa quien se registre (el store de sesión).
let alVencer: (() => void) | null = null;
export const alVencerSesion = (fn: () => void) => { alVencer = fn; };

api.interceptors.response.use(undefined, (e: AxiosError) => {
  if (e.response?.status === 401 && !e.config?.url?.endsWith('/login')) alVencer?.();
  return Promise.reject(e);
});

// Mensaje legible a partir del error de la API ({ message: string | string[] }), también cuando la respuesta es un blob.
export async function mensajeError(e: unknown): Promise<string> {
  if (!(e instanceof AxiosError)) return e instanceof Error ? e.message : 'Error inesperado';
  if (!e.response) return 'No hay conexión con el servidor.';
  let d: unknown = e.response.data;
  if (d instanceof Blob) { try { d = JSON.parse(await d.text()); } catch { d = null; } }
  const m = (d as { message?: string | string[] } | null)?.message;
  return Array.isArray(m) ? m.join('. ') : m || `Error ${e.response.status}`;
}
