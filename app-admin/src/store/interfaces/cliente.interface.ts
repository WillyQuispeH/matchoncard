export type RolCliente = 'integracion' | 'auditor' | 'dpo';

export interface ICliente {
  id: string;
  nombre: string;
  roles: RolCliente[];
  activo: boolean;
  creado_en: string;
  validaciones_30d: number;
  documentos_30d: number;
  webhooks_fallidos: number;
}

export interface INuevoCliente {
  id: string;
  nombre: string;
  roles: RolCliente[];
}

export interface ICambioCliente {
  nombre?: string;
  roles?: RolCliente[];
  activo?: boolean;
}

// secretos que se muestran UNA sola vez (al crear o rotar)
export interface ISecretosCliente {
  id: string;
  secreto_jwt?: string;
  secreto_webhook?: string;
}

export type SecretoRotable = 'jwt' | 'webhook' | 'ambos';
