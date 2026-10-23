export const COOKIE = 'v3p_admin';
export const SESION_HORAS = 8;
export const MAX_INTENTOS = 5;
export const BLOQUEO_MIN = 15;
export const TAM_PAGINA = 50;
export const ROLES_ADMIN = ['superadmin', 'operador'] as const;
export const ROLES_CLIENTE = ['integracion', 'auditor', 'dpo'] as const;
export const MIN_CLAVE = 12;
// cliente sobre el que opera app-admin si no se elige otro (cabecera X-Cliente)
export const CLIENTE_POR_DEFECTO = process.env.PANEL_CLIENTE_ID || 'portalfirma';
