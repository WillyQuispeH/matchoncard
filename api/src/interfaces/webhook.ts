// Fila reservada de la cola, con el secreto HMAC del cliente (envuelto con la KEK)
export interface WebhookPendiente {
  id: string;                 // bigserial: pg lo entrega como texto
  url: string;
  cuerpo: { evento: string; [k: string]: unknown };
  intentos: number;
  webhook_secreto_cifrado: string;
}

// Lo que recibe api-webhook: el cuerpo ya serializado y firmado (no conoce secretos ni toca la base)
export interface EntregaWebhook { id: string; url: string; evento: string; cuerpo: string; firma: string }
export interface ResultadoEntrega { ok: boolean; error?: string }
