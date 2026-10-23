// Error estándar de la API (NestJS)
export interface IApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// Estado común de cada acción de un store
export interface IEstadoCarga {
  onLoading: boolean;
  onError: boolean;
  error: string | null;
}
