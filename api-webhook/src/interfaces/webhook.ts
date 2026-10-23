// Lo que envía la API: el cuerpo ya serializado y la firma HMAC ya calculada
export interface Entrega { id: string; url: string; evento: string; cuerpo: string; firma: string }
export interface ResultadoEntrega { ok: boolean; error?: string }
