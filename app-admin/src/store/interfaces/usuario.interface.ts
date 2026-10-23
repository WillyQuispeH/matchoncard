import type { RolAdmin } from './auth.interface';

export interface IUsuario {
  usuario: string;
  rol: RolAdmin;
  activo: boolean;
  intentos_fallidos: number;
  bloqueado_hasta: string | null;
  ultimo_ingreso: string | null;
  creado_en: string;
  sesiones_abiertas: number;
}

export interface INuevoUsuario {
  usuario: string;
  clave: string;
  rol: RolAdmin;
}

export interface ICambioUsuario {
  rol?: RolAdmin;
  activo?: boolean;
}
