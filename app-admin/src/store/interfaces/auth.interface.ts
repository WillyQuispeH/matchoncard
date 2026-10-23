export type RolAdmin = 'superadmin' | 'operador';

export interface IAdmin {
  usuario: string;
  rol: RolAdmin;
}

export interface ILogin {
  usuario: string;
  clave: string;
}
