export type Rol = 'integracion' | 'auditor' | 'dpo';

// cliente de la API autenticado con JWT (Portalfirma u otros)
export interface ClienteAuth { id: string; nombre: string; roles: Rol[] }
// teléfono del firmante: sesión válida para UNA validación
export interface SesionTelefono { validacionId: string }
// usuario del panel (app-admin)
export type RolAdmin = 'superadmin' | 'operador';
export interface AdminSesion { usuario: string; rol: RolAdmin }
